package io.github.haramrit09k.spaceterra.game

import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.sin

/**
 * Shapes coins are laid out in. Offsets are relative to the shape's bottom
 * anchor; negative y is further ahead. Mirrored in public/javascripts/world.js.
 */
enum class CoinPattern(val weight: Int, val offsets: List<Pair<Float, Float>>) {
    LINE(2, List(5) { i -> 0f to -70f * i }),

    /** Follows the rocket's own swing: time the thrust to collect it all. */
    WAVE(1, List(9) { i -> (110 * sin(i * PI / 4)).toFloat() to -60f * i }),

    ZIGZAG(1, listOf(0, 1, 2, 1, 0, 1, 2, 1, 0).mapIndexed { i, step -> 75f * step to -60f * i }),

    DIAMOND(1, listOf(0f to 0f, 55f to -60f, 110f to -120f, 55f to -180f, 0f to -240f, -55f to -180f, -110f to -120f, -55f to -60f)),

    RING(1, List(10) { i ->
        val a = i * 2 * PI / 10
        (100 * cos(a)).toFloat() to (-100 - 100 * sin(a)).toFloat()
    }),

    /** A rainbow arc, open towards the rocket. */
    ARC(1, List(7) { i ->
        val a = PI - i * PI / 6
        (140 * cos(a)).toFloat() to (-140 * sin(a)).toFloat()
    }),

    /** An arrowhead pointing the way forward. */
    CHEVRON(1, List(7) { i -> -120f + 40f * i to -40f * (3 - kotlin.math.abs(i - 3)) });

    val minX = offsets.minOf { it.first }
    val maxX = offsets.maxOf { it.first }

    companion object {
        private val totalWeight = entries.sumOf { it.weight }

        /** Picks a shape for a roll in [0, 1), weighted so straight lines stay the most common. */
        fun pick(roll: Float): CoinPattern {
            var r = roll * totalWeight
            for (p in entries) {
                r -= p.weight
                if (r < 0) return p
            }
            return entries.last()
        }
    }
}
