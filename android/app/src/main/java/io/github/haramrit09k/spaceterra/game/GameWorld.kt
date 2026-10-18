package io.github.haramrit09k.spaceterra.game

import kotlin.math.hypot
import kotlin.math.sin
import kotlin.random.Random

/**
 * Gameplay rules ported from public/javascripts/states/gameplay.js and utils.js,
 * extended with endless-runner systems: coins, power-ups and a speed ramp.
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
    private val powerUpTicks: (PowerUp) -> Int = { BASE_POWER_UP_TICKS },
    private val rng: Random = Random.Default,
) {
    enum class State { RUNNING, CRASHING, CRASHED }

    enum class PowerUp { SHIELD, MAGNET, DOUBLE_COINS }

    /** Position is in the scrolling layer's local space; add [rocksOffsetY] for world y. */
    class Rock(val x: Float, val y: Float, val frame: Int, val scale: Float) {
        val size get() = ROCK_FRAME_W * scale
    }

    /** Position is in the alien group's local space; add the group offsets for world space. */
    class Alien(val y: Float)

    /** A coin or power-up riding the same layer as the rocks. [powerUp] is null for coins. */
    class Pickup(var x: Float, var y: Float, val powerUp: PowerUp?) {
        val size get() = if (powerUp == null) COIN_SIZE else POWER_UP_SIZE
    }

    /** Things that happened this tick, for sound and on-screen feedback. */
    sealed interface Event {
        data class CoinCollected(val amount: Int) : Event
        data class PowerUpCollected(val powerUp: PowerUp) : Event
        object ShieldBroke : Event
        object Crashed : Event
    }

    /** Per-run totals used for missions, achievements and rewards. */
    class RunStats {
        var coins = 0
        var powerUps = 0
        var shieldSaves = 0
    }

    var state = State.RUNNING
        private set
    var score = 0
        private set
    var thrusting = false
        private set
    var revives = 0
        private set
    val stats = RunStats()
    val events = ArrayList<Event>()

    /** Ticks since the crash started; drives the explosion animation. */
    var crashTicks = 0
        private set

    val rocketY = height - ROCKET_BOTTOM_MARGIN
    var rocketX = ROCKET_CENTER_X
        private set

    val rocks = ArrayList<Rock>()
    val aliens = ArrayList<Alien>()
    val pickups = ArrayList<Pickup>()
    var rocksOffsetY = 0f
        private set
    var aliensOffsetX = 0f
        private set
    var aliensOffsetY = 0f
        private set

    /** Starfield scroll, in world units. */
    var skyOffset = 0f
        private set

    /** Remaining ticks for each active power-up. */
    val activePowerUps = HashMap<PowerUp, Int>()

    /** Brief invulnerability after a shield absorbs a hit (the rocket blinks). */
    var invulnerableTicks = 0
        private set

    /** Forward-speed multiplier: 1 at the start, ramping to [MAX_SPEED] with distance. */
    val speed get() = 1f + (MAX_SPEED - 1f) * (distance / SPEED_RAMP_SCORE).coerceAtMost(1.0).toFloat()

    private var oscIndex = 1L
    private var intensity = START_INTENSITY
    private var idleTicks = 0
    private var distance = 0.0
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
        // A first coin trail high up so new players see what to chase.
        addCoinPattern(CoinPattern.LINE, spawnY + 900f)
        nextAlienY = rng.range(-2000, -1000).toFloat()
        topUpAliens()
        updateOscillation()
    }

    fun isActive(powerUp: PowerUp) = (activePowerUps[powerUp] ?: 0) > 0

    /** Advances the simulation by one 1/60 s frame. */
    fun tick(holding: Boolean) {
        events.clear()
        when (state) {
            State.CRASHED -> return
            State.CRASHING -> {
                crashTicks++
                if (crashTicks >= CRASH_DURATION_TICKS) state = State.CRASHED
                return
            }
            State.RUNNING -> Unit
        }

        if (handleCollisions()) return

        updateOscillation()
        if (intensity > MIN_INTENSITY) intensity -= INTENSITY_DECAY
        tickPowerUps()
        collectPickups()

        thrusting = holding
        if (holding) {
            val s = speed
            distance += 0.1 * s
            score = distance.toInt()
            skyOffset += s
            rocksOffsetY += ROCK_SPEED * s
            aliensOffsetY += ALIEN_SPEED * s
            idleTicks = 0
            topUpRocks()
            topUpAliens()
            prune()
        } else {
            idleTicks++
            if (idleTicks >= IDLE_LIMIT_TICKS) crash()
        }
    }

    /**
     * Continues a crashed run (after a rewarded ad or by spending coins): clears
     * the hazards near the rocket and lets the player keep their score.
     */
    fun revive(): Boolean {
        if (state != State.CRASHED) return false
        val clearAbove = rocketY - REVIVE_CLEAR_DISTANCE
        rocks.removeAll { it.y + rocksOffsetY + it.size > clearAbove }
        aliens.removeAll { it.y + aliensOffsetY + ALIEN_SIZE > clearAbove }
        state = State.RUNNING
        crashTicks = 0
        idleTicks = 0
        invulnerableTicks = INVULNERABLE_TICKS
        revives++
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

    fun pickupBox(p: Pickup) = Box(p.x, p.y + rocksOffsetY, p.size, p.size)

    /** Returns true when the rocket crashed this tick. */
    private fun handleCollisions(): Boolean {
        if (invulnerableTicks > 0) {
            invulnerableTicks--
            return false
        }
        val r = rocketHitbox()
        val rock = rocks.firstOrNull { r.overlaps(rockHitbox(it)) }
        val alien = if (rock == null) aliens.firstOrNull { r.overlaps(alienHitbox(it)) } else null
        if (rock == null && alien == null) return false

        if (isActive(PowerUp.SHIELD)) {
            rock?.let(rocks::remove)
            alien?.let(aliens::remove)
            activePowerUps.remove(PowerUp.SHIELD)
            invulnerableTicks = INVULNERABLE_TICKS
            stats.shieldSaves++
            events += Event.ShieldBroke
            return false
        }
        crash()
        return true
    }

    private fun crash() {
        state = State.CRASHING
        crashTicks = 0
        thrusting = false
        events += Event.Crashed
    }

    private fun tickPowerUps() {
        val iterator = activePowerUps.entries.iterator()
        while (iterator.hasNext()) {
            val entry = iterator.next()
            entry.setValue(entry.value - 1)
            if (entry.value <= 0) iterator.remove()
        }
    }

    private fun collectPickups() {
        val r = rocketHitbox()
        val magnet = isActive(PowerUp.MAGNET)
        val cx = r.x + r.w / 2
        val cy = r.y + r.h / 2
        val iterator = pickups.iterator()
        while (iterator.hasNext()) {
            val p = iterator.next()
            if (magnet && p.powerUp == null) {
                val px = p.x + p.size / 2
                val py = p.y + rocksOffsetY + p.size / 2
                val dist = hypot(cx - px, cy - py)
                if (dist < MAGNET_RADIUS && dist > 1f) {
                    val pull = minOf(MAGNET_PULL, dist) / dist
                    p.x += (cx - px) * pull
                    p.y += (cy - py) * pull
                }
            }
            if (!r.overlaps(pickupBox(p))) continue
            iterator.remove()
            val powerUp = p.powerUp
            if (powerUp == null) {
                val amount = if (isActive(PowerUp.DOUBLE_COINS)) 2 else 1
                stats.coins += amount
                events += Event.CoinCollected(amount)
            } else {
                activePowerUps[powerUp] = powerUpTicks(powerUp)
                stats.powerUps++
                events += Event.PowerUpCollected(powerUp)
            }
        }
    }

    // oscillation() and oscillation40() in utils.js share one counter, so the
    // rocket reads the odd steps and the aliens read the even ones.
    private fun updateOscillation() {
        rocketX = ROCKET_CENTER_X + (ROCKET_AMPLITUDE * sin(oscIndex / intensity)).toInt()
        oscIndex++
        aliensOffsetX = ALIEN_CENTER_X + (ALIEN_AMPLITUDE * sin(oscIndex / ALIEN_PERIOD)).toInt()
        oscIndex++
    }

    /**
     * The web game spawned 3 rocks every 50 thrust frames, but its spawn cursor
     * climbed faster than the player flew, so rocks piled up ahead forever.
     * Filling a fixed distance ahead keeps the same density with bounded memory.
     */
    private fun topUpRocks() {
        while (spawnY + rocksOffsetY > -ROCK_LOOKAHEAD) spawnBatch()
    }

    private fun spawnBatch() {
        val bandBottom = spawnY
        repeat(3) {
            advanceSpawnCursor()
            addRock(rng.range(0, 64) % ROCK_FRAMES)
        }
        if (rng.nextFloat() < COIN_TRAIL_CHANCE) addCoinPattern(CoinPattern.pick(rng.nextFloat()), bandBottom)
        if (rng.nextFloat() < POWER_UP_CHANCE) {
            val kind = PowerUp.entries[rng.nextInt(PowerUp.entries.size)]
            val x = rng.range(60, 790).toFloat()
            val y = rng.range(spawnY.toInt(), bandBottom.toInt()).toFloat()
            if (isClear(x, y, POWER_UP_SIZE)) pickups += Pickup(x, y, kind)
        }
    }

    /**
     * Lays out [pattern] with its bottom at [bottom], at a random x where the
     * whole shape fits on screen, skipping coins that would sit on a rock.
     */
    fun addCoinPattern(pattern: CoinPattern, bottom: Float, originX: Float? = null) {
        val left = COIN_MARGIN - pattern.minX
        val right = width - COIN_MARGIN - COIN_SIZE - pattern.maxX
        val x0 = originX ?: rng.range(left.toInt(), maxOf(left, right).toInt()).toFloat()
        for ((dx, dy) in pattern.offsets) {
            val x = x0 + dx
            val y = bottom + dy
            if (isClear(x, y, COIN_SIZE)) pickups += Pickup(x, y, null)
        }
    }

    private fun isClear(x: Float, y: Float, size: Float): Boolean {
        val margin = 20f
        val box = Box(x - margin, y - margin, size + margin * 2, size + margin * 2)
        return rocks.none { box.overlaps(Box(it.x, it.y, it.size, it.size)) }
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
        val limit = height + PRUNE_MARGIN
        rocks.removeAll { it.y + rocksOffsetY > limit }
        aliens.removeAll { it.y + aliensOffsetY > limit }
        pickups.removeAll { it.y + rocksOffsetY > limit }
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
        const val COIN_SIZE = 44f
        const val POWER_UP_SIZE = 64f

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
        const val MAX_SPEED = 1.6f
        const val SPEED_RAMP_SCORE = 800.0

        const val IDLE_LIMIT_TICKS = 300
        const val CRASH_DURATION_TICKS = 45 // 750 ms
        const val INVULNERABLE_TICKS = 90
        const val BASE_POWER_UP_TICKS = 8 * 60

        const val COIN_TRAIL_CHANCE = 0.6f
        const val POWER_UP_CHANCE = 0.12f
        const val COIN_MARGIN = 40f
        const val MAGNET_RADIUS = 320f
        const val MAGNET_PULL = 14f

        private const val ROCK_LOOKAHEAD = 3000f
        private const val ALIEN_LOOKAHEAD = 6000f
        private const val PRUNE_MARGIN = 200f
        private const val REVIVE_CLEAR_DISTANCE = 700f
        private val ROCK_SCALES = floatArrayOf(1f, 1.1f, 1.2f, 1.3f)
    }
}

/** Inclusive integer range, matching Phaser's `rnd.integerInRange`. */
private fun Random.range(min: Int, max: Int) = nextInt(min, max + 1)
