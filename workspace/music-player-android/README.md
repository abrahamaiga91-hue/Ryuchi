# Shinobi Music Player (Jetpack Compose + Media3)

Offline Android music player built under `com.shinobi.musicplayer` with **Jetpack Compose**, **Media3 ExoPlayer**, **JAudioTagger**, **Coil**, a 3D Spatial & Circular Seal Equalizer, and the **Makimono Parchment** ID3 tag editor.

## Architecture

- `app/build.gradle.kts` — Compose BOM, Media3 ExoPlayer & Session, JAudioTagger 3.0.1, Coil
- `app/src/main/AndroidManifest.xml` — Storage permissions & `PlaybackService` foreground media service
- `model/Song.kt` — Audio track data model with bitrate, sample rate, size, and MIME metadata
- `audio/AudioEffectsController.kt` — Android `Equalizer`, `BassBoost`, and `Virtualizer` (3D Spatial Audio)
- `service/PlaybackService.kt` — Media3 `MediaSessionService` bound to `AudioEffectsController`
- `ui/ShinobiAppRoot.kt` — Central invocation seal, `PulsingChakraButton`, 3D Seal EQ sheet, Makimono tag scroll, and technical specs dialog

## GitHub Actions CI Build

Pushing to `main` or `master` (or triggering **Actions -> Android CI Build**) automatically builds `app-debug.apk` using JDK 17 and Gradle 8.11.1, and publishes it as a workflow artifact (`shinobi-music-player-debug-apk`).
