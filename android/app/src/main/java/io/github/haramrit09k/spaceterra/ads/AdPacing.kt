package io.github.haramrit09k.spaceterra.ads

/**
 * Decides when an interstitial may interrupt the player. The rules are
 * deliberately gentle, because annoyed players uninstall:
 * - never during the first [minGames] runs of a session,
 * - at most one every [minGames] finished runs and [minIntervalMs],
 * - and the clock restarts whenever the player chose to watch a rewarded ad.
 */
class AdPacing(
    private val minGames: Int = 4,
    private val minIntervalMs: Long = 180_000,
    private val clock: () -> Long = System::currentTimeMillis,
) {
    private var gamesSinceAd = 0
    private var lastAdAt: Long = clock()

    fun recordGameOver() {
        gamesSinceAd++
    }

    fun interstitialDue(): Boolean =
        gamesSinceAd >= minGames && clock() - lastAdAt >= minIntervalMs

    fun recordInterstitialShown() {
        gamesSinceAd = 0
        lastAdAt = clock()
    }

    /** A rewarded ad the player opted into counts as their ad break. */
    fun recordRewardedShown() {
        lastAdAt = clock()
    }
}
