package io.github.haramrit09k.spaceterra.ads

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class AdPacingTest {
    private var now = 0L
    private val pacing = AdPacing(clock = { now })

    private fun play(runs: Int) = repeat(runs) { pacing.recordGameOver() }

    @Test
    fun noInterstitialDuringTheFirstRuns() {
        now = 10 * 60_000
        play(3)
        assertFalse(pacing.interstitialDue())
        play(1)
        assertTrue(pacing.interstitialDue())
    }

    @Test
    fun noInterstitialWithinThreeMinutesOfLaunch() {
        play(10)
        now = 179_000
        assertFalse(pacing.interstitialDue())
        now = 180_000
        assertTrue(pacing.interstitialDue())
    }

    @Test
    fun showingOneResetsBothLimits() {
        now = 10 * 60_000
        play(4)
        pacing.recordInterstitialShown()
        play(4)
        assertFalse(pacing.interstitialDue())
        now += 180_000
        assertTrue(pacing.interstitialDue())
    }

    @Test
    fun rewardedAdCountsAsTheBreak() {
        now = 10 * 60_000
        play(6)
        pacing.recordRewardedShown()
        assertFalse(pacing.interstitialDue())
    }
}
