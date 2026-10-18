# socket.io-client / engine.io-client use OkHttp and reflection-free JSON, but
# keep their public API so R8 does not strip event handling classes.
-keep class io.socket.** { *; }
-dontwarn io.socket.**
-dontwarn okhttp3.**
-dontwarn okio.**
