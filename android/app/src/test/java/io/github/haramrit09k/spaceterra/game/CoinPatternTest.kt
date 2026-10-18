package io.github.haramrit09k.spaceterra.game

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import kotlin.random.Random

class CoinPatternTest {
    private fun emptyWorld(seed: Int) = GameWorld(900f, 1800f, rng = Random(seed)).apply {
        rocks.clear()
        aliens.clear()
        pickups.clear()
    }

    @Test
    fun everyShapeFitsOnScreenWhereverItIsPlaced() {
        for (pattern in CoinPattern.entries) {
            for (seed in 1..50) {
                val w = emptyWorld(seed)
                w.addCoinPattern(pattern, -500f)
                assertEquals(pattern.name, pattern.offsets.size, w.pickups.size)
                for (p in w.pickups) {
                    assertTrue(pattern.name, p.x >= GameWorld.COIN_MARGIN - 0.01f)
                    assertTrue(pattern.name, p.x + GameWorld.COIN_SIZE <= w.width - GameWorld.COIN_MARGIN + 0.01f)
                    assertTrue(pattern.name, p.y <= -500f)
                }
            }
        }
    }

    @Test
    fun shapesKeepTheirLayout() {
        val w = emptyWorld(1)
        w.addCoinPattern(CoinPattern.ZIGZAG, 0f, 300f)
        assertEquals(listOf(300f to 0f, 375f to -60f, 450f to -120f, 375f to -180f), w.pickups.take(4).map { it.x to it.y })
    }

    @Test
    fun rocksStillBlockCoins() {
        val w = emptyWorld(1)
        w.rocks += GameWorld.Rock(300f, -100f, 0, 1f)
        w.addCoinPattern(CoinPattern.LINE, 0f, 300f)
        assertTrue(w.pickups.size < 5)
    }

    @Test
    fun linesStayMostCommonAndEveryShapeShowsUp() {
        val counts = (0 until 1000).groupingBy { CoinPattern.pick(it / 1000f) }.eachCount()
        assertEquals(CoinPattern.entries.toSet(), counts.keys)
        assertTrue(counts.getValue(CoinPattern.LINE) > counts.getValue(CoinPattern.WAVE) * 1.8)
    }

    /** Prints every offset so it can be diffed against the web version's COIN_PATTERNS. */
    @Test
    fun dumpOffsets() {
        val dump = System.getenv("COIN_PATTERN_DUMP") ?: return
        java.io.File(dump).writeText(CoinPattern.entries.joinToString("\n") { p ->
            p.name + " " + p.offsets.joinToString(" ") { "%.3f,%.3f".format(it.first, it.second) }
        })
    }
}
