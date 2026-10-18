package io.github.haramrit09k.spaceterra.scenes

import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.RectF
import io.github.haramrit09k.spaceterra.Game
import io.github.haramrit09k.spaceterra.game.GameWorld.PowerUp
import io.github.haramrit09k.spaceterra.game.Upgrades
import io.github.haramrit09k.spaceterra.games.PlayGames.Achievement
import io.github.haramrit09k.spaceterra.ui.Button
import io.github.haramrit09k.spaceterra.ui.Icons
import io.github.haramrit09k.spaceterra.ui.YELLOW
import io.github.haramrit09k.spaceterra.ui.cover
import io.github.haramrit09k.spaceterra.ui.panel
import io.github.haramrit09k.spaceterra.ui.paragraph
import io.github.haramrit09k.spaceterra.ui.text

/** Spend coins to make power-ups last longer. Capped, so it never needs new content. */
class HangarScene(game: Game) : Scene(game) {
    private var top = 0f

    override fun layout() {
        addMuteButton()
        val usable = game.height - game.bannerReserve
        top = maxOf(game.safeTop + 110f, (usable - CONTENT_H) / 2)
        PowerUp.entries.forEachIndexed { i, kind ->
            val rowTop = rowTop(i)
            buttons += Button.pill(RectF(560f, rowTop + 85f, 820f, rowTop + 165f), { buyLabel(kind) }, 30f) { buy(kind) }
        }
        buttons += Button.image(rect(400f, top + CONTENT_H - 150f, 100f, 100f), game.assets.home) { game.go(MenuScene(game)) }
    }

    override fun draw(canvas: Canvas) {
        canvas.cover(game.assets.menuBackground, game.width, game.height, dim = 60)
        canvas.text("HANGAR", game.width / 2, top + 70f, 80f, align = Paint.Align.CENTER)
        Icons.coin(canvas, game.width / 2 - 90f, top + 105f, 48f, game.tick)
        canvas.text("${game.prefs.coins}", game.width / 2 - 30f, top + 145f, 48f)

        PowerUp.entries.forEachIndexed { i, kind ->
            val rowTop = rowTop(i)
            val level = game.prefs.upgradeLevel(kind)
            canvas.panel(RectF(50f, rowTop, 850f, rowTop + ROW_H - 20f), 0xB0101A55.toInt(), 0x88FFFFFF.toInt(), 2f)
            Icons.powerUp(canvas, kind, 80f, rowTop + 40f, 110f, game.tick)
            canvas.text(Upgrades.title(kind), 220f, rowTop + 65f, 44f)
            canvas.paragraph(Upgrades.description(kind), 220f, rowTop + 108f, 320f, 28f, Color.WHITE)
            canvas.text("${Upgrades.durationTicks(level) / 60} seconds", 220f, rowTop + 188f, 26f, 0xFFB0C4FF.toInt(), bold = false)
            for (pip in 0 until Upgrades.MAX_LEVEL) {
                val filled = pip < level
                canvas.panel(RectF(560f + pip * 52f, rowTop + 45f, 600f + pip * 52f, rowTop + 65f), if (filled) YELLOW else 0x44FFFFFF, radius = 6f)
            }
        }
        drawButtons(canvas)
        canvas.text("Main Menu", game.width / 2, top + CONTENT_H - 15f, 32f, align = Paint.Align.CENTER)
    }

    private fun rowTop(i: Int) = top + 200f + i * ROW_H

    private fun buyLabel(kind: PowerUp): String {
        val cost = Upgrades.cost(game.prefs.upgradeLevel(kind)) ?: return "MAX"
        return "Upgrade $cost"
    }

    private fun buy(kind: PowerUp) {
        val prefs = game.prefs
        val level = prefs.upgradeLevel(kind)
        val cost = Upgrades.cost(level) ?: return
        if (prefs.coins < cost) return
        prefs.coins -= cost
        prefs.setUpgradeLevel(kind, level + 1)
        if (PowerUp.entries.all { prefs.upgradeLevel(it) >= Upgrades.MAX_LEVEL }) {
            game.playGames?.unlock(Achievement.FULLY_UPGRADED)
        }
    }

    private companion object {
        const val ROW_H = 230f
        val CONTENT_H = 200f + 3 * ROW_H + 200f
    }
}
