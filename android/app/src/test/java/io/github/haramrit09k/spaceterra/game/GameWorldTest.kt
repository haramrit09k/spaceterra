package io.github.haramrit09k.spaceterra.game

import io.github.haramrit09k.spaceterra.game.GameWorld.Event
import io.github.haramrit09k.spaceterra.game.GameWorld.Pickup
import io.github.haramrit09k.spaceterra.game.GameWorld.PowerUp
import io.github.haramrit09k.spaceterra.game.GameWorld.Rock
import io.github.haramrit09k.spaceterra.game.GameWorld.State
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import kotlin.math.sin
import kotlin.random.Random

class GameWorldTest {
    private fun world(seed: Int = 1) = GameWorld(900f, 1800f, rng = Random(seed)).apply {
        // Start with an empty sky so tests control what the rocket meets.
        rocks.clear()
        aliens.clear()
        pickups.clear()
    }

    /** Places a rock exactly on the rocket. */
    private fun GameWorld.rockOnRocket() = rocks.add(Rock(rocketX, rocketY - rocksOffsetY, 0, 1f))

    @Test
    fun rocketFollowsTheWebGameSineWave() {
        val w = world()
        assertEquals(420f + (390 * sin(1 / 50.0)).toInt(), w.rocketX)
        w.tick(holding = false)
        assertEquals(420f + (390 * sin(3 / (50.0 - 0.0007 * 0))).toInt().toFloat(), w.rocketX, 1f)
    }

    @Test
    fun idleRocketExplodesAfterFiveSeconds() {
        val w = world()
        repeat(GameWorld.IDLE_LIMIT_TICKS - 1) { w.tick(false) }
        assertEquals(State.RUNNING, w.state)
        w.tick(false)
        assertEquals(State.CRASHING, w.state)
        repeat(GameWorld.CRASH_DURATION_TICKS) { w.tick(false) }
        assertEquals(State.CRASHED, w.state)
    }

    @Test
    fun thrustingScoresDistance() {
        val w = world()
        repeat(100) { w.tick(true) }
        assertEquals(10, w.score)
        assertTrue(w.thrusting)
    }

    @Test
    fun hittingARockCrashes() {
        val w = world()
        w.rockOnRocket()
        w.tick(true)
        assertEquals(State.CRASHING, w.state)
        assertTrue(Event.Crashed in w.events)
    }

    @Test
    fun shieldAbsorbsOneHit() {
        val w = world()
        w.activePowerUps[PowerUp.SHIELD] = 100
        w.rockOnRocket()
        w.tick(true)
        assertEquals(State.RUNNING, w.state)
        assertFalse(w.isActive(PowerUp.SHIELD))
        assertEquals(1, w.stats.shieldSaves)
        assertTrue(w.invulnerableTicks > 0)
    }

    @Test
    fun coinsAreCollectedAndDoubled() {
        val w = world()
        w.pickups += Pickup(w.rocketX, w.rocketY - w.rocksOffsetY, null)
        w.tick(false)
        assertEquals(1, w.stats.coins)

        w.activePowerUps[PowerUp.DOUBLE_COINS] = 100
        w.pickups += Pickup(w.rocketX, w.rocketY - w.rocksOffsetY, null)
        w.tick(false)
        assertEquals(3, w.stats.coins)
    }

    @Test
    fun powerUpPickupStartsItsTimer() {
        val w = GameWorld(900f, 1800f, { 42 }, Random(3)).apply { rocks.clear(); aliens.clear(); pickups.clear() }
        w.pickups += Pickup(w.rocketX, w.rocketY - w.rocksOffsetY, PowerUp.MAGNET)
        w.tick(false)
        assertTrue(w.isActive(PowerUp.MAGNET))
        assertEquals(1, w.stats.powerUps)
        repeat(42) { w.tick(false) }
        assertFalse(w.isActive(PowerUp.MAGNET))
    }

    @Test
    fun reviveClearsNearbyHazardsAndKeepsScore() {
        val w = world()
        repeat(50) { w.tick(true) }
        val score = w.score
        w.rockOnRocket()
        repeat(1 + GameWorld.CRASH_DURATION_TICKS + 1) { w.tick(true) }
        assertEquals(State.CRASHED, w.state)
        assertTrue(w.revive())
        assertEquals(State.RUNNING, w.state)
        assertEquals(score, w.score)
        assertTrue(w.rocks.none { it.y + w.rocksOffsetY + it.size > w.rocketY - 700f })
        assertEquals(1, w.revives)
        assertFalse("can only revive a crashed run", w.revive())
    }

    @Test
    fun speedRampsUpAndCaps() {
        val w = world()
        assertEquals(1f, w.speed, 0.0001f)
        // Keep a shield up so the long run never ends.
        repeat(20_000) {
            w.activePowerUps[PowerUp.SHIELD] = 10
            w.tick(true)
        }
        assertEquals(GameWorld.MAX_SPEED, w.speed, 0.0001f)
        assertEquals(State.RUNNING, w.state)
    }

    @Test
    fun longRunsKeepSpawningButPruneWhatPassed() {
        val w = GameWorld(900f, 1800f, rng = Random(7))
        repeat(10_000) {
            w.activePowerUps[PowerUp.SHIELD] = 10
            w.tick(true)
        }
        assertTrue("rocks ahead", w.rocks.any { it.y + w.rocksOffsetY < 0 })
        assertTrue("old rocks pruned", w.rocks.all { it.y + w.rocksOffsetY < w.height + 200f })
        assertTrue("bounded lookahead", w.rocks.size < 60)
        assertTrue("aliens keep coming", w.aliens.isNotEmpty())
        assertTrue("coins keep coming", w.pickups.isNotEmpty())
    }
}
