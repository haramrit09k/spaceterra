package io.github.haramrit09k.spaceterra.scenes

import android.graphics.Canvas
import android.graphics.RectF
import android.view.MotionEvent
import io.github.haramrit09k.spaceterra.Game
import io.github.haramrit09k.spaceterra.ui.Button
import io.github.haramrit09k.spaceterra.ui.bitmapPaint

abstract class Scene(protected val game: Game) {
    protected val buttons = mutableListOf<Button>()
    private val pressedBy = HashMap<Int, Button>()

    /** Whether the banner ad may show. Never during gameplay, where taps steer the rocket. */
    open val showsBanner = true

    open fun enter() = layout()
    open fun exit() {}
    open fun update() {}
    abstract fun draw(canvas: Canvas)

    /** (Re)creates [buttons] for the current [Game.height]. */
    protected open fun layout() {}

    fun onResize() {
        buttons.clear()
        pressedBy.clear()
        layout()
    }

    /** Returns true when the back press was handled; false lets the app close. */
    open fun onBack(): Boolean {
        game.go(MenuScene(game))
        return true
    }

    open fun onAppPaused() {}

    open fun onTouch(action: Int, pointerId: Int, x: Float, y: Float) {
        when (action) {
            MotionEvent.ACTION_DOWN -> {
                val hit = buttons.lastOrNull { it.contains(x, y) }
                if (hit != null) {
                    hit.pressed = true
                    pressedBy[pointerId] = hit
                } else {
                    onPointerDown(pointerId, x, y)
                }
            }
            MotionEvent.ACTION_MOVE -> pressedBy[pointerId]?.let { it.pressed = it.contains(x, y) }
            MotionEvent.ACTION_UP -> {
                val button = pressedBy.remove(pointerId)
                if (button != null) {
                    button.pressed = false
                    if (button.contains(x, y)) button.onClick()
                } else {
                    onPointerUp(pointerId)
                }
            }
            MotionEvent.ACTION_CANCEL -> {
                pressedBy.remove(pointerId)?.pressed = false
                onPointerUp(pointerId)
            }
        }
    }

    protected open fun onPointerDown(pointerId: Int, x: Float, y: Float) {}
    protected open fun onPointerUp(pointerId: Int) {}

    protected fun drawButtons(canvas: Canvas) = buttons.forEach { it.draw(canvas) }

    protected fun rect(x: Float, y: Float, w: Float, h: Float) = RectF(x, y, x + w, y + h)

    /** Top-left mute toggle shared by every screen, as in the web game. */
    protected fun addMuteButton() {
        val sheet = game.assets.musicToggle
        buttons += Button(rect(40f, game.safeTop, 80f, 80f), { b, _ ->
            // Frame 1 is the note icon (sound on), frame 0 the crossed-out one.
            drawBitmap(sheet.bitmap, sheet.src(if (game.audio.muted) 0 else 1), b, bitmapPaint)
        }) { game.audio.toggleMute() }
    }
}
