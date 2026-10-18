package io.github.haramrit09k.spaceterra.game

import io.github.haramrit09k.spaceterra.game.GameWorld.PowerUp

/** Hangar upgrades: each level makes a power-up last longer. */
object Upgrades {
    const val MAX_LEVEL = 5

    fun durationTicks(level: Int) = (6 + 2 * level.coerceIn(0, MAX_LEVEL)) * 60

    /** Coins needed to go from [level] to the next one, or null when maxed. */
    fun cost(level: Int): Int? = if (level >= MAX_LEVEL) null else 100 shl level

    /** Coin price to continue a crashed run, doubling with each use in the same run. */
    fun reviveCost(revivesSoFar: Int) = 100 shl revivesSoFar.coerceAtMost(4)

    fun title(powerUp: PowerUp) = when (powerUp) {
        PowerUp.SHIELD -> "Shield"
        PowerUp.MAGNET -> "Coin Magnet"
        PowerUp.DOUBLE_COINS -> "2x Coins"
    }

    fun description(powerUp: PowerUp) = when (powerUp) {
        PowerUp.SHIELD -> "Absorbs one hit"
        PowerUp.MAGNET -> "Pulls nearby coins in"
        PowerUp.DOUBLE_COINS -> "Every coin counts twice"
    }
}
