package io.github.haramrit09k.spaceterra

import android.content.Context
import io.github.haramrit09k.spaceterra.game.GameWorld.PowerUp

class Prefs(context: Context) {
    private val sp = context.getSharedPreferences("spaceterra", Context.MODE_PRIVATE)

    var playerName: String?
        get() = sp.getString(KEY_NAME, null)
        set(value) = sp.edit().putString(KEY_NAME, value).apply()

    var bestScore: Int
        get() = sp.getInt(KEY_BEST, 0)
        set(value) = sp.edit().putInt(KEY_BEST, value).apply()

    var muted: Boolean
        get() = sp.getBoolean(KEY_MUTED, false)
        set(value) = sp.edit().putBoolean(KEY_MUTED, value).apply()

    /** Spendable coin balance. */
    var coins: Int
        get() = sp.getInt(KEY_COINS, 0)
        set(value) = sp.edit().putInt(KEY_COINS, value.coerceAtLeast(0)).apply()

    /** Every coin ever collected, for achievements. */
    var lifetimeCoins: Int
        get() = sp.getInt(KEY_LIFETIME_COINS, 0)
        set(value) = sp.edit().putInt(KEY_LIFETIME_COINS, value).apply()

    var runsPlayed: Int
        get() = sp.getInt(KEY_RUNS, 0)
        set(value) = sp.edit().putInt(KEY_RUNS, value).apply()

    fun upgradeLevel(powerUp: PowerUp) = sp.getInt(KEY_UPGRADE + powerUp.name, 0)

    fun setUpgradeLevel(powerUp: PowerUp, level: Int) = sp.edit().putInt(KEY_UPGRADE + powerUp.name, level).apply()

    private companion object {
        const val KEY_NAME = "player_name"
        const val KEY_BEST = "best_score"
        const val KEY_MUTED = "muted"
        const val KEY_COINS = "coins"
        const val KEY_LIFETIME_COINS = "lifetime_coins"
        const val KEY_RUNS = "runs_played"
        const val KEY_UPGRADE = "upgrade_"
    }
}
