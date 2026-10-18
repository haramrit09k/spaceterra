# Space Terra for Android

A native Kotlin port of the web game. There is no WebView: the game runs its own
60 Hz loop and draws straight to a hardware-accelerated `SurfaceView`, reusing
the art and audio from `../public` (copied in at build time by the
`syncGameAssets` Gradle task).

The web game and the Heroku server are untouched. The app talks to the same
Socket.IO events (`fetch_score`, `send_score`) as the browser, so Android and web
players share one leaderboard. `.slugignore` keeps this folder out of the Heroku
slug.

## What's in the app

| Feature | Notes |
| --- | --- |
| Original gameplay | Same sine-wave rocket, asteroids, aliens, idle explosion. Hitboxes now match the sprites, and speed no longer depends on screen refresh rate. |
| Runner extras | Coins, three power-ups (shield, coin magnet, 2x coins), gradual speed ramp. |
| Hangar | Spend coins to make power-ups last longer (5 levels each, capped, so no new content is ever needed). |
| Continue after a crash | Pay coins (100, 200, 400, …) or, once per run, watch a rewarded ad. |
| Leaderboards | The existing web top 7, plus a Google Play Games leaderboard and 8 achievements. |
| Ads (AdMob) | Banner on menu screens only; never during play. Interstitials at most once every 4 runs **and** 3 minutes, never right after a rewarded ad. Rewarded ads are always opt-in (continue, double coins). Consent via Google's UMP form. |
| Font | Goldman (SIL OFL, `licenses/Goldman-OFL.txt`), the closest freely licensed match to *SF Distant Galaxy* used in the original button art. That font is free only for personal use, so it is not bundled. |

## Build

Requirements: JDK 17+ and the Android SDK (platform 36).

```bash
cd android
echo "sdk.dir=$ANDROID_HOME" > local.properties   # once
./gradlew assembleDebug          # app/build/outputs/apk/debug/app-debug.apk
./gradlew testDebugUnitTest      # game rules, ad pacing, upgrade prices
```

Debug builds install as `io.github.haramrit09k.spaceterra.debug` and always show Google's
**test ads**, so you can tap them freely.

Render the game screens to PNGs without a device (useful for store screenshots):

```bash
SCREENSHOT_DIR=/tmp/shots ./gradlew testDebugUnitTest --tests '*ScreenshotRenderTest*'
```

## Release configuration

Release values are Gradle properties. Put them in `~/.gradle/gradle.properties`
(never commit them), or pass them as `ORG_GRADLE_PROJECT_<name>` environment
variables, which is how the GitHub workflow does it.

| Property | What it is |
| --- | --- |
| `spaceterra.versionCode` / `spaceterra.versionName` | Bump `versionCode` for every upload. CI uses the run number. |
| `spaceterra.keystoreFile`, `keystorePassword`, `keyAlias`, `keyPassword` | Your upload key (see below). |
| `spaceterra.admobAppId` | `ca-app-pub-…~…` from AdMob. |
| `spaceterra.admobBannerId`, `admobInterstitialId`, `admobRewardedId` | `ca-app-pub-…/…` ad unit IDs. |
| `spaceterra.serverUrl` | Leaderboard server, defaults to `https://spaceterra.herokuapp.com`. |

If the AdMob values are missing, a release build falls back to test ads. The CI release
job refuses to build in that case.

Play Games IDs are public, so they live in [`play-games.properties`](play-games.properties).
While `app_id` is empty, the game runs without Play Games and hides its buttons.

## Publishing checklist

You only do this once. After that, an update is: bump the version, push a tag, upload the bundle.

1. **Google Play developer account** at <https://play.google.com/console>: a one-time US$25
   fee plus identity verification. New personal accounts must run a **closed test with at least
   12 testers for 14 days** before production access is granted, so recruit friends early.
2. **Upload key** (keep it and its passwords safe; Play App Signing holds the real signing key):
   ```bash
   keytool -genkeypair -v -keystore upload.jks -alias upload -keyalg RSA -keysize 2048 -validity 10000
   ```
3. **AdMob**: create an account at <https://admob.google.com>, add the Android app, then create
   one *Banner*, one *Interstitial* and one *Rewarded* ad unit. Under *Privacy & messaging*, create
   a GDPR message and a US state regulations message (the app shows them through UMP). Link
   AdMob to the Play app once it is published.
4. **app-ads.txt**: AdMob will ask you to publish
   `google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0` at the root of the website
   listed on your Play page. To serve it from the existing site, add that one line as
   `public/app-ads.txt`. It is a static file, so no server code changes.
5. **Play Games Services**: in Play Console go to *Grow users → Play Games Services → Setup*,
   create the game project, then the OAuth credentials (it needs the SHA-1 of the **app signing**
   key from *App integrity*, and your upload key for local testing). Create:
   - Leaderboard *High score* (integer, higher is better).
   - Achievements: *First flight* (finish a run), *Century* (score 100), *Cruiser* (250),
     *Ace* (500), *Legend* (1000), *Close call* (survive a hit with a shield),
     *Treasure hunter* (1000 coins total), *Fully upgraded* (max every Hangar item).

   Paste the IDs into `play-games.properties` and publish the Play Games configuration.
6. **Build the bundle** locally (`./gradlew bundleRelease`) or in CI: add the repo secrets
   `ANDROID_KEYSTORE_BASE64` (`base64 -w0 upload.jks`), `ANDROID_KEYSTORE_PASSWORD`,
   `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`, `ADMOB_APP_ID`, `ADMOB_BANNER_ID`,
   `ADMOB_INTERSTITIAL_ID` and `ADMOB_REWARDED_ID`, then push a tag like `android-v1.0.0`.
   The signed `.aab` appears as a workflow artifact.
7. **Store listing**: `store/play-icon-512.png` and `store/feature-graphic-1024x500.jpg` are
   ready. Use the screenshot renderer above for phone screenshots. Privacy policy URL:
   `https://spaceterra.herokuapp.com/privacy.html` (from `public/privacy.html`, once deployed).
8. **App content forms** in Play Console:
   - *Ads*: yes.
   - *Target audience*: 13+. A younger audience triggers the Families policy, which needs
     different ad settings.
   - *Data safety*: the app collects a user-chosen name and scores (shared publicly on the
     leaderboard), and AdMob collects device identifiers, approximate location (from IP),
     app interactions and diagnostics for advertising and analytics. Data is encrypted in transit.
   - *Content rating*: fill in the IARC questionnaire (cartoon violence: explosions).
9. **Release**: internal testing → closed testing (the 12 testers) → production.

## Keeping it alive

The game needs no content updates. Google does require apps to target a recent
Android version: roughly once a year, raise `compileSdk`/`targetSdk` and the
library versions in `app/build.gradle.kts`, run the tests, bump `versionName`,
and push a new `android-v*` tag. Apps that fall behind aren't removed, but new
users on newer phones stop seeing them.
