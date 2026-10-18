package io.github.haramrit09k.spaceterra

import android.app.AlertDialog
import android.os.Bundle
import android.text.InputFilter
import android.view.Gravity
import android.view.View
import android.view.ViewGroup.LayoutParams.MATCH_PARENT
import android.view.ViewGroup.LayoutParams.WRAP_CONTENT
import android.widget.EditText
import android.widget.FrameLayout
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import io.github.haramrit09k.spaceterra.ads.AdsManager
import io.github.haramrit09k.spaceterra.games.PlayGames
import io.github.haramrit09k.spaceterra.net.LeaderboardClient
import kotlin.random.Random

class MainActivity : ComponentActivity(), Host {
    private lateinit var game: Game
    private lateinit var gameView: GameView
    private lateinit var audio: Audio
    private lateinit var leaderboard: LeaderboardClient
    private lateinit var ads: AdsManager
    private lateinit var playGames: PlayGames

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        WindowCompat.setDecorFitsSystemWindows(window, false)

        val prefs = Prefs(this)
        audio = Audio(this, prefs)
        leaderboard = LeaderboardClient(BuildConfig.SERVER_URL)

        val root = FrameLayout(this)
        val bannerContainer = FrameLayout(this).apply { visibility = View.GONE }
        ads = AdsManager(this, bannerContainer) { showing -> audio.setSuspended(showing) }

        playGames = PlayGames(this)
        game = Game(Assets(this), audio, prefs, leaderboard, ads, playGames, this, resources.displayMetrics.density)
        gameView = GameView(this, game)
        root.addView(gameView, FrameLayout.LayoutParams(MATCH_PARENT, MATCH_PARENT))
        root.addView(bannerContainer, FrameLayout.LayoutParams(MATCH_PARENT, WRAP_CONTENT, Gravity.BOTTOM or Gravity.CENTER_HORIZONTAL))
        setContentView(root)

        ViewCompat.setOnApplyWindowInsetsListener(root) { _, insets ->
            val cutout = insets.getInsets(WindowInsetsCompat.Type.displayCutout())
            game.safeTopPx = cutout.top
            bannerContainer.setPadding(0, 0, 0, cutout.bottom)
            insets
        }

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() = game.back()
        })

        hideSystemBars()
        leaderboard.connect()
        ads.start()
        // A Play Games name becomes the pilot name unless the player picked one.
        playGames.checkSignIn { name -> game.post { if (prefs.playerName == null) prefs.playerName = name } }
    }

    override fun onResume() {
        super.onResume()
        hideSystemBars()
        audio.onResume()
        gameView.onResume()
    }

    override fun onPause() {
        game.appPaused()
        gameView.onPause()
        audio.onPause()
        super.onPause()
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) hideSystemBars()
    }

    override fun onDestroy() {
        ads.destroy()
        leaderboard.disconnect()
        audio.release()
        super.onDestroy()
    }

    override fun askPlayerName(current: String?, onDone: (String) -> Unit) = runOnUiThread {
        val suggestion = current ?: "Pilot${Random.nextInt(1000, 10000)}"
        val input = EditText(this).apply {
            setText(suggestion)
            setSelectAllOnFocus(true)
            isSingleLine = true
            filters = arrayOf(InputFilter.LengthFilter(MAX_NAME_LENGTH))
        }
        val container = FrameLayout(this).apply {
            val pad = (20 * resources.displayMetrics.density).toInt()
            setPadding(pad, 0, pad, 0)
            addView(input)
        }
        val dialog = AlertDialog.Builder(this)
            .setTitle(R.string.pilot_name_title)
            .setMessage(R.string.pilot_name_message)
            .setView(container)
            .setPositiveButton(R.string.pilot_name_save) { _, _ -> onDone(cleanName(input.text.toString(), suggestion)) }
            .setOnCancelListener { onDone(current ?: suggestion) }
            .create()
        dialog.setOnDismissListener { hideSystemBars() }
        dialog.show()
    }

    override fun quit() = runOnUiThread { finish() }

    private fun hideSystemBars() {
        WindowInsetsControllerCompat(window, window.decorView).apply {
            hide(WindowInsetsCompat.Type.systemBars())
            systemBarsBehavior = WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
        }
    }

    private companion object {
        const val MAX_NAME_LENGTH = 16

        fun cleanName(raw: String, fallback: String): String {
            val name = raw.replace(Regex("[\\p{Cntrl}]"), "").trim().take(MAX_NAME_LENGTH)
            return name.ifEmpty { fallback }
        }
    }
}
