package io.github.haramrit09k.spaceterra

import android.app.Application
import io.github.haramrit09k.spaceterra.games.PlayGames

class SpaceTerraApp : Application() {
    override fun onCreate() {
        super.onCreate()
        PlayGames.initialize(this)
    }
}
