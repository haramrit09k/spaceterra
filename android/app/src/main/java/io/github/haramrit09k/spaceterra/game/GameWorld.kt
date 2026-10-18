package io.github.haramrit09k.spaceterra.game

import kotlin.math.sin
import kotlin.random.Random

/**
 * Gameplay rules ported from public/javascripts/states/gameplay.js and utils.js.
 *
 * The web version runs one Phaser update per animation frame, so everything here
 * advances in fixed 1/60 s ticks with the same per-frame constants. Coordinates
 * use the web game's 900-unit-wide world; [height] grows on tall phone screens
 * so the player sees further ahead instead of getting black bars.
 *
 * This class has no Android dependencies so it can be unit tested on the JVM.
 */
class GameWorld(
    val width: Float = WORLD_WIDTH,
    val height: Float = BASE_HEIGHT,
    private val rng: Random = Random.Default,
) {
    enum class State { RUNNING, CRASHING, CRASHED }

    /** Position is in the rock group's local space; add [rocksOffsetY] for world y. */
    class Rock(val x: Float, val y: Float, val frame: Int, val scale: Float) {
        val size get() = ROCK_FRAME_W * scale
    }

    /** Position is in the alien group's local space; add the group offsets for world space. */
    class Alien(val y: Float)

    var state = State.RUNNING
        private set
    var score = 0
        private set
    var thrusting = false
        private set
    var revived = false
        private set

    /** Ticks since the crash started; drives the explosion animation. */
    var crashTicks = 0
        private set

    val rocketY = height - ROCKET_BOTTOM_MARGIN
    var rocketX = ROCKET_CENTER_X
        private set

    val rocks = ArrayList<Rock>()
    val aliens = ArrayList<Alien>()
    var rocksOffsetY = 0f
        private set
    var aliensOffsetX = 0f
        private set
    var aliensOffsetY = 0f
        private set

    /** Starfield scroll, in world units. */
    var skyOffset = 0f
        private set

    private var oscIndex = 1L
    private var intensity = START_INTENSITY
    private var idleTicks = 0
    private var distance = 0.0
    private var thrustTicks = 0
    private var spawnX = 0f
    private var spawnY = 0f
    private var nextAlienY = 0f

    init {
        spawnX = rng.range(200, 400).toFloat()
        spawnY = rng.range(150, 250).toFloat()
        for (i in 0..10) {
            addRock(i % ROCK_FRAMES)
            advanceSpawnCursor()
        }
        nextAlienY = rng.range(-2000, -1000).toFloat()
        topUpAliens()
        updateOscillation()
    }

    /** Advances the simulation by one 1/60 s frame. */
    fun tick(holding: Boolean) {
        when (state) {
            State.CRASHED -> return
            State.CRASHING -> {
                crashTicks++
                if (crashTicks >= CRASH_DURATION_TICKS) state = State.CRASHED
                return
            }
            State.RUNNING -> Unit
        }

        if (collides()) {
            crash()
            return
        }

        updateOscillation()
        if (intensity > MIN_INTENSITY) intensity -= INTENSITY_DECAY

        thrusting = holding
        if (holding) {
            distance += 0.1
            score = distance.toInt()
            skyOffset += 1f
            rocksOffsetY += ROCK_SPEED
            aliensOffsetY += ALIEN_SPEED
            idleTicks = 0
            thrustTicks++
            if (thrustTicks % SPAWN_EVERY_THRUST_TICKS == 0) {
                repeat(3) {
                    advanceSpawnCursor()
                    addRock(rng.range(0, 64) % ROCK_FRAMES)
                }
            }
            topUpAliens()
            prune()
        } else {
            idleTicks++
            if (idleTicks >= IDLE_LIMIT_TICKS) crash()
        }
    }

    /**
     * Continues a crashed run (after a rewarded ad): clears the hazards near the
     * rocket and lets the player keep their score. Only allowed once per run.
     */
    fun revive(): Boolean {
        if (state != State.CRASHED || revived) return false
        val clearAbove = rocketY - REVIVE_CLEAR_DISTANCE
        rocks.removeAll { it.y + rocksOffsetY + it.size > clearAbove }
        aliens.removeAll { it.y + aliensOffsetY + ALIEN_SIZE > clearAbove }
        state = State.RUNNING
        crashTicks = 0
        idleTicks = 0
        revived = true
        return true
    }

    fun rocketHitbox(): Box = Box(
        rocketX + ROCKET_W * 0.2f,
        rocketY + ROCKET_H * 0.1f,
        ROCKET_W * 0.6f,
        ROCKET_H * 0.8f,
    )

    fun rockHitbox(rock: Rock): Box {
        val inset = rock.size * 0.15f
        return Box(rock.x + inset, rock.y + rocksOffsetY + inset, rock.size - inset * 2, rock.size - inset * 2)
    }

    fun alienX() = aliensOffsetX + ALIEN_LOCAL_X

    fun alienHitbox(alien: Alien): Box {
        val inset = ALIEN_SIZE * 0.2f
        return Box(alienX() + inset, alien.y + aliensOffsetY + inset, ALIEN_SIZE - inset * 2, ALIEN_SIZE - inset * 2)
    }

    private fun collides(): Boolean {
        val r = rocketHitbox()
        return rocks.any { r.overlaps(rockHitbox(it)) } || aliens.any { r.overlaps(alienHitbox(it)) }
    }

    private fun crash() {
        state = State.CRASHING
        crashTicks = 0
        thrusting = false
    }

    // oscillation() and oscillation40() in utils.js share one counter, so the
    // rocket reads the odd steps and the aliens read the even ones.
    private fun updateOscillation() {
        rocketX = ROCKET_CENTER_X + (ROCKET_AMPLITUDE * sin(oscIndex / intensity)).toInt()
        oscIndex++
        aliensOffsetX = ALIEN_CENTER_X + (ALIEN_AMPLITUDE * sin(oscIndex / ALIEN_PERIOD)).toInt()
        oscIndex++
    }

    private fun addRock(frame: Int) {
        rocks.add(Rock(spawnX, spawnY, frame, ROCK_SCALES[rng.nextInt(ROCK_SCALES.size)]))
    }

    private fun advanceSpawnCursor() {
        spawnX += rng.range(200, 450)
        if (spawnX > 570) spawnX -= rng.range(400, 550)
        spawnY -= rng.range(250, 425)
    }

    private fun topUpAliens() {
        while (nextAlienY + aliensOffsetY > -ALIEN_LOOKAHEAD) {
            aliens.add(Alien(nextAlienY))
            nextAlienY -= rng.range(2000, 5000)
        }
    }

    private fun prune() {
        rocks.removeAll { it.y + rocksOffsetY > height + PRUNE_MARGIN }
        aliens.removeAll { it.y + aliensOffsetY > height + PRUNE_MARGIN }
    }

    data class Box(val x: Float, val y: Float, val w: Float, val h: Float) {
        fun overlaps(o: Box) = x < o.x + o.w && o.x < x + w && y < o.y + o.h && o.y < y + h
    }

    companion object {
        const val WORLD_WIDTH = 900f
        const val BASE_HEIGHT = 768f

        // Sprite sizes after the web version's scale factors.
        const val ROCKET_W = 40f // 100 x 0.4
        const val ROCKET_H = 60f // 150 x 0.4
        const val ROCK_FRAME_W = 72f
        const val ROCK_FRAMES = 15
        const val ALIEN_SIZE = 83f // 278 x 0.3
        const val EXPLOSION_SIZE = 87f // 512 x 0.17

        const val ROCKET_BOTTOM_MARGIN = 268f // rocket sat at y=500 of 768
        const val ROCKET_CENTER_X = 420f
        const val ROCKET_AMPLITUDE = 390.0
        const val START_INTENSITY = 50.0
        const val MIN_INTENSITY = 41.0
        const val INTENSITY_DECAY = 0.0007

        const val ALIEN_LOCAL_X = 300f
        const val ALIEN_CENTER_X = 80f
        const val ALIEN_AMPLITUDE = 300.0
        const val ALIEN_PERIOD = 80.0

        const val ROCK_SPEED = 15f
        const val ALIEN_SPEED = 10f
        const val SPAWN_EVERY_THRUST_TICKS = 50
        const val IDLE_LIMIT_TICKS = 300
        const val CRASH_DURATION_TICKS = 45 // 750 ms

        private const val ALIEN_LOOKAHEAD = 6000f
        private const val PRUNE_MARGIN = 200f
        private const val REVIVE_CLEAR_DISTANCE = 700f
        private val ROCK_SCALES = floatArrayOf(1f, 1.1f, 1.2f, 1.3f)
    }
}

/** Inclusive integer range, matching Phaser's `rnd.integerInRange`. */
private fun Random.range(min: Int, max: Int) = nextInt(min, max + 1)
