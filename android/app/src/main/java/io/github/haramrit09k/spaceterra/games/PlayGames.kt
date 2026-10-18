package io.github.haramrit09k.spaceterra.games

import android.app.Activity
import android.content.Context
import android.util.Log
import com.google.android.gms.games.PlayGames
import com.google.android.gms.games.PlayGamesSdk
import io.github.haramrit09k.spaceterra.R

/**
 * Google Play Games Services v2: automatic sign-in, a high-score leaderboard and
 * achievements. Everything is a no-op until the IDs from Play Console are filled
 * in android/play-games.properties (see android/README.md).
 */
class PlayGames(private val activity: Activity) {
    enum class Achievement(val resId: Int) {
        FIRST_FLIGHT(R.string.pgs_achievement_first_flight),
        SCORE_100(R.string.pgs_achievement_score_100),
        SCORE_250(R.string.pgs_achievement_score_250),
        SCORE_500(R.string.pgs_achievement_score_500),
        SCORE_1000(R.string.pgs_achievement_score_1000),
        SHIELD_SAVE(R.string.pgs_achievement_shield_save),
        COINS_1000(R.string.pgs_achievement_coins_1000),
        FULLY_UPGRADED(R.string.pgs_achievement_fully_upgraded),
    }

    val enabled = isConfigured(activity)

    @Volatile var signedIn = false
        private set

    @Volatile var playerName: String? = null
        private set

    private val leaderboardId = activity.getString(R.string.pgs_leaderboard_high_score)

    /** Play Games v2 signs players in automatically; this just reads the result. */
    fun checkSignIn(onPlayer: (String) -> Unit = {}) {
        if (!enabled) return
        PlayGames.getGamesSignInClient(activity).isAuthenticated.addOnCompleteListener { task ->
            signedIn = task.isSuccessful && task.result.isAuthenticated
            if (signedIn) loadPlayer(onPlayer)
        }
    }

    fun signIn(onPlayer: (String) -> Unit = {}) {
        if (!enabled) return
        PlayGames.getGamesSignInClient(activity).signIn().addOnCompleteListener { task ->
            signedIn = task.isSuccessful && task.result.isAuthenticated
            if (signedIn) loadPlayer(onPlayer)
        }
    }

    fun submitScore(score: Int) {
        if (!signedIn || leaderboardId.isEmpty() || score <= 0) return
        PlayGames.getLeaderboardsClient(activity).submitScore(leaderboardId, score.toLong())
    }

    fun unlock(achievement: Achievement) {
        val id = activity.getString(achievement.resId)
        if (!signedIn || id.isEmpty()) return
        PlayGames.getAchievementsClient(activity).unlock(id)
    }

    fun showLeaderboard() = activity.runOnUiThread {
        if (!ensureSignedIn() || leaderboardId.isEmpty()) return@runOnUiThread
        PlayGames.getLeaderboardsClient(activity).getLeaderboardIntent(leaderboardId)
            .addOnSuccessListener { activity.startActivityForResult(it, REQUEST_UI) }
            .addOnFailureListener { Log.w(TAG, "Leaderboard UI failed", it) }
    }

    fun showAchievements() = activity.runOnUiThread {
        if (!ensureSignedIn()) return@runOnUiThread
        PlayGames.getAchievementsClient(activity).achievementsIntent
            .addOnSuccessListener { activity.startActivityForResult(it, REQUEST_UI) }
            .addOnFailureListener { Log.w(TAG, "Achievements UI failed", it) }
    }

    private fun ensureSignedIn(): Boolean {
        if (!enabled) return false
        if (!signedIn) signIn()
        return signedIn
    }

    private fun loadPlayer(onPlayer: (String) -> Unit) {
        PlayGames.getPlayersClient(activity).currentPlayer.addOnSuccessListener { player ->
            playerName = player.displayName
            onPlayer(player.displayName)
        }
    }

    companion object {
        private const val TAG = "SpaceTerraGames"
        private const val REQUEST_UI = 9001

        fun isConfigured(context: Context) = context.getString(R.string.game_services_project_id).isNotEmpty()

        /** Call once from Application.onCreate. */
        fun initialize(context: Context) {
            if (isConfigured(context)) PlayGamesSdk.initialize(context)
        }
    }
}
