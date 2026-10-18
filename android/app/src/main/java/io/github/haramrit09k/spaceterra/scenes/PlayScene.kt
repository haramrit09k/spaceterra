package io.github.haramrit09k.spaceterra.scenes

import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.RectF
import io.github.haramrit09k.spaceterra.Game
import io.github.haramrit09k.spaceterra.game.GameWorld
import io.github.haramrit09k.spaceterra.game.GameWorld.State
import io.github.haramrit09k.spaceterra.ui.Button
import io.github.haramrit09k.spaceterra.ui.YELLOW
import io.github.haramrit09k.spaceterra.ui.bitmap
import io.github.haramrit09k.spaceterra.ui.bitmapPaint
import io.github.haramrit09k.spaceterra.ui.panel
import io.github.haramrit09k.spaceterra.ui.text
import kotlin.random.Random

/** The main game (gameplay.js), plus a one-time "watch an ad to continue" offer after a crash. */
class PlayScene(game: Game) : Scene(game) {
    private enum class Phase { PLAYING, PAUSED, OFFER_REVIVE, WAITING_FOR_AD }

    private val world = GameWorld(game.width, game.height)
    private val holding = HashSet<Int>()
    private var phase = Phase.PLAYING
    private var offerTicks = 0
    private var finished = false

    private val pauseButton = Button.image(RectF(), game.assets.pause) { togglePause() }
    private val reviveButton = Button.pill(RectF(), { "▶  Watch ad to continue" }, 36f) { acceptRevive() }
    private val declineButton = Button.link(RectF(), { "No thanks" }, 32f) { finishRun() }

    override val showsBanner = false

    override fun layout() {
        addMuteButton()
        pauseButton.bounds.set(game.width - 120f, game.safeTop, game.width - 40f, game.safeTop + 80f)
        reviveButton.bounds.set(170f, game.height / 2 + 20f, 730f, game.height / 2 + 130f)
        declineButton.bounds.set(300f, game.height / 2 + 170f, 600f, game.height / 2 + 240f)
        buttons += pauseButton
        buttons += reviveButton
        buttons += declineButton
        syncButtons()
    }

    override fun update() {
        when (phase) {
            Phase.PAUSED, Phase.WAITING_FOR_AD -> return
            Phase.OFFER_REVIVE -> {
                if (++offerTicks >= REVIVE_OFFER_TICKS) finishRun()
                return
            }
            Phase.PLAYING -> Unit
        }

        val before = world.state
        world.tick(holding.isNotEmpty())
        if (before == State.RUNNING && world.state == State.CRASHING) game.audio.playExplosion()

        if (world.state == State.CRASHED) {
            if (!world.revived && game.ads?.rewardedReady == true) {
                phase = Phase.OFFER_REVIVE
                offerTicks = 0
                holding.clear()
                syncButtons()
            } else {
                finishRun()
            }
        }
    }

    override fun draw(canvas: Canvas) {
        val a = game.assets
        canvas.save()
        if (world.state == State.CRASHING && world.crashTicks < SHAKE_TICKS) {
            canvas.translate(Random.nextFloat() * 24f - 12f, Random.nextFloat() * 24f - 12f)
        }

        drawSky(canvas)

        for (rock in world.rocks) {
            val y = rock.y + world.rocksOffsetY
            if (y > game.height || y + rock.size < 0) continue
            canvas.drawBitmap(a.rocks.bitmap, a.rocks.src(rock.frame), RectF(rock.x, y, rock.x + rock.size, y + rock.size * 70f / 72f), bitmapPaint)
        }

        val alienFrame = ((game.tick / 6) % 3).toInt()
        val alienX = world.alienX()
        for (alien in world.aliens) {
            val y = alien.y + world.aliensOffsetY
            if (y > game.height || y + GameWorld.ALIEN_SIZE < 0) continue
            canvas.drawBitmap(a.alien.bitmap, a.alien.src(alienFrame), RectF(alienX, y, alienX + GameWorld.ALIEN_SIZE, y + GameWorld.ALIEN_SIZE), bitmapPaint)
        }

        if (world.state == State.RUNNING) {
            val frame = if (world.thrusting) 3 else 0
            canvas.drawBitmap(a.rocket.bitmap, a.rocket.src(frame), rect(world.rocketX, world.rocketY, GameWorld.ROCKET_W, GameWorld.ROCKET_H), bitmapPaint)
        } else if (world.state == State.CRASHING) {
            val size = GameWorld.EXPLOSION_SIZE
            canvas.drawBitmap(a.explosion.bitmap, a.explosion.src(world.crashTicks / 6), rect(world.rocketX, world.rocketY, size, size), bitmapPaint)
        }
        canvas.restore()

        canvas.text("SCORE: ${world.score}", 150f, game.safeTop + 58f, 52f)

        when (phase) {
            Phase.PAUSED -> overlay(canvas, "PAUSED", "Tap anywhere to resume")
            Phase.OFFER_REVIVE, Phase.WAITING_FOR_AD -> drawReviveOffer(canvas)
            Phase.PLAYING -> Unit
        }
        drawButtons(canvas)
    }

    override fun onPointerDown(pointerId: Int, x: Float, y: Float) {
        when (phase) {
            Phase.PAUSED -> togglePause()
            Phase.PLAYING -> holding += pointerId
            else -> Unit
        }
    }

    override fun onPointerUp(pointerId: Int) {
        holding -= pointerId
    }

    override fun onBack(): Boolean {
        when (phase) {
            Phase.OFFER_REVIVE -> finishRun()
            Phase.WAITING_FOR_AD -> Unit
            Phase.PLAYING, Phase.PAUSED -> togglePause()
        }
        return true
    }

    override fun onAppPaused() {
        if (phase == Phase.PLAYING && world.state == State.RUNNING) togglePause()
        holding.clear()
    }

    private fun togglePause() {
        phase = when (phase) {
            Phase.PLAYING -> Phase.PAUSED
            Phase.PAUSED -> Phase.PLAYING
            else -> phase
        }
        holding.clear()
        syncButtons()
    }

    private fun acceptRevive() {
        val ads = game.ads ?: return finishRun()
        phase = Phase.WAITING_FOR_AD
        syncButtons()
        ads.showRewarded { earned ->
            game.post {
                if (earned && world.revive()) {
                    // Start paused so the player can get ready.
                    phase = Phase.PAUSED
                    syncButtons()
                } else {
                    finishRun()
                }
            }
        }
    }

    private fun finishRun() {
        if (finished) return
        finished = true
        val score = world.score
        val newBest = score > game.prefs.bestScore
        if (newBest) game.prefs.bestScore = score
        game.ads?.pacing?.recordGameOver()
        game.go(GameOverScene(game, score, newBest))
    }

    private fun syncButtons() {
        val offering = phase == Phase.OFFER_REVIVE
        reviveButton.visible = offering
        declineButton.visible = offering
        pauseButton.visible = phase == Phase.PLAYING || phase == Phase.PAUSED
    }

    private fun drawSky(canvas: Canvas) {
        val sky = game.assets.sky
        val tileH = sky.height.toFloat()
        var y = (world.skyOffset % tileH) - tileH
        while (y < game.height) {
            canvas.bitmap(sky, null, rect(0f, y, game.width, tileH))
            y += tileH
        }
    }

    private fun overlay(canvas: Canvas, title: String, subtitle: String) {
        canvas.drawColor(Color.argb(140, 0, 0, 0))
        canvas.text(title, game.width / 2, game.height / 2 - 40f, 80f, align = Paint.Align.CENTER)
        canvas.text(subtitle, game.width / 2, game.height / 2 + 30f, 40f, Color.WHITE, Paint.Align.CENTER)
    }

    private fun drawReviveOffer(canvas: Canvas) {
        canvas.drawColor(Color.argb(170, 0, 0, 0))
        val cy = game.height / 2
        canvas.panel(RectF(110f, cy - 260f, 790f, cy + 270f), 0xE0101A55.toInt(), YELLOW, 4f, 28f)
        canvas.text("CRASHED!", game.width / 2, cy - 170f, 76f, align = Paint.Align.CENTER)
        canvas.text("Score: ${world.score}", game.width / 2, cy - 100f, 44f, Color.WHITE, Paint.Align.CENTER)
        if (phase == Phase.OFFER_REVIVE) {
            val secondsLeft = (REVIVE_OFFER_TICKS - offerTicks + 59) / 60
            canvas.text("Keep flying? $secondsLeft", game.width / 2, cy - 30f, 40f, Color.WHITE, Paint.Align.CENTER)
        } else {
            canvas.text("Loading ad…", game.width / 2, cy + 80f, 40f, Color.WHITE, Paint.Align.CENTER)
        }
    }

    private companion object {
        const val REVIVE_OFFER_TICKS = 6 * 60
        const val SHAKE_TICKS = 30
    }
}
