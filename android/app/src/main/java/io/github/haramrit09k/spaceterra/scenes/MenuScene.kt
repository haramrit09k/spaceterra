package io.github.haramrit09k.spaceterra.scenes

import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.RectF
import io.github.haramrit09k.spaceterra.Game
import io.github.haramrit09k.spaceterra.ui.Button
import io.github.haramrit09k.spaceterra.ui.bitmap
import io.github.haramrit09k.spaceterra.ui.cover
import io.github.haramrit09k.spaceterra.ui.ellipsize
import io.github.haramrit09k.spaceterra.ui.text

/** Landing page (landing.js). Google sign-in is replaced by a local pilot name. */
class MenuScene(game: Game) : Scene(game) {
    private var logoTop = 0f

    override fun layout() {
        addMuteButton()

        val logo = game.assets.logo
        val logoW = 640f
        val logoH = logoW * logo.height / logo.width
        val blockH = logoH + 60f + 3 * BUTTON_H + 2 * BUTTON_GAP
        val usable = game.height - game.bannerReserve
        logoTop = maxOf(game.safeTop + 120f, (usable - blockH) / 2)

        var y = logoTop + logoH + 60f
        val x = (game.width - BUTTON_W) / 2
        buttons += Button.image(rect(x, y, BUTTON_W, BUTTON_H), game.assets.startButton, ::start)
        y += BUTTON_H + BUTTON_GAP
        buttons += Button.image(rect(x, y, BUTTON_W, BUTTON_H), game.assets.instructionsButton) {
            game.go(InstructionsScene(game))
        }
        y += BUTTON_H + BUTTON_GAP
        buttons += Button.image(rect(x, y, BUTTON_W, BUTTON_H), game.assets.leaderboardButton) {
            game.go(LeaderboardScene(game))
        }

        buttons += Button.link(RectF(game.width - 430f, game.safeTop, game.width - 30f, game.safeTop + 80f), {
            val name = game.prefs.playerName ?: "Set pilot name"
            "✎ " + ellipsize(name, 330f, 32f)
        }, 32f) { renamePilot {} }

        val privacy = Button.link(rect(250f, usable - 90f, 400f, 60f), { "Privacy settings" }, 26f) {
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
        const val BUTTON_W = 330f
        const val BUTTON_H = 110f
        const val BUTTON_GAP = 30f
    }
}
