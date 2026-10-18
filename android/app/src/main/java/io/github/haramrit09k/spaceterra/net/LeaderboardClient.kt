package io.github.haramrit09k.spaceterra.net

import io.socket.client.IO
import io.socket.client.Socket
import io.socket.engineio.client.transports.WebSocket
import org.json.JSONArray
import org.json.JSONObject

/**
 * Talks to the same Socket.IO events the web client uses (see sockets/leaderboard.js):
 * `send_score` / `fetch_score` out, `rec_score` (top 7) back.
 */
class LeaderboardClient(serverUrl: String) {
    data class Entry(val username: String, val score: Int)

    enum class Status { CONNECTING, ONLINE, OFFLINE }

    @Volatile var status = Status.CONNECTING
        private set

    /** Latest top scores, or null until the server has answered. */
    @Volatile var top: List<Entry>? = null
        private set

    private val socket: Socket = IO.socket(
        serverUrl,
        IO.Options.builder()
            .setTransports(arrayOf(WebSocket.NAME))
            .setReconnectionDelay(2_000)
            .build(),
    )

    init {
        socket.on(Socket.EVENT_CONNECT) { status = Status.ONLINE }
        socket.on(Socket.EVENT_DISCONNECT) { status = Status.OFFLINE }
        socket.on(Socket.EVENT_CONNECT_ERROR) { status = Status.OFFLINE }
        socket.on("rec_score") { args ->
            (args.firstOrNull() as? JSONArray)?.let { top = parse(it) }
        }
    }

    fun connect() {
        if (!socket.connected()) socket.connect()
    }

    fun disconnect() {
        socket.disconnect()
    }

    /** Emits are buffered by socket.io until the connection is up. */
    fun fetch() {
        connect()
        socket.emit("fetch_score")
    }

    fun submit(username: String, score: Int) {
        connect()
        socket.emit("send_score", JSONObject().put("username", username).put("score", score))
    }

    companion object {
        const val MAX_ENTRIES = 7

        fun parse(array: JSONArray): List<Entry> = (0 until minOf(array.length(), MAX_ENTRIES)).mapNotNull { i ->
            val item = array.optJSONObject(i) ?: return@mapNotNull null
            val name = item.optString("username").takeUnless { it.isBlank() || it == "null" } ?: "Guest"
            Entry(name, item.optInt("score", 0))
        }
    }
}
