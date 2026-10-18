package io.github.haramrit09k.spaceterra.scenes

import android.graphics.Canvas
import android.graphics.Paint
import io.github.haramrit09k.spaceterra.Game
import io.github.haramrit09k.spaceterra.ui.Button
import io.github.haramrit09k.spaceterra.ui.cover
import io.github.haramrit09k.spaceterra.ui.text

/** Global top 7 (leaderboard.js). */
class LeaderboardScene(game: Game) : Scene(game) {
    private var top = 0f

    override fun enter() {
        super.enter()
        game.leaderboard.fetch()
    }

    override fun layout() {
        addMuteButton()
        val usable = game.height - game.bannerReserve
        top = maxOf(game.safeTop + 110f, (usable - CONTENT_H) / 2)
        buttons += Button.image(rect(400f, top + CONTENT_H - 150f, 100f, 100f), game.assets.home) { game.go(MenuScene(game)) }
    }

    override fun draw(canvas: Canvas) {
        canvas.cover(game.assets.menuBackground, game.width, game.height)
        canvas.text("LEADERBOARD", game.width / 2, top + 70f, 80f, align = Paint.Align.CENTER)
        LeaderboardTable.draw(canvas, top + 140f, game.leaderboard, game.prefs.playerName)
        drawButtons(canvas)
        canvas.text("Main Menu", game.width / 2, top + CONTENT_H - 15f, 32f, align = Paint.Align.CENTER)
    }

    private companion object {
        val CONTENT_H = 140f + LeaderboardTable.HEIGHT + 220f
    }
}
