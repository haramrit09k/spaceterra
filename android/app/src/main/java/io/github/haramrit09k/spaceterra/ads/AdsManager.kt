package io.github.haramrit09k.spaceterra.ads

import android.app.Activity
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.view.View
import android.widget.FrameLayout
import com.google.android.gms.ads.AdListener
import com.google.android.gms.ads.AdRequest
import com.google.android.gms.ads.AdSize
import com.google.android.gms.ads.AdView
import com.google.android.gms.ads.FullScreenContentCallback
import com.google.android.gms.ads.LoadAdError
import com.google.android.gms.ads.MobileAds
import com.google.android.gms.ads.interstitial.InterstitialAd
import com.google.android.gms.ads.interstitial.InterstitialAdLoadCallback
import com.google.android.gms.ads.rewarded.RewardedAd
import com.google.android.gms.ads.rewarded.RewardedAdLoadCallback
import com.google.android.ump.ConsentInformation
import com.google.android.ump.ConsentRequestParameters
import com.google.android.ump.UserMessagingPlatform
import io.github.haramrit09k.spaceterra.BuildConfig
import java.util.concurrent.atomic.AtomicBoolean

/**
 * AdMob integration: a banner on menu screens, an occasional interstitial
 * between runs, and an opt-in rewarded ad that lets the player continue a run.
 *
 * Consent (GDPR / US state privacy laws) is collected through Google's User
 * Messaging Platform before any ad is requested.
 *
 * All public methods may be called from any thread; callbacks run on the main thread.
 */
class AdsManager(
    private val activity: Activity,
    private val bannerContainer: FrameLayout,
    private val onFullScreenAd: (showing: Boolean) -> Unit,
) {
    private val main = Handler(Looper.getMainLooper())
    private val consent: ConsentInformation = UserMessagingPlatform.getConsentInformation(activity)
    private val sdkStarted = AtomicBoolean(false)
    val pacing = AdPacing()

    private var banner: AdView? = null
    private var bannerWanted = false
    private var interstitial: InterstitialAd? = null
    private var rewarded: RewardedAd? = null

    @Volatile var rewardedReady = false
        private set

    @Volatile var privacyOptionsRequired = false
        private set

    fun start() {
        val params = ConsentRequestParameters.Builder().build()
        consent.requestConsentInfoUpdate(
            activity,
            params,
            {
                UserMessagingPlatform.loadAndShowConsentFormIfRequired(activity) { error ->
                    if (error != null) Log.w(TAG, "Consent form: ${error.message}")
                    privacyOptionsRequired = consent.privacyOptionsRequirementStatus ==
                        ConsentInformation.PrivacyOptionsRequirementStatus.REQUIRED
                    startSdkIfAllowed()
                }
            },
            { error ->
                Log.w(TAG, "Consent info update failed: ${error.message}")
                startSdkIfAllowed()
            },
        )
        // Consent given in an earlier session lets ads load without waiting.
        startSdkIfAllowed()
    }

    fun showPrivacyOptions() = main.post {
        UserMessagingPlatform.showPrivacyOptionsForm(activity) { startSdkIfAllowed() }
    }

    fun setBannerVisible(visible: Boolean) = main.post {
        bannerWanted = visible
        bannerContainer.visibility = if (visible && banner != null) View.VISIBLE else View.GONE
    }

    /** Shows an interstitial if one is loaded and [AdPacing] allows it, then calls [onDone]. */
    fun maybeShowInterstitial(onDone: () -> Unit) = main.post {
        val ad = interstitial
        if (ad == null || !pacing.interstitialDue()) {
            onDone()
            return@post
        }
        interstitial = null
        ad.fullScreenContentCallback = fullScreenCallback(
            onClosed = {
                loadInterstitial()
                onDone()
            },
        )
        pacing.recordInterstitialShown()
        ad.show(activity)
    }

    /** Shows the rewarded ad; [onFinished] receives whether the reward was earned. */
    fun showRewarded(onFinished: (earned: Boolean) -> Unit) = main.post {
        val ad = rewarded
        if (ad == null) {
            onFinished(false)
            return@post
        }
        rewarded = null
        rewardedReady = false
        var earned = false
        ad.fullScreenContentCallback = fullScreenCallback(
            onClosed = {
                loadRewarded()
                onFinished(earned)
            },
        )
        ad.show(activity) { earned = true }
    }

    fun destroy() = main.post {
        banner?.destroy()
        banner = null
    }

    private fun startSdkIfAllowed() {
        if (!consent.canRequestAds() || !sdkStarted.compareAndSet(false, true)) return
        Thread {
            MobileAds.initialize(activity) {
                main.post {
                    loadBanner()
                    loadInterstitial()
                    loadRewarded()
                }
            }
        }.start()
    }

    private fun loadBanner() {
        val metrics = activity.resources.displayMetrics
        val widthDp = (metrics.widthPixels / metrics.density).toInt()
        val view = AdView(activity).apply {
            adUnitId = BuildConfig.BANNER_AD_UNIT
            setAdSize(AdSize.getCurrentOrientationAnchoredAdaptiveBannerAdSize(activity, widthDp))
            adListener = object : AdListener() {
                override fun onAdFailedToLoad(error: LoadAdError) {
                    Log.w(TAG, "Banner failed: ${error.message}")
                }
            }
        }
        bannerContainer.removeAllViews()
        bannerContainer.addView(view)
        banner = view
        setBannerVisible(bannerWanted)
        view.loadAd(AdRequest.Builder().build())
    }

    private fun loadInterstitial() {
        InterstitialAd.load(
            activity,
            BuildConfig.INTERSTITIAL_AD_UNIT,
            AdRequest.Builder().build(),
            object : InterstitialAdLoadCallback() {
                override fun onAdLoaded(ad: InterstitialAd) {
                    interstitial = ad
                }

                override fun onAdFailedToLoad(error: LoadAdError) {
                    Log.w(TAG, "Interstitial failed: ${error.message}")
                    main.postDelayed(::loadInterstitial, RETRY_DELAY_MS)
                }
            },
        )
    }

    private fun loadRewarded() {
        RewardedAd.load(
            activity,
            BuildConfig.REWARDED_AD_UNIT,
            AdRequest.Builder().build(),
            object : RewardedAdLoadCallback() {
                override fun onAdLoaded(ad: RewardedAd) {
                    rewarded = ad
                    rewardedReady = true
                }

                override fun onAdFailedToLoad(error: LoadAdError) {
                    Log.w(TAG, "Rewarded failed: ${error.message}")
                    main.postDelayed(::loadRewarded, RETRY_DELAY_MS)
                }
            },
        )
    }

    private fun fullScreenCallback(onClosed: () -> Unit) = object : FullScreenContentCallback() {
        override fun onAdShowedFullScreenContent() = onFullScreenAd(true)

        override fun onAdDismissedFullScreenContent() {
            onFullScreenAd(false)
            onClosed()
        }

        override fun onAdFailedToShowFullScreenContent(error: com.google.android.gms.ads.AdError) {
            Log.w(TAG, "Full-screen ad failed to show: ${error.message}")
            onFullScreenAd(false)
            onClosed()
        }
    }

    private companion object {
        const val TAG = "SpaceTerraAds"
        const val RETRY_DELAY_MS = 60_000L
    }
}
