import java.util.Properties
import javax.inject.Inject

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

// Google's published sample IDs. They always serve test ads and are safe to
// ship in debug builds; release builds use the real IDs when provided.
val testAdmobAppId = "ca-app-pub-3940256099942544~3347511713"
val testBannerId = "ca-app-pub-3940256099942544/9214589741"
val testInterstitialId = "ca-app-pub-3940256099942544/1033173712"
val testRewardedId = "ca-app-pub-3940256099942544/5224354917"

fun prop(name: String): String =
    (findProperty("spaceterra.$name") as String?)?.trim().orEmpty()

fun propOr(name: String, fallback: String): String = prop(name).ifEmpty { fallback }

fun quoted(value: String) = "\"" + value.replace("\"", "\\\"") + "\""

// Play Games Services IDs live in a checked-in file because they are public.
val playGamesIds = Properties().apply {
    val file = rootProject.file("play-games.properties")
    if (file.exists()) file.reader().use { load(it) }
}
val playGamesKeys = listOf(
    "leaderboard_high_score", "achievement_first_flight", "achievement_score_100",
    "achievement_score_250", "achievement_score_500", "achievement_score_1000",
    "achievement_shield_save", "achievement_coins_1000", "achievement_fully_upgraded",
)

android {
    namespace = "io.github.haramrit09k.spaceterra"
    compileSdk = 36

    defaultConfig {
        applicationId = "io.github.haramrit09k.spaceterra"
        minSdk = 24
        targetSdk = 36
        versionCode = propOr("versionCode", "1").toInt()
        versionName = propOr("versionName", "1.0.0")

        resValue("string", "game_services_project_id", playGamesIds.getProperty("app_id", "").trim())
        playGamesKeys.forEach { key -> resValue("string", "pgs_$key", playGamesIds.getProperty(key, "").trim()) }

        buildConfigField("String", "SERVER_URL", quoted(propOr("serverUrl", "https://spaceterra.herokuapp.com")))
    }

    signingConfigs {
        create("release") {
            val storePath = prop("keystoreFile")
            if (storePath.isNotEmpty()) {
                storeFile = file(storePath)
                storePassword = prop("keystorePassword")
                keyAlias = prop("keyAlias")
                keyPassword = prop("keyPassword")
            }
        }
    }

    buildTypes {
        debug {
            applicationIdSuffix = ".debug"
            manifestPlaceholders["admobAppId"] = testAdmobAppId
            buildConfigField("String", "BANNER_AD_UNIT", quoted(testBannerId))
            buildConfigField("String", "INTERSTITIAL_AD_UNIT", quoted(testInterstitialId))
            buildConfigField("String", "REWARDED_AD_UNIT", quoted(testRewardedId))
        }
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
            if (prop("keystoreFile").isNotEmpty()) {
                signingConfig = signingConfigs.getByName("release")
            }
            manifestPlaceholders["admobAppId"] = propOr("admobAppId", testAdmobAppId)
            buildConfigField("String", "BANNER_AD_UNIT", quoted(propOr("admobBannerId", testBannerId)))
            buildConfigField("String", "INTERSTITIAL_AD_UNIT", quoted(propOr("admobInterstitialId", testInterstitialId)))
            buildConfigField("String", "REWARDED_AD_UNIT", quoted(propOr("admobRewardedId", testRewardedId)))
        }
    }

    buildFeatures {
        buildConfig = true
        resValues = true
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    testOptions {
        unitTests.isIncludeAndroidResources = true
    }
}

kotlin {
    compilerOptions {
        jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17)
    }
}

/**
 * Copies the game art and audio from the web client (../public) into the APK so
 * both versions of the game share one set of source files.
 */
abstract class SyncGameAssets : DefaultTask() {
    @get:InputFiles
    abstract val webFiles: ConfigurableFileCollection

    @get:Internal
    abstract val webRoot: DirectoryProperty

    @get:OutputDirectory
    abstract val outputDir: DirectoryProperty

    @get:Inject
    abstract val fs: FileSystemOperations

    @TaskAction
    fun sync() {
        val root = webRoot.get()
        fs.sync {
            from(root.dir("assets")) {
                include(
                    "SKYRED.PNG", "Space Terra LOGO4.png", "alien_spritesheet.png", "asteroid1.png",
                    "flame_hit.png", "finger-tap-sp.png", "home.png", "return.png", "musicOnOff.png",
                    "pause.png", "spaceship1.png", "sky5.jpg",
                )
                rename("Space Terra LOGO4.png", "logo.png")
                into("img")
            }
            from(root.dir("media")) {
                include("music.mp3", "explosion.ogg")
                into("audio")
            }
            into(outputDir)
        }
    }
}

val webRootDir = rootProject.layout.projectDirectory.dir("../public")
val syncGameAssets = tasks.register<SyncGameAssets>("syncGameAssets") {
    webRoot.set(webRootDir)
    webFiles.from(webRootDir.dir("assets"), webRootDir.dir("media"))
}

androidComponents {
    onVariants { variant ->
        variant.sources.assets?.addGeneratedSourceDirectory(syncGameAssets, SyncGameAssets::outputDir)
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.17.0")
    implementation("androidx.activity:activity-ktx:1.11.0")
    implementation("com.google.android.gms:play-services-ads:24.7.0")
    implementation("com.google.android.ump:user-messaging-platform:3.2.0")
    implementation("com.google.android.gms:play-services-games-v2:21.0.0")
    implementation("io.socket:socket.io-client:2.1.2") {
        // Android ships its own org.json.
        exclude(group = "org.json", module = "json")
    }

    testImplementation("junit:junit:4.13.2")
    testImplementation("org.robolectric:robolectric:4.17")
    testImplementation("androidx.test:core-ktx:1.7.0")
}
