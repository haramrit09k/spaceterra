package io.github.haramrit09k.spaceterra

import android.content.res.AssetManager
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Rect

/** A sprite sheet laid out like Phaser's: equal frames, left to right, top to bottom. */
class Sheet(val bitmap: Bitmap, private val frameW: Int, private val frameH: Int) {
    private val columns = (bitmap.width / frameW).coerceAtLeast(1)
    val frameCount = columns * (bitmap.height / frameH).coerceAtLeast(1)

    fun src(frame: Int): Rect {
        val f = frame.mod(frameCount)
        val x = (f % columns) * frameW
        val y = (f / columns) * frameH
        return Rect(x, y, x + frameW, y + frameH)
    }
}

/** Game art copied from public/assets at build time (see syncGameAssets in app/build.gradle.kts). */
class Assets(assets: AssetManager) {
    private fun load(am: AssetManager, name: String): Bitmap =
        am.open("img/$name").use { BitmapFactory.decodeStream(it) }
            ?: error("Missing game asset img/$name")

    val menuBackground = load(assets, "SKYRED.PNG")
    val sky = load(assets, "sky5.jpg")
    val logo = load(assets, "logo.png")
    val startButton = load(assets, "buttons/START.png")
    val instructionsButton = load(assets, "buttons/INSTRUCTIONS.png")
    val leaderboardButton = load(assets, "buttons/LEADERBOARD.png")
    val home = load(assets, "home.png")
    val retry = load(assets, "return.png")
    val pause = load(assets, "pause.png")

    val rocket = Sheet(load(assets, "spaceship1.png"), 100, 150)
    val rocks = Sheet(load(assets, "asteroid1.png"), 72, 70)
    val alien = Sheet(load(assets, "alien_spritesheet.png"), 278, 275)
    val explosion = Sheet(load(assets, "flame_hit.png"), 512, 512)
    val musicToggle = Sheet(load(assets, "musicOnOff.png"), 100, 100)
    val fingerTap = Sheet(load(assets, "finger-tap-sp.png"), 782, 998)
}
