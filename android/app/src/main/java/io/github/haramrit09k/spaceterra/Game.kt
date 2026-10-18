package io.github.haramrit09k.spaceterra

import android.graphics.Canvas
import android.graphics.Color
import io.github.haramrit09k.spaceterra.ads.AdsManager
import io.github.haramrit09k.spaceterra.game.GameWorld
import io.github.haramrit09k.spaceterra.net.LeaderboardClient
import io.github.haramrit09k.spaceterra.scenes.MenuScene
import io.github.haramrit09k.spaceterra.scenes.Scene
import java.util.concurrent.ConcurrentLinkedQueue

/** Everything a scene can reach. UI code should use the hooks provided by MainActivity. */
interface Host {
    fun askPlayerName(current: String?, onDone: (String) -> Unit)
    fun quit()
}

/**
 * Owns the current [Scene] and the virtual coordinate system. All scene code runs
 * on the game loop thread; other threads hand work over with [post].
 */
class Game(
    val assets: Assets,
    val audio: Audio,
    val prefs: Prefs,
    val leaderboard: LeaderboardClient,
    val ads: AdsManager?,
    val host: Host,
    private val density: Float,
) {
    /** The world is always [width] units wide; [height] follows the screen's aspect ratio. */
    val width = GameWorld.WORLD_WIDTH
    var height = GameWorld.BASE_HEIGHT
        private set

    @Volatile private var scale = 1f
    @Volatile private var offsetX = 0f

    /** Pixels hidden behind a display cutout at the top of the screen. */
    @Volatile var safeTopPx = 0

    val safeTop get() = safeTopPx / scale + 24f

    /** Room left free at the bottom of menu screens for the banner ad. */
    val bannerReserve get() = if (ads == null) 0f else BANNER_DP * density / scale

    var tick = 0L
        private set

    private var scene: Scene? = null
    private val tasks = ConcurrentLinkedQueue<Runnable>()

    fun post(task: () -> Unit) {
        tasks.add(Runnable(task))
    }

    fun go(next: Scene) {
        scene?.exit()
        scene = next
        ads?.setBannerVisible(next.showsBanner)
        next.enter()
    }

    fun resize(widthPx: Int, heightPx: Int) {
        if (widthPx <= 0 || heightPx <= 0) return
        scale = minOf(widthPx / width, heightPx / GameWorld.BASE_HEIGHT)
        offsetX = (widthPx - width * scale) / 2
        height = heightPx / scale
        val current = scene
        if (current == null) go(MenuScene(this)) else current.onResize()
    }

    fun toWorldX(px: Float) = (px - offsetX) / scale
    fun toWorldY(px: Float) = px / scale

    fun runTasks() {
        while (true) (tasks.poll() ?: break).run()
    }

    fun update() {
        tick++
        scene?.update()
    }

    fun draw(canvas: Canvas) {
        canvas.drawColor(Color.BLACK)
        canvas.save()
        canvas.translate(offsetX, 0f)
        canvas.scale(scale, scale)
        canvas.clipRect(0f, 0f, width, height)
        scene?.draw(canvas)
        canvas.restore()
    }

    fun touch(action: Int, pointerId: Int, x: Float, y: Float) = post { scene?.onTouch(action, pointerId, x, y) }

    fun back() = post {
        if (scene?.onBack() != true) host.quit()
    }

    fun appPaused() = post { scene?.onAppPaused() }

    private companion object {
        const val BANNER_DP = 64f
    }
}
