package io.github.haramrit09k.spaceterra

import android.annotation.SuppressLint
import android.content.Context
import android.os.Build
import android.view.MotionEvent
import android.view.SurfaceHolder
import android.view.SurfaceView

/**
 * Hardware-accelerated SurfaceView running a fixed-timestep loop: game logic
 * always advances at 60 updates per second, whatever the display refresh rate.
 */
@SuppressLint("ViewConstructor")
class GameView(context: Context, private val game: Game) : SurfaceView(context), SurfaceHolder.Callback {
    private var thread: Thread? = null
    @Volatile private var running = false
    private var surfaceReady = false
    private var resumed = false

    init {
        holder.addCallback(this)
        isFocusable = true
    }

    fun onResume() {
        resumed = true
        startLoop()
    }

    fun onPause() {
        resumed = false
        stopLoop()
    }

    override fun surfaceCreated(holder: SurfaceHolder) {
        surfaceReady = true
        startLoop()
    }

    override fun surfaceChanged(holder: SurfaceHolder, format: Int, width: Int, height: Int) {
        game.post { game.resize(width, height) }
    }

    override fun surfaceDestroyed(holder: SurfaceHolder) {
        surfaceReady = false
        stopLoop()
    }

    @SuppressLint("ClickableViewAccessibility")
    override fun onTouchEvent(event: MotionEvent): Boolean {
        val index = event.actionIndex
        when (event.actionMasked) {
            MotionEvent.ACTION_DOWN, MotionEvent.ACTION_POINTER_DOWN,
            MotionEvent.ACTION_UP, MotionEvent.ACTION_POINTER_UP -> send(event, event.actionMasked, index)
            MotionEvent.ACTION_MOVE -> for (i in 0 until event.pointerCount) send(event, MotionEvent.ACTION_MOVE, i)
            MotionEvent.ACTION_CANCEL -> for (i in 0 until event.pointerCount) send(event, MotionEvent.ACTION_CANCEL, i)
        }
        return true
    }

    private fun send(event: MotionEvent, action: Int, index: Int) {
        val normalized = when (action) {
            MotionEvent.ACTION_POINTER_DOWN -> MotionEvent.ACTION_DOWN
            MotionEvent.ACTION_POINTER_UP -> MotionEvent.ACTION_UP
            else -> action
        }
        game.touch(normalized, event.getPointerId(index), game.toWorldX(event.getX(index)), game.toWorldY(event.getY(index)))
    }

    private fun startLoop() {
        if (!surfaceReady || !resumed || running) return
        running = true
        thread = Thread(::loop, "game-loop").also { it.start() }
    }

    private fun stopLoop() {
        running = false
        thread?.let {
            it.interrupt()
            runCatching { it.join(500) }
        }
        thread = null
    }

    private fun loop() {
        var last = System.nanoTime()
        var lag = 0L
        while (running) {
            val now = System.nanoTime()
            lag += (now - last).coerceAtMost(MAX_FRAME_NS)
            last = now

            game.runTasks()
            var steps = 0
            while (lag >= STEP_NS && steps < MAX_STEPS) {
                game.update()
                lag -= STEP_NS
                steps++
            }
            if (steps == MAX_STEPS) lag = 0

            val canvas = runCatching {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) holder.lockHardwareCanvas() else holder.lockCanvas()
            }.getOrNull()
            if (canvas == null) {
                runCatching { Thread.sleep(16) }
                continue
            }
            try {
                game.draw(canvas)
            } finally {
                holder.unlockCanvasAndPost(canvas)
            }
        }
    }

    private companion object {
        const val STEP_NS = 1_000_000_000L / 60
        const val MAX_STEPS = 5
        const val MAX_FRAME_NS = 250_000_000L
    }
}
