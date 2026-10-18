package io.github.haramrit09k.spaceterra.scenes

import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import io.github.haramrit09k.spaceterra.Game
import io.github.haramrit09k.spaceterra.ui.Button
import io.github.haramrit09k.spaceterra.ui.cover
import io.github.haramrit09k.spaceterra.ui.text

/** Game-over page (gameover.js): submits the score and shows the global top 7. */
class GameOverScene(game: Game, private val score: Int, private val newBest: Boolean) : Scene(game) {
    private var top = 0f
    private var leaving = false

    override fun enter() {
        super.enter()
        val name = game.prefs.playerName
        if (name != null && score > 0) game.leaderboard.submit(name, score) else game.leaderboard.fetch()
    }

    override fun layout() {
        addMuteButton()
        val usable = game.height - game.bannerReserve
        top = maxOf(game.safeTop + 110f, (usable - CONTENT_H) / 2)
        val buttonsY = top + CONTENT_H - 150f
        buttons += Button.image(rect(290f, buttonsY, 100f, 100f), game.assets.home) { leave { MenuScene(game) } }
        buttons += Button.image(rect(510f, buttonsY, 100f, 100f), game.assets.retry) { leave { PlayScene(game) } }
    }

    override fun draw(canvas: Canvas) {
        canvas.cover(game.assets.menuBackground, game.width, game.height)
        canvas.text("YOUR SCORE : $score", game.width / 2, top + 60f, 64f, align = Paint.Align.CENTER)
        val subtitle = if (newBest) "New personal best!" else "Best: ${game.prefs.bestScore}"
        canvas.text(subtitle, game.width / 2, top + 115f, 36f, Color.WHITE, Paint.Align.CENTER)
        LeaderboardTable.draw(canvas, top + 160f, game.leaderboard, game.prefs.playerName)
        drawButtons(canvas)
        val labelY = top + CONTENT_H - 15f
        canvas.text("Main Menu", 340f, labelY, 32f, align = Paint.Align.CENTER)
        canvas.text("Retry", 560f, labelY, 32f, align = Paint.Align.CENTER)
    }

    override fun onBack(): Boolean {
        leave { MenuScene(game) }
        return true
    }

    /** Leaving the results screen is the natural break where an interstitial may appear. */
    private fun leave(next: () -> Scene) {
        if (leaving) return
        leaving = true
        val ads = game.ads
        if (ads == null) {
            game.go(next())
        } else {
            ads.maybeShowInterstitial { game.post { game.go(next()) } }
        }
    }

    private companion object {
        val CONTENT_H = 160f + LeaderboardTable.HEIGHT + 230f
    }
}
