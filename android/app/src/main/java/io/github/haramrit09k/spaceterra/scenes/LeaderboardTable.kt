package io.github.haramrit09k.spaceterra.scenes

import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.RectF
import io.github.haramrit09k.spaceterra.net.LeaderboardClient
import io.github.haramrit09k.spaceterra.net.LeaderboardClient.Status
import io.github.haramrit09k.spaceterra.ui.YELLOW
import io.github.haramrit09k.spaceterra.ui.ellipsize
import io.github.haramrit09k.spaceterra.ui.line
import io.github.haramrit09k.spaceterra.ui.panel
import io.github.haramrit09k.spaceterra.ui.text

/** The "Sr No. / Name / Score" table from leaderboard2.png, drawn natively so it fits any screen. */
object LeaderboardTable {
    const val WIDTH = 800f
    private const val HEADER = 76f
    private const val ROW = 64f
    val HEIGHT = HEADER + ROW * LeaderboardClient.MAX_ENTRIES

    fun draw(canvas: Canvas, top: Float, client: LeaderboardClient, highlightName: String?) {
        val left = 50f
        val box = RectF(left, top, left + WIDTH, top + HEIGHT)
        canvas.panel(RectF(box).apply { inset(-8f, -8f) }, 0x33F8E22E, 0xAAF8E22E.toInt(), 4f, 22f)
        canvas.panel(box, 0xB0101A55.toInt(), 0xCCFFFFFF.toInt(), 2f, 14f)
        canvas.panel(RectF(box.left, box.top, box.right, box.top + HEADER), 0xCC5B7FD6.toInt(), radius = 14f)

        val rankX = left + 80f
        val nameX = left + 420f
        val scoreX = left + 700f
        canvas.line(left + 160f, top, left + 160f, box.bottom, 0x99FFFFFF.toInt(), 3f)
        canvas.line(left + 600f, top, left + 600f, box.bottom, 0x99FFFFFF.toInt(), 3f)
        val headerY = top + HEADER / 2 + 14f
        canvas.text("Rank", rankX, headerY, 38f, 0xFFFFFFFF.toInt(), Paint.Align.CENTER)
        canvas.text("Pilot", nameX, headerY, 38f, 0xFFFFFFFF.toInt(), Paint.Align.CENTER)
        canvas.text("Score", scoreX, headerY, 38f, 0xFFFFFFFF.toInt(), Paint.Align.CENTER)

        val entries = client.top
        for (i in 0 until LeaderboardClient.MAX_ENTRIES) {
            val rowTop = top + HEADER + i * ROW
            if (i > 0) canvas.line(left, rowTop, box.right, rowTop, 0x55FFFFFF, 2f)
            val entry = entries?.getOrNull(i) ?: continue
            if (highlightName != null && entry.username == highlightName) {
                canvas.panel(RectF(left + 4f, rowTop + 4f, box.right - 4f, rowTop + ROW - 4f), 0x44F8E22E, radius = 8f)
            }
            val y = rowTop + ROW / 2 + 11f
            canvas.text("${i + 1}", rankX, y, 32f, YELLOW, Paint.Align.CENTER)
            canvas.text(ellipsize(entry.username, 410f, 32f), nameX, y, 32f, 0xFFFFFFFF.toInt(), Paint.Align.CENTER)
            canvas.text("${entry.score}", scoreX, y, 32f, YELLOW, Paint.Align.CENTER)
        }

        val message = when {
            entries != null && entries.isEmpty() -> "No scores yet. Be the first!"
            entries != null -> null
            client.status == Status.OFFLINE -> "Leaderboard offline. Check your connection."
            else -> "Loading leaderboard…"
        }
        if (message != null) {
            canvas.text(message, left + WIDTH / 2, top + HEADER + ROW * 3.5f, 32f, 0xFFFFFFFF.toInt(), Paint.Align.CENTER)
        }
    }
}
