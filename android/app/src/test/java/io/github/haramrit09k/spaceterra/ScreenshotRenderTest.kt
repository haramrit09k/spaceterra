package io.github.haramrit09k.spaceterra

import android.graphics.Bitmap
import android.graphics.Canvas
import android.view.MotionEvent
import androidx.test.core.app.ApplicationProvider
import io.github.haramrit09k.spaceterra.game.CoinPattern
import io.github.haramrit09k.spaceterra.game.GameWorld
import io.github.haramrit09k.spaceterra.game.GameWorld.Pickup
import io.github.haramrit09k.spaceterra.game.GameWorld.PowerUp
import io.github.haramrit09k.spaceterra.net.LeaderboardClient
import io.github.haramrit09k.spaceterra.scenes.GameOverScene
import io.github.haramrit09k.spaceterra.scenes.HangarScene
import io.github.haramrit09k.spaceterra.scenes.InstructionsScene
import io.github.haramrit09k.spaceterra.scenes.PlayScene
import org.junit.Assume.assumeTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode
import java.io.File

/**
 * Renders real game screens with Robolectric's native graphics, for PR previews
 * and store screenshots. Skipped unless SCREENSHOT_DIR is set:
 *   SCREENSHOT_DIR=/tmp/shots ./gradlew testDebugUnitTest --tests '*ScreenshotRenderTest*'
 */
@RunWith(RobolectricTestRunner::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(sdk = [34])
class ScreenshotRenderTest {
    private val outDir = System.getenv("SCREENSHOT_DIR")

    private fun newGame(widthPx: Int, heightPx: Int): Game {
        val context = ApplicationProvider.getApplicationContext<android.app.Application>()
        val prefs = Prefs(context).apply {
            playerName = "StarPilot"
            bestScore = 312
            coins = 1240
            setUpgradeLevel(PowerUp.SHIELD, 2)
            setUpgradeLevel(PowerUp.MAGNET, 1)
        }
        val leaderboard = LeaderboardClient("http://127.0.0.1:9")
        LeaderboardClient::class.java.getDeclaredField("top").apply {
            isAccessible = true
            set(leaderboard, listOf(
                LeaderboardClient.Entry("NovaRider", 642),
                LeaderboardClient.Entry("CometKid", 511),
                LeaderboardClient.Entry("StarPilot", 312),
                LeaderboardClient.Entry("Orbiter", 288),
                LeaderboardClient.Entry("MoonWalker", 201),
                LeaderboardClient.Entry("Astro_77", 154),
                LeaderboardClient.Entry("Guest", 96),
            ))
        }
        val host = object : Host {
            override fun askPlayerName(current: String?, onDone: (String) -> Unit) = onDone("StarPilot")
            override fun quit() {}
        }
        return Game(Assets(context), Audio(context, prefs), prefs, leaderboard, null, null, host, 2.625f).apply {
            resize(widthPx, heightPx)
            runTasks()
        }
    }

    private fun Game.save(name: String, widthPx: Int, heightPx: Int) {
        val bmp = Bitmap.createBitmap(widthPx, heightPx, Bitmap.Config.ARGB_8888)
        draw(Canvas(bmp))
        File(outDir, "$name.png").outputStream().use { bmp.compress(Bitmap.CompressFormat.PNG, 100, it) }
    }

    @Test
    fun renderScreens() {
        assumeTrue(outDir != null)
        File(outDir!!).mkdirs()
        val w = 1080
        val h = 2400

        val game = newGame(w, h)
        repeat(30) { game.update() }
        game.save("menu", w, h)

        game.go(PlayScene(game))
        game.touch(MotionEvent.ACTION_DOWN, 0, 450f, 1200f)
        game.runTasks()
        val scene = PlayScene::class.java.getDeclaredField("world").apply { isAccessible = true }
        val world = scene.get(currentScene(game)) as GameWorld
        repeat(220) {
            world.activePowerUps[PowerUp.SHIELD] = 400
            game.update()
        }
        world.activePowerUps[PowerUp.MAGNET] = 300
        // A few coin shapes and a power-up ahead of the rocket for the shot.
        world.rocks.clear()
        world.pickups.clear()
        val base = world.rocketY - world.rocksOffsetY
        world.addCoinPattern(CoinPattern.WAVE, base - 200f, 450f)
        world.addCoinPattern(CoinPattern.RING, base - 850f, 230f)
        world.addCoinPattern(CoinPattern.CHEVRON, base - 950f, 650f)
        world.addCoinPattern(CoinPattern.DIAMOND, base - 1250f, 450f)
        world.pickups += Pickup(world.rocketX - 160f, base - 650f, PowerUp.DOUBLE_COINS)
        repeat(3) { game.update() }
        game.save("gameplay", w, h)

        game.go(GameOverScene(game, 287, 46, false))
        repeat(10) { game.update() }
        game.save("game-over", w, h)

        game.go(HangarScene(game))
        game.save("hangar", w, h)

        game.go(InstructionsScene(game))
        repeat(20) { game.update() }
        game.save("instructions", w, h)
    }

    private fun currentScene(game: Game): Any =
        Game::class.java.getDeclaredField("scene").apply { isAccessible = true }.get(game)!!
}
