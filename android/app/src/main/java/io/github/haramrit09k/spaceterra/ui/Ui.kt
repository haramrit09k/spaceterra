package io.github.haramrit09k.spaceterra.ui

import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Rect
import android.graphics.RectF
import android.graphics.Typeface

const val YELLOW = 0xFFF8E22E.toInt()

private val boldFace: Typeface = Typeface.create("sans-serif-condensed", Typeface.BOLD)

val textPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
    typeface = boldFace
    setShadowLayer(4f, 0f, 2f, 0xCC000000.toInt())
}

val bitmapPaint = Paint(Paint.FILTER_BITMAP_FLAG or Paint.ANTI_ALIAS_FLAG)

private val shapePaint = Paint(Paint.ANTI_ALIAS_FLAG)

fun Canvas.text(
    value: String,
    x: Float,
    y: Float,
    size: Float,
    color: Int = YELLOW,
    align: Paint.Align = Paint.Align.LEFT,
) {
    textPaint.textSize = size
    textPaint.color = color
    textPaint.textAlign = align
    drawText(value, x, y, textPaint)
}

/** Draws [value] word-wrapped to [maxWidth]; returns the y below the last line. */
fun Canvas.paragraph(value: String, x: Float, y: Float, maxWidth: Float, size: Float, color: Int = YELLOW): Float {
    textPaint.textSize = size
    var lineY = y
    for (line in wrap(value, maxWidth, size)) {
        text(line, x, lineY, size, color)
        lineY += size * 1.25f
    }
    return lineY
}

fun wrap(value: String, maxWidth: Float, size: Float): List<String> {
    textPaint.textSize = size
    val lines = mutableListOf<String>()
    var current = ""
    for (word in value.split(' ')) {
        val candidate = if (current.isEmpty()) word else "$current $word"
        if (textPaint.measureText(candidate) <= maxWidth || current.isEmpty()) {
            current = candidate
        } else {
            lines += current
            current = word
        }
    }
    if (current.isNotEmpty()) lines += current
    return lines
}

fun ellipsize(value: String, maxWidth: Float, size: Float): String {
    textPaint.textSize = size
    if (textPaint.measureText(value) <= maxWidth) return value
    val count = textPaint.breakText(value, true, maxWidth - textPaint.measureText("…"), null)
    return value.take(count) + "…"
}

fun Canvas.bitmap(bmp: Bitmap, src: Rect?, dst: RectF, alpha: Int = 255) {
    bitmapPaint.alpha = alpha
    drawBitmap(bmp, src, dst, bitmapPaint)
    bitmapPaint.alpha = 255
}

/** Scales [bmp] to cover the whole [w] x [h] area, like CSS `background-size: cover`. */
fun Canvas.cover(bmp: Bitmap, w: Float, h: Float, dim: Int = 0) {
    val scale = maxOf(w / bmp.width, h / bmp.height)
    val dw = bmp.width * scale
    val dh = bmp.height * scale
    bitmap(bmp, null, RectF((w - dw) / 2, (h - dh) / 2, (w + dw) / 2, (h + dh) / 2))
    if (dim > 0) drawColor(Color.argb(dim, 0, 0, 0))
}

fun Canvas.panel(rect: RectF, fill: Int, stroke: Int = 0, strokeWidth: Float = 0f, radius: Float = 18f) {
    shapePaint.style = Paint.Style.FILL
    shapePaint.color = fill
    drawRoundRect(rect, radius, radius, shapePaint)
    if (stroke != 0) {
        shapePaint.style = Paint.Style.STROKE
        shapePaint.strokeWidth = strokeWidth
        shapePaint.color = stroke
        drawRoundRect(rect, radius, radius, shapePaint)
    }
}

fun Canvas.line(x1: Float, y1: Float, x2: Float, y2: Float, color: Int, width: Float) {
    shapePaint.style = Paint.Style.STROKE
    shapePaint.strokeWidth = width
    shapePaint.color = color
    drawLine(x1, y1, x2, y2, shapePaint)
}

/** A tappable region; scenes draw it themselves via [render]. */
class Button(
    val bounds: RectF,
    private val render: Canvas.(bounds: RectF, pressed: Boolean) -> Unit,
    val onClick: () -> Unit,
) {
    var visible = true
    var pressed = false

    fun contains(x: Float, y: Float): Boolean {
        val slop = 12f
        return visible && x >= bounds.left - slop && x <= bounds.right + slop &&
            y >= bounds.top - slop && y <= bounds.bottom + slop
    }

    fun draw(canvas: Canvas) {
        if (!visible) return
        if (pressed) {
            canvas.save()
            canvas.scale(0.94f, 0.94f, bounds.centerX(), bounds.centerY())
            canvas.render(bounds, true)
            canvas.restore()
        } else {
            canvas.render(bounds, false)
        }
    }

    companion object {
        fun image(bounds: RectF, bmp: Bitmap, onClick: () -> Unit) =
            Button(bounds, { b, _ -> bitmap(bmp, null, b) }, onClick)

        /** A rounded yellow pill matching the START / LEADERBOARD art. */
        fun pill(bounds: RectF, label: () -> String, size: Float = 34f, onClick: () -> Unit) =
            Button(bounds, { b, pressed ->
                panel(b, if (pressed) 0xFFE0C820.toInt() else YELLOW, 0xFFD8402A.toInt(), 5f, b.height() / 4)
                textPaint.setShadowLayer(0f, 0f, 0f, 0)
                text(label(), b.centerX(), b.centerY() + size * 0.36f, size, Color.BLACK, Paint.Align.CENTER)
                textPaint.setShadowLayer(4f, 0f, 2f, 0xCC000000.toInt())
            }, onClick)

        fun link(bounds: RectF, label: () -> String, size: Float = 28f, onClick: () -> Unit) =
            Button(bounds, { b, _ ->
                text(label(), b.centerX(), b.centerY() + size * 0.36f, size, Color.WHITE, Paint.Align.CENTER)
            }, onClick)
    }
}
