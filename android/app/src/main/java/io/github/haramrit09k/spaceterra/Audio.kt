package io.github.haramrit09k.spaceterra

import android.content.Context
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.media.SoundPool

/** Looping background music plus the explosion effect, honouring the saved mute setting. */
class Audio(context: Context, private val prefs: Prefs) {
    private val music: MediaPlayer? = runCatching {
        context.assets.openFd("audio/music.mp3").use { fd ->
            MediaPlayer().apply {
                setAudioAttributes(gameAttributes)
                setDataSource(fd.fileDescriptor, fd.startOffset, fd.length)
                isLooping = true
                prepare()
            }
        }
    }.getOrNull()

    private val effects = SoundPool.Builder().setMaxStreams(2).setAudioAttributes(gameAttributes).build()
    private val explosionId = runCatching {
        context.assets.openFd("audio/explosion.ogg").use { effects.load(it, 1) }
    }.getOrDefault(0)

    private var foreground = false
    private var suspended = false

    val muted get() = prefs.muted

    fun toggleMute() {
        prefs.muted = !prefs.muted
        refresh()
    }

    fun playExplosion() {
        if (!muted && explosionId != 0) effects.play(explosionId, 1f, 1f, 1, 0, 1f)
    }

    fun onResume() {
        foreground = true
        refresh()
    }

    fun onPause() {
        foreground = false
        refresh()
    }

    /** Silences the music while a full-screen ad plays. */
    fun setSuspended(value: Boolean) {
        suspended = value
        refresh()
    }

    fun release() {
        music?.release()
        effects.release()
    }

    private fun refresh() {
        val player = music ?: return
        val shouldPlay = foreground && !suspended && !muted
        if (shouldPlay && !player.isPlaying) player.start()
        if (!shouldPlay && player.isPlaying) player.pause()
    }

    private companion object {
        val gameAttributes: AudioAttributes = AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_GAME)
            .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
            .build()
    }
}
