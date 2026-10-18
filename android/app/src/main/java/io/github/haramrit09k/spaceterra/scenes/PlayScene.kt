package io.github.haramrit09k.spaceterra.scenes

import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.RectF
import io.github.haramrit09k.spaceterra.Game
import io.github.haramrit09k.spaceterra.game.GameWorld
import io.github.haramrit09k.spaceterra.game.GameWorld.Event
import io.github.haramrit09k.spaceterra.game.GameWorld.PowerUp
import io.github.haramrit09k.spaceterra.game.GameWorld.State
import io.github.haramrit09k.spaceterra.game.Upgrades
import io.github.haramrit09k.spaceterra.games.PlayGames.Achievement
import io.github.haramrit09k.spaceterra.ui.Button
import io.github.haramrit09k.spaceterra.ui.Icons
import io.github.haramrit09k.spaceterra.ui.YELLOW
import io.github.haramrit09k.spaceterra.ui.bitmap
import io.github.haramrit09k.spaceterra.ui.bitmapPaint
import io.github.haramrit09k.spaceterra.ui.panel
import io.github.haramrit09k.spaceterra.ui.text
import kotlin.random.Random

/**
 * The main game (gameplay.js). After a crash the player may continue, either by
 * spending coins (price doubles each time) or once per run by watching an ad.
 */
class PlayScene(game: Game) : Scene(game) {
    private enum class Phase { PLAYING, PAUSED, OFFER_REVIVE, WAITING_FOR_AD }

    private val world = GameWorld(game.width, game.height, { Upgrades.durationTicks(game.prefs.upgradeLevel(it)) })
    private val holding = HashSet<Int>()
    private var phase = Phase.PLAYING
    private var offerTicks = 0
    private var adReviveUsed = false
    private var finished = false
    private var toast: String? = null
    private var toastTicks = 0

    private val pauseButton = Button.image(RectF(), game.assets.pause) { togglePause() }
    private val coinReviveButton = Button.pill(RectF(), { "Continue for ${reviveCost()} coins" }, 34f) { reviveWithCoins() }
    private val adReviveButton = Button.pill(RectF(), { "▶  Watch ad to continue" }, 34f) { reviveWithAd() }
    private val declineButton = Button.link(RectF(), { "No thanks" }, 32f) { finishRun() }

    override val showsBanner = false

    override fun layout() {
        addMuteButton()
        val cy = game.height / 2
        pauseButton.bounds.set(game.width - 120f, game.safeTop, game.width - 40f, game.safeTop + 80f)
        coinReviveButton.bounds.set(150f, cy + 10f, 750f, cy + 110f)
        adReviveButton.bounds.set(150f, cy + 135f, 750f, cy + 235f)
        declineButton.bounds.set(300f, cy + 255f, 600f, cy + 320f)
        buttons += pauseButton
        buttons += coinReviveButton
        buttons += adReviveButton
        buttons += declineButton
        syncButtons()
    }

    override fun update() {
        if (toastTicks > 0) toastTicks--
        when (phase) {
            Phase.PAUSED, Phase.WAITING_FOR_AD -> return
            Phase.OFFER_REVIVE -> {
                if (++offerTicks >= REVIVE_OFFER_TICKS) finishRun()
                return
            }
            Phase.PLAYING -> Unit
        }

        world.tick(holding.isNotEmpty())
        for (event in world.events) {
            when (event) {
                Event.Crashed -> game.audio.playExplosion()
                Event.ShieldBroke -> showToast("Shield saved you!")
                is Event.PowerUpCollected -> showToast(Upgrades.title(event.powerUp) + "!")
                is Event.CoinCollected -> Unit
            }
        }

        if (world.state == State.CRASHED) {
            if (canReviveWithCoins() || canReviveWithAd()) {
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
        val t = game.tick
        canvas.save()
        if (world.state == State.CRASHING && world.crashTicks < SHAKE_TICKS) {
            canvas.translate(Random.nextFloat() * 24f - 12f, Random.nextFloat() * 24f - 12f)
        }

        drawSky(canvas)

        for (p in world.pickups) {
            val y = p.y + world.rocksOffsetY
            if (y > game.height || y + p.size < 0) continue
            val kind = p.powerUp
            if (kind == null) Icons.coin(canvas, p.x, y, p.size, t) else Icons.powerUp(canvas, kind, p.x, y, p.size, t)
        }

        for (rock in world.rocks) {
            val y = rock.y + world.rocksOffsetY
            if (y > game.height || y + rock.size < 0) continue
            canvas.drawBitmap(a.rocks.bitmap, a.rocks.src(rock.frame), RectF(rock.x, y, rock.x + rock.size, y + rock.size * 70f / 72f), bitmapPaint)
        }

        val alienFrame = ((t / 6) % 3).toInt()
        val alienX = world.alienX()
        for (alien in world.aliens) {
            val y = alien.y + world.aliensOffsetY
            if (y > game.height || y + GameWorld.ALIEN_SIZE < 0) continue
            canvas.drawBitmap(a.alien.bitmap, a.alien.src(alienFrame), RectF(alienX, y, alienX + GameWorld.ALIEN_SIZE, y + GameWorld.ALIEN_SIZE), bitmapPaint)
        }

        if (world.state == State.RUNNING) drawRocket(canvas)
        else if (world.state == State.CRASHING) {
            val size = GameWorld.EXPLOSION_SIZE
            canvas.drawBitmap(a.explosion.bitmap, a.explosion.src(world.crashTicks / 6), rect(world.rocketX, world.rocketY, size, size), bitmapPaint)
        }
        canvas.restore()

        drawHud(canvas)

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

    private fun reviveCost() = Upgrades.reviveCost(world.revives)

    /** Coins collected this run count towards the price, as they are banked at the end. */
    private fun coinsAvailable() = game.prefs.coins + world.stats.coins

    private fun canReviveWithCoins() = coinsAvailable() >= reviveCost()

    private fun canReviveWithAd() = !adReviveUsed && game.ads?.rewardedReady == true

    private fun reviveWithCoins() {
        if (!canReviveWithCoins()) return
        game.prefs.coins = coinsAvailable() - reviveCost()
        world.stats.coins = 0
        resumeAfterRevive()
    }

    private fun reviveWithAd() {
        val ads = game.ads ?: return finishRun()
        phase = Phase.WAITING_FOR_AD
        syncButtons()
        ads.showRewarded { earned ->
            game.post {
                if (earned) {
                    adReviveUsed = true
                    resumeAfterRevive()
                } else {
                    finishRun()
                }
            }
        }
    }

    private fun resumeAfterRevive() {
        if (!world.revive()) return finishRun()
        // Start paused so the player can get ready.
        phase = Phase.PAUSED
        syncButtons()
    }

    private fun finishRun() {
        if (finished) return
        finished = true
        val prefs = game.prefs
        val score = world.score
        val coins = world.stats.coins
        val newBest = score > prefs.bestScore
        if (newBest) prefs.bestScore = score
        prefs.coins += coins
        prefs.lifetimeCoins += coins
        prefs.runsPlayed += 1
        game.ads?.pacing?.recordGameOver()

        game.playGames?.let { pg ->
            pg.submitScore(score)
            pg.unlock(Achievement.FIRST_FLIGHT)
            if (score >= 100) pg.unlock(Achievement.SCORE_100)
            if (score >= 250) pg.unlock(Achievement.SCORE_250)
            if (score >= 500) pg.unlock(Achievement.SCORE_500)
            if (score >= 1000) pg.unlock(Achievement.SCORE_1000)
            if (world.stats.shieldSaves > 0) pg.unlock(Achievement.SHIELD_SAVE)
            if (prefs.lifetimeCoins >= 1000) pg.unlock(Achievement.COINS_1000)
        }
        game.go(GameOverScene(game, score, coins, newBest))
    }

    private fun showToast(message: String) {
        toast = message
        toastTicks = TOAST_TICKS
    }

    private fun syncButtons() {
        val offering = phase == Phase.OFFER_REVIVE
        coinReviveButton.visible = offering && canReviveWithCoins()
        adReviveButton.visible = offering && canReviveWithAd()
        declineButton.visible = offering
        pauseButton.visible = phase == Phase.PLAYING || phase == Phase.PAUSED
    }

    private fun drawRocket(canvas: Canvas) {
        // Blink while invulnerable after a shield hit or a revive.
        if (world.invulnerableTicks > 0 && (world.invulnerableTicks / 5) % 2 == 0) return
        val a = game.assets
        if (world.isActive(PowerUp.SHIELD)) {
            val cx = world.rocketX + GameWorld.ROCKET_W / 2
            val cy = world.rocketY + GameWorld.ROCKET_H / 2
            Icons.powerUp(canvas, PowerUp.SHIELD, cx - 55f, cy - 55f, 110f, game.tick)
        }
        val frame = if (world.thrusting) 3 else 0
        canvas.drawBitmap(a.rocket.bitmap, a.rocket.src(frame), rect(world.rocketX, world.rocketY, GameWorld.ROCKET_W, GameWorld.ROCKET_H), bitmapPaint)
    }

    private fun drawHud(canvas: Canvas) {
        val top = game.safeTop
        canvas.text("SCORE: ${world.score}", 150f, top + 58f, 52f)
        Icons.coin(canvas, 150f, top + 82f, 40f)
        canvas.text("${world.stats.coins}", 200f, top + 116f, 40f)

        // Active power-ups with a shrinking timer bar.
        var x = 360f
        for (kind in PowerUp.entries) {
            val left = world.activePowerUps[kind] ?: continue
            Icons.powerUp(canvas, kind, x, top + 82f, 48f, game.tick)
            val total = Upgrades.durationTicks(game.prefs.upgradeLevel(kind)).toFloat()
            canvas.panel(RectF(x, top + 136f, x + 48f, top + 144f), 0x66FFFFFF, radius = 4f)
            canvas.panel(RectF(x, top + 136f, x + 48f * (left / total).coerceIn(0f, 1f), top + 144f), Icons.color(kind), radius = 4f)
            x += 70f
        }

        val message = toast
        if (message != null && toastTicks > 0) {
            val alpha = (255 * (toastTicks / 20f).coerceAtMost(1f)).toInt()
            canvas.text(message, game.width / 2, top + 230f, 48f, (alpha shl 24) or (YELLOW and 0xFFFFFF), Paint.Align.CENTER)
        }
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
        canvas.panel(RectF(110f, cy - 260f, 790f, cy + 350f), 0xE0101A55.toInt(), YELLOW, 4f, 28f)
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
        const val TOAST_TICKS = 90
    }
}
