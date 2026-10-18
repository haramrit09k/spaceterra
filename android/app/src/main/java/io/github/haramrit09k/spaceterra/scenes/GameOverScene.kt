package io.github.haramrit09k.spaceterra.scenes

import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.RectF
import io.github.haramrit09k.spaceterra.Game
import io.github.haramrit09k.spaceterra.ui.Button
import io.github.haramrit09k.spaceterra.ui.Icons
import io.github.haramrit09k.spaceterra.ui.cover
import io.github.haramrit09k.spaceterra.ui.text
import io.github.haramrit09k.spaceterra.ui.textPaint

/**
 * Game-over page (gameover.js): submits the score, shows the global top 7, and
 * offers an opt-in rewarded ad that doubles the coins from this run.
 */
class GameOverScene(
    game: Game,
    private val score: Int,
    private var coinsEarned: Int,
    private val newBest: Boolean,
) : Scene(game) {
    private var top = 0f
    private var leaving = false
    private var doubled = false
    private var waitingForAd = false
    private lateinit var doubleButton: Button

    override fun enter() {
        super.enter()
        val name = game.prefs.playerName
        if (name != null && score > 0) game.leaderboard.submit(name, score) else game.leaderboard.fetch()
    }

    override fun layout() {
        addMuteButton()
        val usable = game.height - game.bannerReserve
        top = maxOf(game.safeTop + 110f, (usable - CONTENT_H) / 2)
        doubleButton = Button.pill(RectF(200f, top + 200f, 700f, top + 290f), { "▶  Double coins" }, 34f, ::doubleCoins)
        buttons += doubleButton
        val buttonsY = top + CONTENT_H - 150f
        buttons += Button.image(rect(290f, buttonsY, 100f, 100f), game.assets.home) { leave { MenuScene(game) } }
        buttons += Button.image(rect(510f, buttonsY, 100f, 100f), game.assets.retry) { leave { PlayScene(game) } }
        syncButtons()
    }

    override fun update() = syncButtons()

    override fun draw(canvas: Canvas) {
        canvas.cover(game.assets.menuBackground, game.width, game.height)
        canvas.text("YOUR SCORE : $score", game.width / 2, top + 60f, 64f, align = Paint.Align.CENTER)
        val subtitle = if (newBest) "New personal best!" else "Best: ${game.prefs.bestScore}"
        canvas.text(subtitle, game.width / 2, top + 115f, 36f, Color.WHITE, Paint.Align.CENTER)

        val coinsLine = "+$coinsEarned" + if (doubled) "  (doubled!)" else ""
        drawCoinsLine(canvas, coinsLine, top + 180f)

        LeaderboardTable.draw(canvas, top + TABLE_TOP, game.leaderboard, game.prefs.playerName)
        drawButtons(canvas)
        val labelY = top + CONTENT_H - 15f
        canvas.text("Main Menu", 340f, labelY, 32f, align = Paint.Align.CENTER)
        canvas.text("Retry", 560f, labelY, 32f, align = Paint.Align.CENTER)
    }

    override fun onBack(): Boolean {
        leave { MenuScene(game) }
        return true
    }

    private fun drawCoinsLine(canvas: Canvas, line: String, baseline: Float) {
        textPaint.textSize = 44f
        val w = textPaint.measureText(line) + 54f
        val x = (game.width - w) / 2
        Icons.coin(canvas, x, baseline - 40f, 44f, game.tick)
        canvas.text(line, x + 54f, baseline, 44f)
    }

    private fun syncButtons() {
        doubleButton.visible = !doubled && !waitingForAd && coinsEarned > 0 && game.ads?.rewardedReady == true
    }

    private fun doubleCoins() {
        val ads = game.ads ?: return
        waitingForAd = true
        ads.showRewarded { earned ->
            game.post {
                waitingForAd = false
                if (earned && !doubled) {
                    doubled = true
                    game.prefs.coins += coinsEarned
                    game.prefs.lifetimeCoins += coinsEarned
                    coinsEarned *= 2
                }
            }
        }
    }

    /** Leaving the results screen is the natural break where an interstitial may appear. */
    private fun leave(next: () -> Scene) {
        if (leaving || waitingForAd) return
        leaving = true
        val ads = game.ads
        if (ads == null) {
            game.go(next())
        } else {
            ads.maybeShowInterstitial { game.post { game.go(next()) } }
        }
    }

    private companion object {
        const val TABLE_TOP = 330f
        val CONTENT_H = TABLE_TOP + LeaderboardTable.HEIGHT + 230f
    }
}
