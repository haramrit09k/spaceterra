package io.github.haramrit09k.spaceterra.ui

import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Path
import android.graphics.RectF
import io.github.haramrit09k.spaceterra.game.GameWorld.PowerUp

/** Coin and power-up art, drawn with vector shapes so no new image files are needed. */
object Icons {
    private val fill = Paint(Paint.ANTI_ALIAS_FLAG)
    private val stroke = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.STROKE }

    fun color(powerUp: PowerUp) = when (powerUp) {
        PowerUp.SHIELD -> 0xFF35C8FF.toInt()
        PowerUp.MAGNET -> 0xFFFF4D5E.toInt()
        PowerUp.DOUBLE_COINS -> 0xFFB46CFF.toInt()
    }

    /** A spinning gold coin; [tick] drives the spin. */
    fun coin(canvas: Canvas, x: Float, y: Float, size: Float, tick: Long = 0) {
        val r = size / 2
        val cx = x + r
        val cy = y + r
        val squash = 0.55f + 0.45f * kotlin.math.abs(kotlin.math.cos(tick / 14.0)).toFloat()
        val rx = r * squash
        fill.color = 0xFFB8860B.toInt()
        canvas.drawOval(cx - rx, cy - r, cx + rx, cy + r, fill)
        fill.color = 0xFFFFD43B.toInt()
        canvas.drawOval(cx - rx * 0.82f, cy - r * 0.82f, cx + rx * 0.82f, cy + r * 0.82f, fill)
        fill.color = 0xFFFFF3B0.toInt()
        canvas.drawOval(cx - rx * 0.45f, cy - r * 0.6f, cx - rx * 0.05f, cy - r * 0.1f, fill)
    }

    fun powerUp(canvas: Canvas, kind: PowerUp, x: Float, y: Float, size: Float, tick: Long = 0) {
        val r = size / 2
        val cx = x + r
        val cy = y + r
        val pulse = 1f + 0.06f * kotlin.math.sin(tick / 8.0).toFloat()
        val c = color(kind)
        fill.color = (c and 0x00FFFFFF) or 0x55000000
        canvas.drawCircle(cx, cy, r * pulse, fill)
        stroke.color = c
        stroke.strokeWidth = size * 0.07f
        canvas.drawCircle(cx, cy, r * 0.9f * pulse, stroke)
        glyph(canvas, kind, cx, cy, r * 0.55f)
    }

    private fun glyph(canvas: Canvas, kind: PowerUp, cx: Float, cy: Float, r: Float) {
        when (kind) {
            PowerUp.SHIELD -> {
                val p = Path().apply {
                    moveTo(cx, cy - r)
                    lineTo(cx + r * 0.85f, cy - r * 0.6f)
                    quadTo(cx + r * 0.8f, cy + r * 0.6f, cx, cy + r)
                    quadTo(cx - r * 0.8f, cy + r * 0.6f, cx - r * 0.85f, cy - r * 0.6f)
                    close()
                }
                fill.color = Color.WHITE
                canvas.drawPath(p, fill)
            }
            PowerUp.MAGNET -> {
                stroke.color = Color.WHITE
                stroke.strokeWidth = r * 0.45f
                stroke.strokeCap = Paint.Cap.BUTT
                canvas.drawArc(RectF(cx - r * 0.75f, cy - r * 0.3f, cx + r * 0.75f, cy + r * 0.9f), 0f, 180f, false, stroke)
                canvas.drawLine(cx - r * 0.75f, cy + r * 0.3f, cx - r * 0.75f, cy - r * 0.8f, stroke)
                canvas.drawLine(cx + r * 0.75f, cy + r * 0.3f, cx + r * 0.75f, cy - r * 0.8f, stroke)
                stroke.color = 0xFFDDDDDD.toInt()
                canvas.drawLine(cx - r * 0.75f, cy - r * 0.45f, cx - r * 0.75f, cy - r * 0.8f, stroke)
                canvas.drawLine(cx + r * 0.75f, cy - r * 0.45f, cx + r * 0.75f, cy - r * 0.8f, stroke)
            }
            PowerUp.DOUBLE_COINS -> {
                textPaint.setShadowLayer(0f, 0f, 0f, 0)
                canvas.text("2x", cx, cy + r * 0.45f, r * 1.35f, Color.WHITE, Paint.Align.CENTER)
                textPaint.setShadowLayer(4f, 0f, 2f, 0xCC000000.toInt())
            }
        }
    }
}
