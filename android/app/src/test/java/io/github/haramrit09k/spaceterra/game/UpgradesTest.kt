package io.github.haramrit09k.spaceterra.game

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class UpgradesTest {
    @Test
    fun durationsGrowTwoSecondsPerLevel() {
        assertEquals(6 * 60, Upgrades.durationTicks(0))
        assertEquals(16 * 60, Upgrades.durationTicks(Upgrades.MAX_LEVEL))
        assertEquals(16 * 60, Upgrades.durationTicks(99))
    }

    @Test
    fun costsDoubleAndStopAtMax() {
        assertEquals(listOf(100, 200, 400, 800, 1600), (0 until Upgrades.MAX_LEVEL).map { Upgrades.cost(it) })
        assertNull(Upgrades.cost(Upgrades.MAX_LEVEL))
    }

    @Test
    fun reviveGetsPricierWithinARun() {
        assertEquals(listOf(100, 200, 400), (0..2).map(Upgrades::reviveCost))
    }
}
