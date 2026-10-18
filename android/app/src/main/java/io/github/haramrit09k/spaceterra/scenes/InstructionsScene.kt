package io.github.haramrit09k.spaceterra.scenes

import android.graphics.Canvas
import android.graphics.Paint
import io.github.haramrit09k.spaceterra.Game
import io.github.haramrit09k.spaceterra.game.GameWorld
import io.github.haramrit09k.spaceterra.ui.Button
import io.github.haramrit09k.spaceterra.ui.bitmap
import io.github.haramrit09k.spaceterra.ui.cover
import io.github.haramrit09k.spaceterra.ui.paragraph
import io.github.haramrit09k.spaceterra.ui.text

/** Instructions page (instructions.js), rewritten for touch controls. */
class InstructionsScene(game: Game) : Scene(game) {
    private var top = 0f

    override fun layout() {
        addMuteButton()
        val usable = game.height - game.bannerReserve
        top = maxOf(game.safeTop + 120f, (usable - CONTENT_H) / 2)
        buttons += Button.image(rect(400f, top + CONTENT_H - 150f, 100f, 100f), game.assets.home) { game.go(MenuScene(game)) }
    }

    override fun draw(canvas: Canvas) {
        val a = game.assets
        val t = game.tick
        canvas.cover(a.menuBackground, game.width, game.height, dim = 90)
        canvas.text("HOW TO PLAY", game.width / 2, top + 60f, 72f, align = Paint.Align.CENTER)

        var y = top + 150f
        val iconX = 70f
        val textX = 230f
        val textW = game.width - textX - 50f

        canvas.bitmap(a.rocket.bitmap, a.rocket.src(3), rect(iconX + 30f, y, 80f, 120f))
        val y1 = canvas.paragraph("Your rocket swings from side to side on its own. Steer through the gaps.", textX, y + 40f, textW, 36f)
        y = maxOf(y + 150f, y1 + 10f)

        val fingerFrame = ((t / 60) % 2).toInt()
        canvas.bitmap(a.fingerTap.bitmap, a.fingerTap.src(fingerFrame), rect(iconX + 15f, y, 110f, 140f))
        val y2 = canvas.paragraph("Touch and hold anywhere to fly forward. Let go and you stop.", textX, y + 40f, textW, 36f)
        y = maxOf(y + 160f, y2 + 10f)

        canvas.bitmap(a.rocks.bitmap, a.rocks.src(2), rect(iconX + 20f, y, 100f, 97f))
        val y3 = canvas.paragraph("Dodge the asteroids…", textX, y + 40f, textW, 36f)
        y = maxOf(y + 120f, y3 + 10f)

        canvas.bitmap(a.alien.bitmap, a.alien.src(((t / 6) % 3).toInt()), rect(iconX + 15f, y, 110f, 109f))
        val y4 = canvas.paragraph("…and beware of the aliens!", textX, y + 40f, textW, 36f)
        y = maxOf(y + 130f, y4 + 10f)

        canvas.bitmap(a.explosion.bitmap, a.explosion.src(((t / 6) % 9).toInt()), rect(iconX + 20f, y, 100f, 100f))
        val idleSeconds = GameWorld.IDLE_LIMIT_TICKS / 60
        canvas.paragraph("Stay still for $idleSeconds seconds and the rocket explodes.", textX, y + 40f, textW, 36f)

        drawButtons(canvas)
        canvas.text("Main Menu", game.width / 2, top + CONTENT_H - 15f, 32f, align = Paint.Align.CENTER)
    }

    private companion object {
        const val CONTENT_H = 960f
    }
}
