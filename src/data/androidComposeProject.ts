import { AndroidFileId } from '../types/music';

export const ANDROID_PROJECT_FILES: Record<AndroidFileId, string> = {
  '.github/workflows/android-build.yml': `name: Android CI Build

on:
  push:
    branches: [ main, master ]
  pull_request:
    branches: [ main, master ]
  workflow_dispatch:

jobs:
  build-debug-apk:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Set up JDK 17
        uses: actions/setup-java@v4
        with:
          java-version: '17'
          distribution: 'temurin'

      - name: Set up Gradle
        uses: gradle/actions/setup-gradle@v4
        with:
          gradle-version: '8.11.1'

      - name: Build Debug APK
        run: gradle assembleDebug --stacktrace

      - name: Upload Debug APK Artifact
        uses: actions/upload-artifact@v4
        with:
          name: shinobi-music-player-debug-apk
          path: app/build/outputs/apk/debug/app-debug.apk
`,

  '.gitignore': `*.iml
.gradle
/local.properties
/.idea/caches
/.idea/libraries
/.idea/modules.xml
/.idea/workspace.xml
/.idea/navEditor.xml
/.idea/assetWizardSettings.xml
.DS_Store
/build
/app/build
/captures
.externalNativeBuild
.cxx
local.properties
`,

  'README.md': `# Shinobi Music Player (Jetpack Compose + Media3)

Offline Android music player built under \`com.shinobi.musicplayer\` with **Jetpack Compose**, **Media3 ExoPlayer**, **JAudioTagger**, **Coil**, a 3D Spatial & Circular Seal Equalizer, and the **Makimono Parchment** ID3 tag editor.

## Architecture

- \`app/build.gradle.kts\` — Compose BOM, Media3 ExoPlayer & Session, JAudioTagger 3.0.1, Coil
- \`app/src/main/AndroidManifest.xml\` — Storage permissions & \`PlaybackService\` foreground media service
- \`model/Song.kt\` — Audio track data model with bitrate, sample rate, size, and MIME metadata
- \`audio/AudioEffectsController.kt\` — Android \`Equalizer\`, \`BassBoost\`, and \`Virtualizer\` (3D Spatial Audio)
- \`service/PlaybackService.kt\` — Media3 \`MediaSessionService\` bound to \`AudioEffectsController\`
- \`ui/ShinobiAppRoot.kt\` — Central invocation seal, \`PulsingChakraButton\`, 3D Seal EQ sheet, Makimono tag scroll, and technical specs dialog

## GitHub Actions CI Build

Pushing to \`main\` or \`master\` (or triggering **Actions -> Android CI Build**) automatically builds \`app-debug.apk\` using JDK 17 and Gradle 8.11.1, and publishes it as a workflow artifact (\`shinobi-music-player-debug-apk\`).
`,

  'settings.gradle.kts': `pluginManagement {
    repositories {
        google {
            content {
                includeGroupByRegex("com\\\\.android.*")
                includeGroupByRegex("com\\\\.google.*")
                includeGroupByRegex("androidx.*")
            }
        }
        mavenCentral()
        gradlePluginPortal()
    }
}

dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
        maven { url = uri("https://jitpack.io") }
    }
}

rootProject.name = "ShinobiMusicPlayer"
include(":app")
`,

  'build.gradle.kts': `plugins {
    alias(libs.plugins.android.application) apply false
    alias(libs.plugins.kotlin.android) apply false
    alias(libs.plugins.kotlin.compose) apply false
}
`,

  'gradle/libs.versions.toml': `[versions]
agp = "8.7.3"
kotlin = "2.0.21"
coreKtx = "1.15.0"
activityCompose = "1.9.3"
composeBom = "2024.12.01"

[libraries]
androidx-core-ktx = { group = "androidx.core", name = "core-ktx", version.ref = "coreKtx" }
androidx-activity-compose = { group = "androidx.activity", name = "activity-compose", version.ref = "activityCompose" }
androidx-compose-bom = { group = "androidx.compose", name = "compose-bom", version.ref = "composeBom" }
androidx-ui = { group = "androidx.compose.ui", name = "ui" }
androidx-ui-graphics = { group = "androidx.compose.ui", name = "ui-graphics" }
androidx-ui-tooling = { group = "androidx.compose.ui", name = "ui-tooling" }
androidx-ui-tooling-preview = { group = "androidx.compose.ui", name = "ui-tooling-preview" }
androidx-material3 = { group = "androidx.compose.material3", name = "material3" }

[plugins]
android-application = { id = "com.android.application", version.ref = "agp" }
kotlin-android = { id = "org.jetbrains.kotlin.android", version.ref = "kotlin" }
kotlin-compose = { id = "org.jetbrains.kotlin.plugin.compose", version.ref = "kotlin" }
`,

  'gradle.properties': `org.gradle.jvmargs=-Xmx2048m -Dfile.encoding=UTF-8
android.useAndroidX=true
kotlin.code.style=official
android.nonTransitiveRClass=true
`,

  'app/build.gradle.kts': `plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
}

android {
    namespace = "com.shinobi.musicplayer"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.shinobi.musicplayer"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "1.0"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }

    buildFeatures {
        compose = true
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }
}

dependencies {
    val media3Version = "1.11.1"

    implementation(libs.androidx.core.ktx)
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.8.7")
    implementation(libs.androidx.activity.compose)
    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.ui)
    implementation(libs.androidx.ui.graphics)
    implementation(libs.androidx.ui.tooling.preview)
    implementation(libs.androidx.material3)
    implementation("androidx.compose.material:material-icons-extended:1.7.5")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.8.7")

    // Media3 (ExoPlayer + MediaSessionService)
    implementation("androidx.media3:media3-exoplayer:\$media3Version")
    implementation("androidx.media3:media3-session:\$media3Version")
    implementation("androidx.media3:media3-common:\$media3Version")

    // JAudioTagger pour l'éditeur de tags ID3
    implementation("net.jthink:jaudiotagger:3.0.1")

    // Coil pour les pochettes d'album
    implementation("io.coil-kt:coil-compose:2.7.0")

    debugImplementation(libs.androidx.ui.tooling)
}
`,

  'AndroidManifest.xml': `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <uses-permission android:name="android.permission.READ_MEDIA_AUDIO" />
    <uses-permission
        android:name="android.permission.READ_EXTERNAL_STORAGE"
        android:maxSdkVersion="32" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK" />
    <uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />

    <application
        android:allowBackup="true"
        android:label="Shinobi Music Player"
        android:supportsRtl="true"
        android:theme="@style/Theme.ShinobiMusicPlayer">

        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:theme="@style/Theme.ShinobiMusicPlayer">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

        <service
            android:name=".service.PlaybackService"
            android:foregroundServiceType="mediaPlayback"
            android:exported="true">
            <intent-filter>
                <action android:name="androidx.media3.session.MediaSessionService" />
            </intent-filter>
        </service>
    </application>
</manifest>
`,

  'res/values/themes.xml': `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <style name="Theme.ShinobiMusicPlayer" parent="android:Theme.Material.NoActionBar" />
</resources>
`,

  'model/Song.kt': `package com.shinobi.musicplayer.model

import android.net.Uri

data class Song(
    val id: Long,
    val uri: Uri,
    val title: String,
    val artist: String,
    val album: String,
    val genre: String,
    val year: String,
    val durationMs: Long,
    val filePath: String,
    val fileSizeBytes: Long,
    val mimeType: String,
    val bitrate: String = "Unknown",
    val sampleRate: String = "Unknown"
)
`,

  'MainActivity.kt': `package com.shinobi.musicplayer

import android.Manifest
import android.app.Activity
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.IntentSenderRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.core.content.ContextCompat
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.media3.common.MediaItem
import androidx.media3.common.MediaMetadata
import com.shinobi.musicplayer.audio.EqualizerUiState
import com.shinobi.musicplayer.audio.PlayerConnection
import com.shinobi.musicplayer.service.PlaybackService
import com.shinobi.musicplayer.ui.ShinobiAppRoot
import com.shinobi.musicplayer.viewmodel.MusicPlayerViewModel
import kotlinx.coroutines.delay

private val ShinobiDark = Color(0xFF121418)
private val ChakraOrange = Color(0xFFFF5722)
private val SealSurface = Color(0xFF1E222B)

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        setContent {
            val context = LocalContext.current
            val musicViewModel: MusicPlayerViewModel = viewModel()
            val playerConnection = remember { PlayerConnection(context) }

            val audioPermission = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                Manifest.permission.READ_MEDIA_AUDIO
            } else {
                Manifest.permission.READ_EXTERNAL_STORAGE
            }

            var hasStoragePermission by remember {
                mutableStateOf(
                    ContextCompat.checkSelfPermission(context, audioPermission) ==
                        PackageManager.PERMISSION_GRANTED
                )
            }

            val permissionLauncher = rememberLauncherForActivityResult(
                ActivityResultContracts.RequestPermission()
            ) { granted ->
                hasStoragePermission = granted
            }

            val songs by musicViewModel.songs.collectAsState()
            val pendingSecurityIntent by musicViewModel.pendingSecurityIntent.collectAsState()
            val mediaController by playerConnection.mediaController.collectAsState()
            val effectsController = PlaybackService.effectsController
            val eqState = effectsController?.uiState?.collectAsState()?.value ?: EqualizerUiState()

            var isPlaying by remember { mutableStateOf(false) }
            var currentIndex by remember { mutableIntStateOf(0) }
            var currentPositionMs by remember { mutableLongStateOf(0L) }
            var onTagSavedCallback by remember { mutableStateOf<(() -> Unit)?>(null) }

            val securityLauncher = rememberLauncherForActivityResult(
                ActivityResultContracts.StartIntentSenderForResult()
            ) { activityResult ->
                musicViewModel.clearPendingSecurityIntent()
                if (activityResult.resultCode == Activity.RESULT_OK) {
                    musicViewModel.retryPendingTagUpdate {
                        onTagSavedCallback?.invoke()
                    }
                }
            }

            LaunchedEffect(pendingSecurityIntent) {
                val intentSender = pendingSecurityIntent ?: return@LaunchedEffect
                securityLauncher.launch(IntentSenderRequest.Builder(intentSender).build())
            }

            LaunchedEffect(Unit) {
                if (!hasStoragePermission) {
                    permissionLauncher.launch(audioPermission)
                }
            }

            DisposableEffect(playerConnection) {
                playerConnection.connect()
                onDispose {
                    playerConnection.disconnect()
                }
            }

            LaunchedEffect(hasStoragePermission) {
                if (hasStoragePermission && songs.isEmpty()) {
                    musicViewModel.loadDeviceSongs()
                }
            }

            LaunchedEffect(songs, mediaController) {
                val controller = mediaController ?: return@LaunchedEffect
                if (songs.isNotEmpty() && controller.mediaItemCount == 0) {
                    val items = songs.map { song ->
                        MediaItem.Builder()
                            .setMediaId(song.id.toString())
                            .setUri(song.uri)
                            .setMediaMetadata(
                                MediaMetadata.Builder()
                                    .setTitle(song.title)
                                    .setArtist(song.artist)
                                    .setAlbumTitle(song.album)
                                    .build()
                            )
                            .build()
                    }
                    controller.setMediaItems(items)
                    controller.prepare()
                }
            }

            LaunchedEffect(mediaController) {
                while (mediaController != null) {
                    val controller = mediaController ?: break
                    isPlaying = controller.isPlaying
                    currentIndex = controller.currentMediaItemIndex
                    currentPositionMs = controller.currentPosition.coerceAtLeast(0L)
                    delay(250L)
                }
            }

            val currentSong = songs.getOrNull(currentIndex)

            MaterialTheme(
                colorScheme = darkColorScheme(
                    background = ShinobiDark,
                    surface = SealSurface,
                    primary = ChakraOrange,
                    onPrimary = Color.White
                )
            ) {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    ShinobiAppRoot(
                        song = currentSong,
                        isPlaying = isPlaying,
                        currentPositionMs = currentPositionMs,
                        eqState = eqState,
                        onPlayPauseClick = {
                            mediaController?.let { if (it.isPlaying) it.pause() else it.play() }
                        },
                        onNextClick = { mediaController?.seekToNextMediaItem() },
                        onPreviousClick = { mediaController?.seekToPreviousMediaItem() },
                        onSeek = { positionMs ->
                            currentPositionMs = positionMs
                            mediaController?.seekTo(positionMs)
                        },
                        onToggleEqualizer = { effectsController?.setEnabled(it) },
                        onBandLevelChanged = { index, level ->
                            effectsController?.setBandLevel(index, level)
                        },
                        onSpatialChanged = { effectsController?.setSpatialAudio(it) },
                        onBassChanged = { effectsController?.setBassBoost(it) },
                        onSaveTags = { song, title, artist, album, year, genre, onComplete ->
                            onTagSavedCallback = onComplete
                            musicViewModel.saveSongTags(
                                currentSong = song,
                                newTitle = title,
                                newArtist = artist,
                                newAlbum = album,
                                newYear = year,
                                newGenre = genre,
                                onSuccess = onComplete
                            )
                        }
                    )
                }
            }
        }
    }
}
`,

  'service/PlaybackService.kt': `package com.shinobi.musicplayer.service

import androidx.annotation.OptIn
import androidx.media3.common.AudioAttributes
import androidx.media3.common.C
import androidx.media3.common.Player
import androidx.media3.common.util.UnstableApi
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.session.MediaSession
import androidx.media3.session.MediaSessionService
import com.shinobi.musicplayer.audio.AudioEffectsController

class PlaybackService : MediaSessionService() {
    private var mediaSession: MediaSession? = null
    private lateinit var player: ExoPlayer

    companion object {
        var effectsController: AudioEffectsController? = null
            private set
    }

    @OptIn(UnstableApi::class)
    override fun onCreate() {
        super.onCreate()
        val audioAttributes = AudioAttributes.Builder()
            .setUsage(C.USAGE_MEDIA)
            .setContentType(C.AUDIO_CONTENT_TYPE_MUSIC)
            .build()

        player = ExoPlayer.Builder(this)
            .setAudioAttributes(audioAttributes, true)
            .setHandleAudioBecomingNoisy(true)
            .build()

        effectsController = AudioEffectsController(this).apply {
            attachToAudioSession(player.audioSessionId)
        }

        player.addListener(object : Player.Listener {
            override fun onAudioSessionIdChanged(audioSessionId: Int) {
                effectsController?.attachToAudioSession(audioSessionId)
            }
        })

        mediaSession = MediaSession.Builder(this, player).build()
    }

    override fun onGetSession(controllerInfo: MediaSession.ControllerInfo): MediaSession? = mediaSession

    override fun onDestroy() {
        effectsController?.release()
        effectsController = null
        mediaSession?.run {
            player.release()
            release()
            mediaSession = null
        }
        super.onDestroy()
    }
}
`,

  'audio/PlayerConnection.kt': `package com.shinobi.musicplayer.audio

import android.content.ComponentName
import android.content.Context
import androidx.core.content.ContextCompat
import androidx.media3.common.MediaItem
import androidx.media3.common.MediaMetadata
import androidx.media3.session.MediaController
import androidx.media3.session.SessionToken
import com.google.common.util.concurrent.ListenableFuture
import com.shinobi.musicplayer.model.Song
import com.shinobi.musicplayer.service.PlaybackService
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

class PlayerConnection(context: Context) {

    private val appContext = context.applicationContext
    private var controllerFuture: ListenableFuture<MediaController>? = null

    private val _mediaController = MutableStateFlow<MediaController?>(null)
    val mediaController: StateFlow<MediaController?> = _mediaController.asStateFlow()

    fun connect() {
        val sessionToken = SessionToken(
            appContext,
            ComponentName(appContext, PlaybackService::class.java)
        )
        controllerFuture = MediaController.Builder(appContext, sessionToken).buildAsync()
        controllerFuture?.addListener({
            _mediaController.value = controllerFuture?.get()
        }, ContextCompat.getMainExecutor(appContext))
    }

    fun playPlaylist(songs: List<Song>, startIndex: Int = 0) {
        val controller = _mediaController.value ?: return
        val mediaItems = songs.map { song ->
            MediaItem.Builder()
                .setMediaId(song.id.toString())
                .setUri(song.uri)
                .setMediaMetadata(
                    MediaMetadata.Builder()
                        .setTitle(song.title)
                        .setArtist(song.artist)
                        .setAlbumTitle(song.album)
                        .build()
                )
                .build()
        }
        controller.setMediaItems(mediaItems, startIndex, 0L)
        controller.prepare()
        controller.play()
    }

    fun disconnect() {
        controllerFuture?.let { MediaController.releaseFuture(it) }
        _mediaController.value = null
    }
}
`,

  'audio/AudioEffectsController.kt': `package com.shinobi.musicplayer.audio

import android.content.Context
import android.media.audiofx.BassBoost
import android.media.audiofx.Equalizer
import android.media.audiofx.Virtualizer
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update

data class EqualizerBand(
    val index: Short,
    val centerFreqHz: Int,
    val label: String,
    val currentLevelMb: Short
)

data class EqualizerUiState(
    val isEnabled: Boolean = false,
    val minLevelMb: Short = -1500,
    val maxLevelMb: Short = 1500,
    val bands: List<EqualizerBand> = emptyList(),
    val presets: List<String> = emptyList(),
    val selectedPresetIndex: Int = -1,
    val bassBoostStrength: Short = 0,
    val spatialAudioStrength: Short = 0
)

class AudioEffectsController(context: Context) {
    private val prefs = context.getSharedPreferences("shinobi_eq", Context.MODE_PRIVATE)
    private var equalizer: Equalizer? = null
    private var bassBoost: BassBoost? = null
    private var virtualizer: Virtualizer? = null

    private val _uiState = MutableStateFlow(EqualizerUiState())
    val uiState: StateFlow<EqualizerUiState> = _uiState.asStateFlow()

    fun attachToAudioSession(audioSessionId: Int) {
        if (audioSessionId == 0) return
        release()
        try {
            val eq = Equalizer(0, audioSessionId)
            val bass = BassBoost(0, audioSessionId)
            val virt = Virtualizer(0, audioSessionId)

            equalizer = eq
            bassBoost = bass
            virtualizer = virt

            val isEnabled = prefs.getBoolean("eq_enabled", false)
            eq.enabled = isEnabled
            bass.enabled = isEnabled
            virt.enabled = isEnabled

            val range = eq.bandLevelRange
            val minLevel = range[0]
            val maxLevel = range[1]

            val presetCount = eq.numberOfPresets.toInt()
            val presetNames = (0 until presetCount).map { eq.getPresetName(it.toShort()) }
            val savedPreset = prefs.getInt("eq_preset", -1)

            if (savedPreset in 0 until presetCount) {
                eq.usePreset(savedPreset.toShort())
            } else {
                for (i in 0 until eq.numberOfBands.toInt()) {
                    val savedLevel = prefs.getInt("band_\$i", 0).toShort()
                    eq.setBandLevel(i.toShort(), savedLevel.coerceIn(minLevel, maxLevel))
                }
            }

            val savedBass = prefs.getInt("bass_strength", 0).toShort()
            if (bass.strengthSupported) {
                bass.setStrength(savedBass.coerceIn(0.toShort(), 2000.toShort()))
            }

            val savedSpatial = prefs.getInt("spatial_strength", 0).toShort()
            if (virt.strengthSupported) {
                virt.setStrength(savedSpatial.coerceIn(0.toShort(), 1000.toShort()))
            }

            _uiState.value = EqualizerUiState(
                isEnabled = isEnabled,
                minLevelMb = minLevel,
                maxLevelMb = maxLevel,
                bands = buildBandList(eq),
                presets = presetNames,
                selectedPresetIndex = savedPreset,
                bassBoostStrength = savedBass,
                spatialAudioStrength = savedSpatial
            )
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    fun setEnabled(enabled: Boolean) {
        equalizer?.enabled = enabled
        bassBoost?.enabled = enabled
        virtualizer?.enabled = enabled
        prefs.edit().putBoolean("eq_enabled", enabled).apply()
        _uiState.update { it.copy(isEnabled = enabled) }
    }

    fun setBandLevel(bandIndex: Short, levelMb: Short) {
        val eq = equalizer ?: return
        val clamped = levelMb.coerceIn(_uiState.value.minLevelMb, _uiState.value.maxLevelMb)
        eq.setBandLevel(bandIndex, clamped)
        prefs.edit()
            .putInt("band_\$bandIndex", clamped.toInt())
            .putInt("eq_preset", -1)
            .apply()
        _uiState.update { it.copy(selectedPresetIndex = -1, bands = buildBandList(eq)) }
    }

    fun setBassBoost(strength: Short) {
        val bass = bassBoost ?: return
        val clamped = strength.coerceIn(0.toShort(), 2000.toShort())
        if (bass.strengthSupported) {
            bass.setStrength(clamped)
        }
        prefs.edit().putInt("bass_strength", clamped.toInt()).apply()
        _uiState.update { it.copy(bassBoostStrength = clamped) }
    }

    fun setSpatialAudio(strength: Short) {
        val virt = virtualizer ?: return
        val clamped = strength.coerceIn(0.toShort(), 1000.toShort())
        if (virt.strengthSupported) {
            virt.setStrength(clamped)
        }
        prefs.edit().putInt("spatial_strength", clamped.toInt()).apply()
        _uiState.update { it.copy(spatialAudioStrength = clamped) }
    }

    private fun buildBandList(eq: Equalizer): List<EqualizerBand> {
        return (0 until eq.numberOfBands.toInt()).map { i ->
            val index = i.toShort()
            val hz = eq.getCenterFreq(index) / 1000
            EqualizerBand(
                index = index,
                centerFreqHz = hz,
                label = if (hz >= 1000) "\${hz / 1000}kHz" else "\${hz}Hz",
                currentLevelMb = eq.getBandLevel(index)
            )
        }
    }

    fun release() {
        equalizer?.release()
        bassBoost?.release()
        virtualizer?.release()
        equalizer = null
        bassBoost = null
        virtualizer = null
    }
}
`,

  'data/AudioRepository.kt': `package com.shinobi.musicplayer.data

import android.content.ContentUris
import android.content.Context
import android.media.MediaMetadataRetriever
import android.provider.MediaStore
import com.shinobi.musicplayer.model.Song
import java.io.File

class AudioRepository(private val context: Context) {

    fun fetchDeviceSongs(): List<Song> {
        val songs = mutableListOf<Song>()
        val collection = MediaStore.Audio.Media.EXTERNAL_CONTENT_URI

        val projection = arrayOf(
            MediaStore.Audio.Media._ID,
            MediaStore.Audio.Media.TITLE,
            MediaStore.Audio.Media.ARTIST,
            MediaStore.Audio.Media.ALBUM,
            MediaStore.Audio.Media.DURATION,
            MediaStore.Audio.Media.SIZE,
            MediaStore.Audio.Media.DATA,
            MediaStore.Audio.Media.MIME_TYPE,
            MediaStore.Audio.Media.YEAR
        )

        val selection = "\${MediaStore.Audio.Media.IS_MUSIC} != 0 AND \${MediaStore.Audio.Media.DURATION} >= 30000"
        val sortOrder = "\${MediaStore.Audio.Media.TITLE} ASC"

        context.contentResolver.query(
            collection,
            projection,
            selection,
            null,
            sortOrder
        )?.use { cursor ->
            val idColumn = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media._ID)
            val titleColumn = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.TITLE)
            val artistColumn = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.ARTIST)
            val albumColumn = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.ALBUM)
            val durationColumn = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.DURATION)
            val sizeColumn = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.SIZE)
            val dataColumn = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.DATA)
            val mimeColumn = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.MIME_TYPE)
            val yearColumn = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.YEAR)

            while (cursor.moveToNext()) {
                val id = cursor.getLong(idColumn)
                val title = cursor.getString(titleColumn) ?: "Unknown Title"
                val artist = cursor.getString(artistColumn) ?: "Unknown Artist"
                val album = cursor.getString(albumColumn) ?: "Unknown Album"
                val duration = cursor.getLong(durationColumn)
                val sizeBytes = cursor.getLong(sizeColumn)
                val filePath = cursor.getString(dataColumn) ?: ""
                val mimeType = cursor.getString(mimeColumn) ?: "audio/mpeg"
                val year = cursor.getString(yearColumn) ?: ""

                val contentUri = ContentUris.withAppendedId(collection, id)
                val (bitrate, sampleRate) = extractTechnicalMetadata(filePath)

                songs.add(
                    Song(
                        id = id,
                        uri = contentUri,
                        title = title,
                        artist = artist,
                        album = album,
                        genre = "Unknown",
                        year = year,
                        durationMs = duration,
                        filePath = filePath,
                        fileSizeBytes = sizeBytes,
                        mimeType = mimeType,
                        bitrate = bitrate,
                        sampleRate = sampleRate
                    )
                )
            }
        }

        return songs
    }

    private data class TechSpecs(val bitrate: String, val sampleRate: String)

    private fun extractTechnicalMetadata(filePath: String): TechSpecs {
        val retriever = MediaMetadataRetriever()
        try {
            if (File(filePath).exists()) {
                retriever.setDataSource(filePath)

                val bitrateStr = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_BITRATE)
                val bitrateKbps = if (!bitrateStr.isNullOrEmpty()) {
                    val kbps = bitrateStr.toIntOrNull()?.div(1000)
                    if (kbps != null && kbps > 0) "\$kbps kbps" else "Unknown"
                } else {
                    "Unknown"
                }

                val sampleRateHz = retriever.extractMetadata(19)
                val sampleRateFormatted = if (!sampleRateHz.isNullOrEmpty()) {
                    val hz = sampleRateHz.toIntOrNull()
                    if (hz != null) {
                        if (hz >= 1000) String.format("%.1f kHz", hz / 1000.0) else "\$hz Hz"
                    } else {
                        "Unknown"
                    }
                } else {
                    "Unknown"
                }

                return TechSpecs(bitrate = bitrateKbps, sampleRate = sampleRateFormatted)
            }
        } catch (e: Exception) {
            e.printStackTrace()
        } finally {
            try {
                retriever.release()
            } catch (_: Exception) {}
        }
        return TechSpecs("Unknown", "Unknown")
    }
}
`,

  'data/TagEditorRepository.kt': `package com.shinobi.musicplayer.data

import android.app.Activity
import android.app.RecoverableSecurityException
import android.content.Context
import android.content.IntentSender
import android.net.Uri
import android.os.Build
import android.provider.MediaStore
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.jaudiotagger.audio.AudioFileIO
import org.jaudiotagger.tag.FieldKey
import org.jaudiotagger.tag.TagOptionSingleton
import org.jaudiotagger.tag.images.StandardArtwork
import java.io.File
import java.io.FileOutputStream

class TagEditorRepository(private val context: Context) {

    init {
        TagOptionSingleton.getInstance().isAndroid = true
    }

    suspend fun updateSongTags(
        songUri: Uri,
        filePath: String,
        newTitle: String,
        newArtist: String,
        newAlbum: String,
        newYear: String,
        newGenre: String,
        albumArtBytes: ByteArray? = null
    ): Result<Unit> = withContext(Dispatchers.IO) {
        val originalFile = File(filePath)
        if (!originalFile.exists()) {
            return@withContext Result.failure(Exception("Source audio file not found on disk."))
        }

        val cacheFile = File(
            context.cacheDir,
            "editable_\${System.currentTimeMillis()}.\${originalFile.extension}"
        )

        try {
            originalFile.copyTo(cacheFile, overwrite = true)

            val audioFile = AudioFileIO.read(cacheFile)
            val tag = audioFile.tagOrCreateAndSetDefault

            tag.setField(FieldKey.TITLE, newTitle)
            tag.setField(FieldKey.ARTIST, newArtist)
            tag.setField(FieldKey.ALBUM, newAlbum)
            tag.setField(FieldKey.YEAR, newYear)
            tag.setField(FieldKey.GENRE, newGenre)

            albumArtBytes?.let { bytes ->
                val artwork = StandardArtwork().apply {
                    binaryData = bytes
                    mimeType = "image/jpeg"
                    pictureType = 3
                }
                tag.deleteArtworkField()
                tag.setField(artwork)
            }

            audioFile.commit()
            writeCacheBackToUri(cacheFile, songUri)
            Result.success(Unit)
        } catch (e: SecurityException) {
            Result.failure(e)
        } catch (e: Exception) {
            Result.failure(e)
        } finally {
            if (cacheFile.exists()) {
                cacheFile.delete()
            }
        }
    }

    private fun writeCacheBackToUri(cacheFile: File, targetUri: Uri) {
        context.contentResolver.openFileDescriptor(targetUri, "w")?.use { pfd ->
            FileOutputStream(pfd.fileDescriptor).use { output ->
                cacheFile.inputStream().use { input ->
                    input.copyTo(output)
                }
            }
        } ?: throw IllegalStateException("Unable to open destination file descriptor for \$targetUri")
    }

    fun getRecoverableSecurityIntent(e: Exception): IntentSender? {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q && e is RecoverableSecurityException) {
            e.userAction.actionIntent.intentSender
        } else {
            null
        }
    }

    fun createWriteRequestIntent(songUri: Uri): IntentSender? {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            MediaStore.createWriteRequest(context.contentResolver, listOf(songUri)).intentSender
        } else {
            null
        }
    }

    fun isWriteResultConfirmed(resultCode: Int): Boolean = resultCode == Activity.RESULT_OK
}
`,

  'viewmodel/MusicPlayerViewModel.kt': `package com.shinobi.musicplayer.viewmodel

import android.app.Application
import android.content.IntentSender
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.shinobi.musicplayer.data.AudioRepository
import com.shinobi.musicplayer.data.TagEditorRepository
import com.shinobi.musicplayer.model.Song
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

data class PendingTagEdit(
    val song: Song,
    val title: String,
    val artist: String,
    val album: String,
    val year: String,
    val genre: String,
    val albumArtBytes: ByteArray? = null
)

class MusicPlayerViewModel(application: Application) : AndroidViewModel(application) {

    private val audioRepository = AudioRepository(application)
    private val tagEditorRepository = TagEditorRepository(application)

    private val _songs = MutableStateFlow<List<Song>>(emptyList())
    val songs: StateFlow<List<Song>> = _songs.asStateFlow()

    private val _pendingSecurityIntent = MutableStateFlow<IntentSender?>(null)
    val pendingSecurityIntent: StateFlow<IntentSender?> = _pendingSecurityIntent.asStateFlow()

    private var pendingTagEdit: PendingTagEdit? = null

    fun loadDeviceSongs() {
        viewModelScope.launch {
            val loaded = withContext(Dispatchers.IO) {
                audioRepository.fetchDeviceSongs()
            }
            _songs.value = loaded
        }
    }

    fun saveSongTags(
        currentSong: Song,
        newTitle: String,
        newArtist: String,
        newAlbum: String,
        newYear: String,
        newGenre: String,
        selectedImageByteArray: ByteArray? = null,
        onSuccess: () -> Unit = {}
    ) {
        viewModelScope.launch {
            val result = tagEditorRepository.updateSongTags(
                songUri = currentSong.uri,
                filePath = currentSong.filePath,
                newTitle = newTitle,
                newArtist = newArtist,
                newAlbum = newAlbum,
                newYear = newYear,
                newGenre = newGenre,
                albumArtBytes = selectedImageByteArray
            )

            result.onSuccess {
                pendingTagEdit = null
                _songs.update { list ->
                    list.map { song ->
                        if (song.id == currentSong.id) {
                            song.copy(
                                title = newTitle,
                                artist = newArtist,
                                album = newAlbum,
                                year = newYear,
                                genre = newGenre
                            )
                        } else {
                            song
                        }
                    }
                }
                onSuccess()
            }.onFailure { exception ->
                val intentSender = tagEditorRepository.getRecoverableSecurityIntent(exception as Exception)
                if (intentSender != null) {
                    pendingTagEdit = PendingTagEdit(
                        song = currentSong,
                        title = newTitle,
                        artist = newArtist,
                        album = newAlbum,
                        year = newYear,
                        genre = newGenre,
                        albumArtBytes = selectedImageByteArray
                    )
                    _pendingSecurityIntent.value = intentSender
                }
            }
        }
    }

    fun retryPendingTagUpdate(onSuccess: () -> Unit = {}) {
        val pending = pendingTagEdit ?: return
        saveSongTags(
            currentSong = pending.song,
            newTitle = pending.title,
            newArtist = pending.artist,
            newAlbum = pending.album,
            newYear = pending.year,
            newGenre = pending.genre,
            selectedImageByteArray = pending.albumArtBytes,
            onSuccess = onSuccess
        )
    }

    fun clearPendingSecurityIntent() {
        _pendingSecurityIntent.value = null
    }
}
`,

  'util/SongFormatUtils.kt': `package com.shinobi.musicplayer.util

import java.util.Locale

object SongFormatUtils {

    fun formatDuration(durationMs: Long): String {
        val totalSeconds = durationMs / 1000
        val minutes = totalSeconds / 60
        val seconds = totalSeconds % 60
        return String.format(Locale.getDefault(), "%d:%02d", minutes, seconds)
    }

    fun formatFileSize(sizeBytes: Long): String {
        val kb = sizeBytes / 1024.0
        val mb = kb / 1024.0
        return if (mb >= 1.0) {
            String.format(Locale.getDefault(), "%.2f MB", mb)
        } else {
            String.format(Locale.getDefault(), "%.1f KB", kb)
        }
    }
}
`,

  'ui/ShinobiAppRoot.kt': `package com.shinobi.musicplayer.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import com.shinobi.musicplayer.audio.EqualizerBand
import com.shinobi.musicplayer.audio.EqualizerUiState
import com.shinobi.musicplayer.model.Song
import com.shinobi.musicplayer.ui.components.ParchmentTagEditorScreen
import com.shinobi.musicplayer.ui.components.PulsingChakraButton
import com.shinobi.musicplayer.ui.components.SpatialEqualizerBottomSheet
import com.shinobi.musicplayer.util.SongFormatUtils

private val ChakraOrange = Color(0xFFFF5722)
private val SealSurface = Color(0xFF1E222B)

@Composable
fun ShinobiAppRoot(
    song: Song? = null,
    isPlaying: Boolean = false,
    currentPositionMs: Long = 45000L,
    eqState: EqualizerUiState? = null,
    onPlayPauseClick: (() -> Unit)? = null,
    onNextClick: (() -> Unit)? = null,
    onPreviousClick: (() -> Unit)? = null,
    onSeek: ((Long) -> Unit)? = null,
    onToggleEqualizer: ((Boolean) -> Unit)? = null,
    onBandLevelChanged: ((Short, Short) -> Unit)? = null,
    onSpatialChanged: ((Short) -> Unit)? = null,
    onBassChanged: ((Short) -> Unit)? = null,
    onSaveTags: ((Song, String, String, String, String, String, () -> Unit) -> Unit)? = null
) {
    var previewPlaying by remember { mutableStateOf(isPlaying) }
    var previewPositionMs by remember { mutableStateOf(currentPositionMs) }
    var previewSpatialStrength by remember { mutableStateOf<Short>(750) }
    var previewExtendedBass by remember { mutableStateOf<Short>(1200) }
    var previewEnabled by remember { mutableStateOf(true) }

    var showEqSheet by remember { mutableStateOf(false) }
    var showTagEditor by remember { mutableStateOf(false) }
    var showInfoDialog by remember { mutableStateOf(false) }

    val currentSong = song ?: Song(
        id = 1L,
        uri = android.net.Uri.EMPTY,
        title = "Chant du Katana Céleste",
        artist = "Shinobi Sonore",
        album = "Parchemins Interdits Vol. 1",
        genre = "Ambient Ninjutsu",
        year = "2026",
        durationMs = 210000L,
        filePath = "/storage/emulated/0/Music/shinobi.mp3",
        fileSizeBytes = 7500000L,
        mimeType = "audio/mpeg",
        bitrate = "320 kbps",
        sampleRate = "44.1 kHz"
    )

    val activeEqState = if (eqState != null && eqState.bands.isNotEmpty()) {
        eqState
    } else {
        EqualizerUiState(
            isEnabled = previewEnabled,
            bands = listOf(
                EqualizerBand(0, 60, "60Hz", 300),
                EqualizerBand(1, 230, "230Hz", -100),
                EqualizerBand(2, 910, "910Hz", 200),
                EqualizerBand(3, 3600, "3.6kHz", 150),
                EqualizerBand(4, 14000, "14kHz", 400)
            ),
            bassBoostStrength = previewExtendedBass,
            spatialAudioStrength = previewSpatialStrength
        )
    }

    val effectivePlaying = if (onPlayPauseClick != null) isPlaying else previewPlaying
    val effectivePositionMs = if (onSeek != null) currentPositionMs else previewPositionMs

    Box(modifier = Modifier.fillMaxSize()) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.SpaceBetween
        ) {
            // Header
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "SHINOBI MUSIC PLAYER",
                    style = MaterialTheme.typography.titleMedium,
                    color = ChakraOrange
                )
                Row {
                    IconButton(onClick = { showInfoDialog = true }) {
                        Icon(Icons.Default.Info, contentDescription = "Infos", tint = Color.White)
                    }
                    IconButton(onClick = { showTagEditor = true }) {
                        Icon(Icons.Default.Edit, contentDescription = "Éditeur Makimono", tint = Color.White)
                    }
                    IconButton(onClick = { showEqSheet = true }) {
                        Icon(Icons.Default.Equalizer, contentDescription = "Égaliseur", tint = ChakraOrange)
                    }
                }
            }

            // Sceau d'invocation central
            Box(
                modifier = Modifier
                    .size(260.dp)
                    .clip(CircleShape)
                    .background(SealSurface),
                contentAlignment = Alignment.Center
            ) {
                AsyncImage(
                    model = currentSong.uri,
                    contentDescription = "Pochette d'album",
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(16.dp)
                        .clip(CircleShape),
                    contentScale = ContentScale.Crop
                )
                Icon(
                    imageVector = Icons.Default.Album,
                    contentDescription = null,
                    modifier = Modifier.size(100.dp),
                    tint = ChakraOrange.copy(alpha = 0.5f)
                )
            }

            // Infos du morceau
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(
                    text = currentSong.title,
                    style = MaterialTheme.typography.titleLarge,
                    color = Color.White,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = currentSong.artist,
                    style = MaterialTheme.typography.bodyMedium,
                    color = Color.Gray,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }

            // Barre de progression
            val safeDuration = currentSong.durationMs.coerceAtLeast(1L).toFloat()
            Column(modifier = Modifier.fillMaxWidth()) {
                Slider(
                    value = effectivePositionMs.toFloat().coerceIn(0f, safeDuration),
                    onValueChange = { nextPos ->
                        if (onSeek != null) {
                            onSeek(nextPos.toLong())
                        } else {
                            previewPositionMs = nextPos.toLong()
                        }
                    },
                    valueRange = 0f..safeDuration,
                    colors = SliderDefaults.colors(
                        thumbColor = ChakraOrange,
                        activeTrackColor = ChakraOrange
                    )
                )
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(
                        text = SongFormatUtils.formatDuration(effectivePositionMs),
                        style = MaterialTheme.typography.labelSmall,
                        color = Color.Gray
                    )
                    Text(
                        text = SongFormatUtils.formatDuration(currentSong.durationMs),
                        style = MaterialTheme.typography.labelSmall,
                        color = Color.Gray
                    )
                }
            }

            // Commandes de lecture & Bouton Chakra Pulsé
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceEvenly,
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconButton(onClick = { onPreviousClick?.invoke() }) {
                    Icon(Icons.Default.SkipPrevious, contentDescription = "Précédent", tint = Color.White, modifier = Modifier.size(32.dp))
                }
                PulsingChakraButton(
                    isPlaying = effectivePlaying,
                    chakraColor = ChakraOrange,
                    onClick = {
                        if (onPlayPauseClick != null) {
                            onPlayPauseClick()
                        } else {
                            previewPlaying = !previewPlaying
                        }
                    }
                )
                IconButton(onClick = { onNextClick?.invoke() }) {
                    Icon(Icons.Default.SkipNext, contentDescription = "Suivant", tint = Color.White, modifier = Modifier.size(32.dp))
                }
            }

            Spacer(modifier = Modifier.height(8.dp))
        }

        // Sceau d'égalisation circulaire 3D HD (Bottom Sheet)
        if (showEqSheet) {
            SpatialEqualizerBottomSheet(
                eqState = activeEqState,
                spatialAudioStrength = if (eqState != null) eqState.spatialAudioStrength else previewSpatialStrength,
                extendedBassStrength = if (eqState != null) eqState.bassBoostStrength else previewExtendedBass,
                onToggleEnabled = { enabled ->
                    previewEnabled = enabled
                    onToggleEqualizer?.invoke(enabled)
                },
                onBandLevelChanged = { index, level -> onBandLevelChanged?.invoke(index, level) },
                onSpatialChanged = { nextSpatial ->
                    previewSpatialStrength = nextSpatial
                    onSpatialChanged?.invoke(nextSpatial)
                },
                onBassChanged = { nextBass ->
                    previewExtendedBass = nextBass
                    onBassChanged?.invoke(nextBass)
                },
                onDismiss = { showEqSheet = false }
            )
        }

        // Parchemin Makimono (Éditeur de balises)
        ParchmentTagEditorScreen(
            initialTitle = currentSong.title,
            initialArtist = currentSong.artist,
            initialAlbum = currentSong.album,
            initialYear = currentSong.year,
            initialGenre = currentSong.genre,
            isVisible = showTagEditor,
            onSave = { newTitle, newArtist, newAlbum, newYear, newGenre ->
                if (onSaveTags != null) {
                    onSaveTags(currentSong, newTitle, newArtist, newAlbum, newYear, newGenre) {
                        showTagEditor = false
                    }
                } else {
                    showTagEditor = false
                }
            },
            onDismiss = { showTagEditor = false }
        )

        // Boîte d'informations techniques
        if (showInfoDialog) {
            SongInfoDialog(
                song = currentSong,
                onDismiss = { showInfoDialog = false },
                onOpenTagEditor = {
                    showInfoDialog = false
                    showTagEditor = true
                }
            )
        }
    }
}

@Composable
fun SongInfoDialog(
    song: Song,
    onDismiss: () -> Unit,
    onOpenTagEditor: () -> Unit
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Spécifications du Parchemin") },
        text = {
            Column(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                InfoRow(label = "Titre", value = song.title)
                InfoRow(label = "Artiste", value = song.artist)
                InfoRow(label = "Album", value = song.album)
                InfoRow(label = "Durée", value = SongFormatUtils.formatDuration(song.durationMs))
                InfoRow(label = "Débit", value = song.bitrate)
                InfoRow(label = "Échantillonnage", value = song.sampleRate)
                InfoRow(label = "Taille", value = SongFormatUtils.formatFileSize(song.fileSizeBytes))
                InfoRow(label = "Format", value = song.mimeType)
                InfoRow(label = "Chemin", value = song.filePath)
            }
        },
        confirmButton = {
            TextButton(onClick = onOpenTagEditor) {
                Text("Éditer les balises")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Fermer")
            }
        }
    )
}

@Composable
fun InfoRow(label: String, value: String) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.secondary,
            modifier = Modifier.weight(0.4f)
        )
        Text(
            text = value,
            style = MaterialTheme.typography.bodyMedium,
            modifier = Modifier.weight(0.6f),
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            textAlign = TextAlign.End
        )
    }
}
`,

  'ui/components/PulsingChakraButton.kt': `package com.shinobi.musicplayer.ui.components

import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material3.FilledIconButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButtonDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp

@Composable
fun PulsingChakraButton(
    isPlaying: Boolean,
    chakraColor: Color,
    onClick: () -> Unit
) {
    val infiniteTransition = rememberInfiniteTransition(label = "chakra_pulse")

    val pulseScale by infiniteTransition.animateFloat(
        initialValue = 1f,
        targetValue = if (isPlaying) 1.25f else 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(1200, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "scale"
    )

    val pulseAlpha by infiniteTransition.animateFloat(
        initialValue = 0.6f,
        targetValue = if (isPlaying) 0.0f else 0.6f,
        animationSpec = infiniteRepeatable(
            animation = tween(1200, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "alpha"
    )

    Box(
        contentAlignment = Alignment.Center,
        modifier = Modifier.size(96.dp)
    ) {
        if (isPlaying) {
            Box(
                modifier = Modifier
                    .size(80.dp)
                    .scale(pulseScale)
                    .background(chakraColor.copy(alpha = pulseAlpha), CircleShape)
            )
        }

        FilledIconButton(
            onClick = onClick,
            modifier = Modifier.size(64.dp),
            shape = CircleShape,
            colors = IconButtonDefaults.filledIconButtonColors(containerColor = chakraColor)
        ) {
            Icon(
                imageVector = if (isPlaying) Icons.Default.Pause else Icons.Default.PlayArrow,
                contentDescription = "Activer / Suspendre",
                tint = Color.White,
                modifier = Modifier.size(32.dp)
            )
        }
    }
}
`,

  'ui/components/SealEqualizerNode.kt': `package com.shinobi.musicplayer.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.layout.*
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.unit.dp
import kotlin.math.cos
import kotlin.math.sin

@Composable
fun SealEqualizerNode(
    label: String,
    frequencyHz: Int,
    currentLevelMb: Short,
    minLevelMb: Short,
    maxLevelMb: Short,
    onLevelChanged: (Short) -> Unit
) {
    val range = (maxLevelMb - minLevelMb).toFloat()
    val normalized = (currentLevelMb - minLevelMb).toFloat() / if (range == 0f) 1f else range
    var angle by remember(currentLevelMb) { mutableStateOf(normalized * 270f - 135f) }

    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier.padding(4.dp)
    ) {
        Box(
            modifier = Modifier
                .size(68.dp)
                .pointerInput(Unit) {
                    detectDragGestures { change, dragAmount ->
                        change.consume()
                        angle = (angle + dragAmount.x * 0.7f - dragAmount.y * 0.7f).coerceIn(-135f, 135f)
                        val newNormalized = (angle + 135f) / 270f
                        val newMb = (minLevelMb + newNormalized * range).toInt().toShort()
                        onLevelChanged(newMb)
                    }
                },
            contentAlignment = Alignment.Center
        ) {
            val primaryColor = MaterialTheme.colorScheme.primary
            val surfaceVariant = MaterialTheme.colorScheme.surfaceVariant

            Canvas(modifier = Modifier.fillMaxSize()) {
                val center = Offset(size.width / 2f, size.height / 2f)
                val radius = size.minDimension / 2f - 6.dp.toPx()

                drawCircle(
                    color = surfaceVariant,
                    radius = radius,
                    center = center,
                    style = Stroke(width = 3.dp.toPx())
                )

                drawArc(
                    color = primaryColor,
                    startAngle = -135f,
                    sweepAngle = angle + 135f,
                    useCenter = false,
                    style = Stroke(width = 5.dp.toPx())
                )

                val rad = Math.toRadians((angle).toDouble())
                val indicatorX = center.x + (radius - 10.dp.toPx()) * cos(rad).toFloat()
                val indicatorY = center.y + (radius - 10.dp.toPx()) * sin(rad).toFloat()
                drawCircle(
                    color = primaryColor,
                    radius = 4.dp.toPx(),
                    center = Offset(indicatorX, indicatorY)
                )
            }

            Text(
                text = "\${currentLevelMb / 100}dB",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurface
            )
        }

        Spacer(modifier = Modifier.height(4.dp))
        Text(text = label, style = MaterialTheme.typography.labelSmall)
    }
}
`,

  'ui/components/SpatialEqualizerBottomSheet.kt': `package com.shinobi.musicplayer.ui.components

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.shinobi.musicplayer.audio.EqualizerUiState

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SpatialEqualizerBottomSheet(
    eqState: EqualizerUiState,
    spatialAudioStrength: Short,
    extendedBassStrength: Short,
    onToggleEnabled: (Boolean) -> Unit,
    onBandLevelChanged: (Short, Short) -> Unit,
    onSpatialChanged: (Short) -> Unit,
    onBassChanged: (Short) -> Unit,
    onDismiss: () -> Unit
) {
    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(20.dp)
                .navigationBarsPadding(),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("Matrice 3D HD & Sceau Audio", style = MaterialTheme.typography.titleLarge)
                Switch(checked = eqState.isEnabled, onCheckedChange = onToggleEnabled)
            }

            Spacer(modifier = Modifier.height(16.dp))

            if (eqState.bands.isNotEmpty()) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceEvenly
                ) {
                    eqState.bands.forEach { band ->
                        SealEqualizerNode(
                            label = band.label,
                            frequencyHz = band.centerFreqHz,
                            currentLevelMb = band.currentLevelMb,
                            minLevelMb = eqState.minLevelMb,
                            maxLevelMb = eqState.maxLevelMb,
                            onLevelChanged = { newLevel ->
                                onBandLevelChanged(band.index, newLevel)
                            }
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(20.dp))
            HorizontalDivider(color = Color.Gray.copy(alpha = 0.3f))
            Spacer(modifier = Modifier.height(16.dp))

            Column(modifier = Modifier.fillMaxWidth()) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text("Champ Sonore Spatial 3D", style = MaterialTheme.typography.bodyMedium)
                    Text(
                        "\${spatialAudioStrength / 10}%",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.primary
                    )
                }
                Slider(
                    value = spatialAudioStrength.toFloat(),
                    onValueChange = { onSpatialChanged(it.toInt().toShort()) },
                    valueRange = 0f..1000f,
                    enabled = eqState.isEnabled
                )
            }

            Spacer(modifier = Modifier.height(8.dp))

            Column(modifier = Modifier.fillMaxWidth()) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text("Sub-Bass Étendu", style = MaterialTheme.typography.bodyMedium)
                    Text(
                        "\${extendedBassStrength / 20}%",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.primary
                    )
                }
                Slider(
                    value = extendedBassStrength.toFloat(),
                    onValueChange = { onBassChanged(it.toInt().toShort()) },
                    valueRange = 0f..2000f,
                    enabled = eqState.isEnabled
                )
            }

            Spacer(modifier = Modifier.height(24.dp))
        }
    }
}
`,

  'ui/components/ParchmentTagEditorScreen.kt': `package com.shinobi.musicplayer.ui.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.tween
import androidx.compose.animation.expandVertically
import androidx.compose.animation.fadeIn
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

private val ParchmentBg = Color(0xFFF7F2E7)
private val ParchmentSurface = Color(0xFFEFE6D2)
private val ScrollBorder = Color(0xFF8C6D46)
private val ScrollWood = Color(0xFF593E25)
private val InkText = Color(0xFF2C221E)

@Composable
fun ParchmentTagEditorScreen(
    initialTitle: String,
    initialArtist: String,
    initialAlbum: String,
    initialYear: String,
    initialGenre: String,
    isVisible: Boolean,
    onSave: (title: String, artist: String, album: String, year: String, genre: String) -> Unit,
    onDismiss: () -> Unit
) {
    var title by remember(initialTitle) { mutableStateOf(initialTitle) }
    var artist by remember(initialArtist) { mutableStateOf(initialArtist) }
    var album by remember(initialAlbum) { mutableStateOf(initialAlbum) }
    var year by remember(initialYear) { mutableStateOf(initialYear) }
    var genre by remember(initialGenre) { mutableStateOf(initialGenre) }

    AnimatedVisibility(
        visible = isVisible,
        enter = fadeIn(animationSpec = tween(400)) + expandVertically(animationSpec = tween(400))
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Color.Black.copy(alpha = 0.6f)),
            contentAlignment = Alignment.Center
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth(0.9f)
                    .wrapContentHeight()
                    .clip(RoundedCornerShape(8.dp))
                    .border(2.dp, ScrollWood, RoundedCornerShape(8.dp))
                    .background(ParchmentBg)
                    .padding(16.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth(0.7f)
                        .height(12.dp)
                        .clip(RoundedCornerShape(6.dp))
                        .background(ScrollWood)
                )

                Spacer(modifier = Modifier.height(16.dp))

                Text(
                    text = "ROULEAU DE MÉTADONNÉES",
                    style = MaterialTheme.typography.titleMedium.copy(
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 1.5.sp,
                        color = InkText
                    )
                )

                Spacer(modifier = Modifier.height(14.dp))

                ParchmentTextField(label = "Titre (Title)", value = title, onValueChange = { title = it })
                Spacer(modifier = Modifier.height(8.dp))
                ParchmentTextField(label = "Artiste (Artist)", value = artist, onValueChange = { artist = it })
                Spacer(modifier = Modifier.height(8.dp))
                ParchmentTextField(label = "Album", value = album, onValueChange = { album = it })
                Spacer(modifier = Modifier.height(8.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Box(modifier = Modifier.weight(1f)) {
                        ParchmentTextField(label = "Année", value = year, onValueChange = { year = it })
                    }
                    Box(modifier = Modifier.weight(1f)) {
                        ParchmentTextField(label = "Genre", value = genre, onValueChange = { genre = it })
                    }
                }

                Spacer(modifier = Modifier.height(20.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceEvenly
                ) {
                    Button(
                        onClick = onDismiss,
                        colors = ButtonDefaults.buttonColors(containerColor = ScrollBorder)
                    ) {
                        Icon(Icons.Default.Close, contentDescription = "Annuler", tint = Color.White)
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Sceller", color = Color.White)
                    }

                    Button(
                        onClick = { onSave(title, artist, album, year, genre) },
                        colors = ButtonDefaults.buttonColors(containerColor = ScrollWood)
                    ) {
                        Icon(Icons.Default.Check, contentDescription = "Enregistrer", tint = Color.White)
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Inscrire", color = Color.White)
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                Box(
                    modifier = Modifier
                        .fillMaxWidth(0.7f)
                        .height(12.dp)
                        .clip(RoundedCornerShape(6.dp))
                        .background(ScrollWood)
                )
            }
        }
    }
}

@Composable
fun ParchmentTextField(
    label: String,
    value: String,
    onValueChange: (String) -> Unit
) {
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        label = { Text(label, color = ScrollBorder) },
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(4.dp),
        colors = OutlinedTextFieldDefaults.colors(
            focusedContainerColor = ParchmentSurface,
            unfocusedContainerColor = ParchmentSurface,
            focusedBorderColor = ScrollBorder,
            unfocusedBorderColor = ScrollBorder.copy(alpha = 0.6f),
            focusedTextColor = InkText,
            unfocusedTextColor = InkText
        ),
        keyboardOptions = KeyboardOptions(imeAction = ImeAction.Next),
        singleLine = true
    )
}
`,
};
