package io.github.haramrit09k.spaceterra

import android.content.Context

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

    private companion object {
        const val KEY_NAME = "player_name"
        const val KEY_BEST = "best_score"
        const val KEY_MUTED = "muted"
    }
}
