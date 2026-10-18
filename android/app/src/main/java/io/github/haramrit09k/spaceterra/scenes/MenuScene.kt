package io.github.haramrit09k.spaceterra.scenes

import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.RectF
import io.github.haramrit09k.spaceterra.Game
import io.github.haramrit09k.spaceterra.ui.Button
import io.github.haramrit09k.spaceterra.ui.Icons
import io.github.haramrit09k.spaceterra.ui.bitmap
import io.github.haramrit09k.spaceterra.ui.cover
import io.github.haramrit09k.spaceterra.ui.ellipsize
import io.github.haramrit09k.spaceterra.ui.text
import io.github.haramrit09k.spaceterra.ui.textPaint

/** Landing page (landing.js). Google sign-in is replaced by a local pilot name. */
class MenuScene(game: Game) : Scene(game) {
    private var logoTop = 0f

    override fun layout() {
        addMuteButton()

        val logo = game.assets.logo
        val logoW = 640f
        val logoH = logoW * logo.height / logo.width
        val blockH = logoH + 60f + 4 * BUTTON_H + 3 * BUTTON_GAP
        val usable = game.height - game.bannerReserve
        logoTop = maxOf(game.safeTop + 120f, (usable - blockH) / 2)

        var y = logoTop + logoH + 60f
        val x = (game.width - BUTTON_W) / 2
        val menu = listOf<Pair<String, () -> Unit>>(
            "START" to ::start,
            "HANGAR" to { game.go(HangarScene(game)) },
            "INSTRUCTIONS" to { game.go(InstructionsScene(game)) },
            "LEADERBOARD" to { game.go(LeaderboardScene(game)) },
        )
        for ((label, action) in menu) {
            buttons += Button.pill(rect(x, y, BUTTON_W, BUTTON_H), { label }, 44f, action)
            y += BUTTON_H + BUTTON_GAP
        }

        buttons += Button.link(RectF(game.width - 430f, game.safeTop, game.width - 30f, game.safeTop + 80f), {
            val name = game.prefs.playerName ?: "Set pilot name"
            "✎ " + ellipsize(name, 330f, 32f)
        }, 32f) { renamePilot {} }

        game.playGames?.takeIf { it.enabled }?.let { pg ->
            buttons += Button.link(rect(40f, usable - 90f, 300f, 60f), {
                if (pg.signedIn) "Achievements" else "Sign in to Play Games"
            }, 26f) {
                if (pg.signedIn) pg.showAchievements() else pg.signIn { name ->
                    game.post { if (game.prefs.playerName == null) game.prefs.playerName = name }
                }
            }
        }

        val privacy = Button.link(rect(game.width - 340f, usable - 90f, 300f, 60f), { "Privacy settings" }, 26f) {
            game.ads?.showPrivacyOptions()
        }
        privacy.visible = game.ads?.privacyOptionsRequired == true
        buttons += privacy
    }

    override fun update() {
        buttons.last().visible = game.ads?.privacyOptionsRequired == true
    }

    override fun draw(canvas: Canvas) {
        canvas.cover(game.assets.menuBackground, game.width, game.height)
        val logo = game.assets.logo
        val logoW = 640f
        val logoH = logoW * logo.height / logo.width
        canvas.bitmap(logo, null, rect((game.width - logoW) / 2, logoTop, logoW, logoH))

        val best = game.prefs.bestScore
        if (best > 0) {
            canvas.text("Your best: $best", game.width - 40f, game.safeTop + 115f, 30f, align = Paint.Align.RIGHT)
        }
        val coins = "${game.prefs.coins}"
        textPaint.textSize = 30f
        val coinsW = textPaint.measureText(coins)
        canvas.text(coins, game.width - 40f, game.safeTop + 160f, 30f, align = Paint.Align.RIGHT)
        Icons.coin(canvas, game.width - 80f - coinsW, game.safeTop + 130f, 34f, game.tick)
        drawButtons(canvas)
    }

    override fun onBack() = false

    private fun start() {
        if (game.prefs.playerName == null) {
            renamePilot { game.go(PlayScene(game)) }
        } else {
            game.go(PlayScene(game))
        }
    }

    private fun renamePilot(then: () -> Unit) {
        game.host.askPlayerName(game.prefs.playerName) { name ->
            game.post {
                game.prefs.playerName = name
                then()
            }
        }
    }

    private companion object {
        const val BUTTON_W = 400f
        const val BUTTON_H = 110f
        const val BUTTON_GAP = 30f
    }
}
