package io.github.haramrit09k.spaceterra.ads

/**
 * Decides when an interstitial may interrupt the player. Keeping ads rare is
 * what keeps people playing (and AdMob policy forbids surprise or excessive
 * interstitials): at most one every [minGames] finished runs and [minIntervalMs].
 */
class AdPacing(
    private val minGames: Int = 3,
    private val minIntervalMs: Long = 90_000,
    private val clock: () -> Long = System::currentTimeMillis,
) {
    private var gamesSinceAd = 0
    private var lastShownAt: Long? = null

    fun recordGameOver() {
        gamesSinceAd++
    }

    fun interstitialDue(): Boolean {
        if (gamesSinceAd < minGames) return false
        val last = lastShownAt ?: return true
        return clock() - last >= minIntervalMs
    }

    fun recordInterstitialShown() {
        gamesSinceAd = 0
        lastShownAt = clock()
    }
}
