import { AndroidFileId } from '../types/music';

export const ANDROID_PROJECT_FILES: Record<AndroidFileId, string> = {
  'app/build.gradle.kts': `plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
}

android {
    namespace = "com.yourapp.musicplayer"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.yourapp.musicplayer"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "1.0"
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

    // Core Android & Compose
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.activity.compose)
    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.ui)
    implementation(libs.androidx.ui.graphics)
    implementation(libs.androidx.ui.tooling.preview)
    implementation(libs.androidx.material3)

    // Media3 (ExoPlayer + Background Service)
    implementation("androidx.media3:media3-exoplayer:\$media3Version")
    implementation("androidx.media3:media3-session:\$media3Version")
    implementation("androidx.media3:media3-common:\$media3Version")

    // Metadata & Embedded Tag Editor
    implementation("net.jthink:jaudiotagger:3.0.1")

    // Album Art Loading
    implementation("io.coil-kt:coil-compose:2.7.0")

    // Material Icons Extended (for EQ, Shuffle, Repeat, Tag icons)
    implementation("androidx.compose.material:material-icons-extended:1.7.5")

    // Compose ViewModel
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.8.7")

    debugImplementation(libs.androidx.ui.tooling)
}
`,

  'AndroidManifest.xml': `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <!-- Storage Permissions (Android 13+ vs Android 12 and below) -->
    <uses-permission android:name="android.permission.READ_MEDIA_AUDIO" />
    <uses-permission
        android:name="android.permission.READ_EXTERNAL_STORAGE"
        android:maxSdkVersion="32" />

    <!-- Background Playback & Equalizer -->
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK" />
    <uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />

    <application
        android:allowBackup="true"
        android:label="Music Player"
        android:supportsRtl="true"
        android:theme="@style/Theme.MusicPlayer">

        <activity
            android:name=".MainActivity"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

        <!-- Background Audio Service -->
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

  'model/Song.kt': `package com.yourapp.musicplayer.model

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

  'MainActivity.kt': `package com.yourapp.musicplayer

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
import com.yourapp.musicplayer.audio.EqualizerUiState
import com.yourapp.musicplayer.audio.PlayerConnection
import com.yourapp.musicplayer.service.PlaybackService
import com.yourapp.musicplayer.ui.NinjaMusicPlayerRoot
import com.yourapp.musicplayer.viewmodel.MusicPlayerViewModel
import kotlinx.coroutines.delay

private val NinjaDarkBackground = Color(0xFF121418)
private val ChakraAccent = Color(0xFFFF5722)
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
                    background = NinjaDarkBackground,
                    surface = SealSurface,
                    primary = ChakraAccent,
                    onPrimary = Color.White
                )
            ) {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    NinjaMusicPlayerRoot(
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

  'service/PlaybackService.kt': `package com.yourapp.musicplayer.service

import android.content.Intent
import androidx.annotation.OptIn
import androidx.media3.common.AudioAttributes
import androidx.media3.common.C
import androidx.media3.common.Player
import androidx.media3.common.util.UnstableApi
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.session.MediaSession
import androidx.media3.session.MediaSessionService
import com.yourapp.musicplayer.audio.AudioEffectsController

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

  'audio/PlayerConnection.kt': `package com.yourapp.musicplayer.audio

import android.content.ComponentName
import android.content.Context
import androidx.core.content.ContextCompat
import androidx.media3.common.MediaItem
import androidx.media3.common.MediaMetadata
import androidx.media3.session.MediaController
import androidx.media3.session.SessionToken
import com.google.common.util.concurrent.ListenableFuture
import com.yourapp.musicplayer.model.Song
import com.yourapp.musicplayer.service.PlaybackService
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

  'audio/AudioEffectsController.kt': `package com.yourapp.musicplayer.audio

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
    val bassBoostStrength: Short = 0,         // Plage 0 à 2000 (Sub-Bass Étendu)
    val spatialAudioStrength: Short = 0       // Plage 0 à 1000 (Spatial 3D HD)
)

class AudioEffectsController(context: Context) {

    private val prefs = context.getSharedPreferences("ninja_eq_settings", Context.MODE_PRIVATE)
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

            // Restauration des paramètres enregistrés
            val savedPreset = prefs.getInt("eq_preset", -1)
            val numBands = eq.numberOfBands.toInt()

            if (savedPreset in 0 until presetCount) {
                eq.usePreset(savedPreset.toShort())
            } else {
                for (i in 0 until numBands) {
                    val savedLevel = prefs.getInt("band_\$i", 0).toShort()
                    eq.setBandLevel(i.toShort(), savedLevel.coerceIn(minLevel, maxLevel))
                }
            }

            val savedBass = prefs.getInt("bass_strength", 0).toShort()
            if (bass.strengthSupported) {
                bass.setStrength(savedBass.coerceIn(0, 2000))
            }

            val savedSpatial = prefs.getInt("spatial_strength", 0).toShort()
            if (virt.strengthSupported) {
                virt.setStrength(savedSpatial.coerceIn(0, 1000))
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
        val clamped = strength.coerceIn(0, 2000)
        if (bass.strengthSupported) {
            bass.setStrength(clamped)
        }
        prefs.edit().putInt("bass_strength", clamped.toInt()).apply()
        _uiState.update { it.copy(bassBoostStrength = clamped) }
    }

    fun setSpatialAudio(strength: Short) {
        val virt = virtualizer ?: return
        val clamped = strength.coerceIn(0, 1000)
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

  'data/AudioRepository.kt': `package com.yourapp.musicplayer.data

import android.content.ContentUris
import android.content.Context
import android.media.MediaMetadataRetriever
import android.provider.MediaStore
import com.yourapp.musicplayer.model.Song
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
            MediaStore.Audio.Media.DATA, // File path (still useful for metadata retriever)
            MediaStore.Audio.Media.MIME_TYPE,
            MediaStore.Audio.Media.YEAR,
            MediaStore.Audio.Media.GENRE
        )

        // Filter out very short audio files (like notifications or ringtones under 30 seconds)
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

                // Extract technical audio specs using MediaMetadataRetriever
                val (bitrate, sampleRate) = extractTechnicalMetadata(filePath)

                songs.add(
                    Song(
                        id = id,
                        uri = contentUri,
                        title = title,
                        artist = artist,
                        album = album,
                        genre = "Unknown", // MediaStore genre queries require a separate join table; populated via JAudioTagger later if needed
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

                // Extract Bitrate (bits per second -> convert to kbps)
                val bitrateStr = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_BITRATE)
                val bitrateKbps = if (!bitrateStr.isNullOrEmpty()) {
                    val kbps = bitrateStr.toIntOrNull()?.div(1000)
                    if (kbps != null && kbps > 0) "\$kbps kbps" else "Unknown"
                } else {
                    "Unknown"
                }

                // Extract Sample Rate (Hz -> convert to kHz if applicable)
                // Note: METADATA_KEY_SAMPLERATE is supported on API 29+
                val sampleRateHz = retriever.extractMetadata(19 /* METADATA_KEY_SAMPLERATE */)
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

  'data/TagEditorRepository.kt': `package com.yourapp.musicplayer.data

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

    /**
     * Updates song metadata (Title, Artist, Album, Year, Genre) and embedded album art.
     * Safely handles Android Scoped Storage by caching the file during editing.
     */
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

        // Step 1: Copy to app cache to allow safe read/write modifications via JAudioTagger
        val cacheFile = File(
            context.cacheDir,
            "editable_\${System.currentTimeMillis()}.\${originalFile.extension}"
        )

        try {
            originalFile.copyTo(cacheFile, overwrite = true)

            // Step 2: Edit tags on cached copy
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

            // Step 3: Write modified file back through MediaStore ContentResolver
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

  'viewmodel/MusicPlayerViewModel.kt': `package com.yourapp.musicplayer.viewmodel

import android.app.Application
import android.content.IntentSender
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.yourapp.musicplayer.data.AudioRepository
import com.yourapp.musicplayer.data.TagEditorRepository
import com.yourapp.musicplayer.model.Song
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
                albumArtBytes = selectedImageByteArray // Optional
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

  'util/SongFormatUtils.kt': `package com.yourapp.musicplayer.util

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

  'ui/NowPlayingScreen.kt': `package com.yourapp.musicplayer.ui

import androidx.compose.animation.*
import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import com.yourapp.musicplayer.audio.EqualizerUiState
import com.yourapp.musicplayer.model.Song
import com.yourapp.musicplayer.ui.components.SealEqualizerNode
import com.yourapp.musicplayer.util.SongFormatUtils

/**
 * 1. Now Playing Screen (Album art, track info, progress, controls, EQ & Info buttons)
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NowPlayingScreen(
    currentSong: Song?,
    isPlaying: Boolean,
    currentPositionMs: Long,
    onPlayPauseClick: () -> Unit,
    onNextClick: () -> Unit,
    onPreviousClick: () -> Unit,
    onSeek: (Long) -> Unit,
    onOpenEqualizer: () -> Unit,
    onOpenSongInfo: () -> Unit
) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Now Playing", style = MaterialTheme.typography.titleMedium) },
                actions = {
                    // Button to open Song Info & Technical Specs dialog
                    IconButton(onClick = onOpenSongInfo) {
                        Icon(Icons.Default.Info, contentDescription = "Song Info")
                    }
                    // Button to open Equalizer sheet
                    IconButton(onClick = onOpenEqualizer) {
                        Icon(Icons.Default.Equalizer, contentDescription = "Equalizer")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface)
            )
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.SpaceBetween
        ) {
            Spacer(modifier = Modifier.height(16.dp))

            // Album Art Hero Image
            Card(
                modifier = Modifier
                    .size(280.dp)
                    .clip(RoundedCornerShape(16.dp)),
                elevation = CardDefaults.cardElevation(defaultElevation = 8.dp)
            ) {
                Box(modifier = Modifier.fillMaxSize()) {
                    AsyncImage(
                        model = currentSong?.uri,
                        contentDescription = "Album Art",
                        modifier = Modifier.fillMaxSize(),
                        contentScale = ContentScale.Crop
                    )
                    if (currentSong == null) {
                        Box(
                            modifier = Modifier
                                .fillMaxSize()
                                .background(MaterialTheme.colorScheme.surfaceVariant),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = Icons.Default.MusicNote,
                                contentDescription = null,
                                modifier = Modifier.size(64.dp),
                                tint = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                }
            }

            // Track Title & Artist
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier.fillMaxWidth()
            ) {
                Text(
                    text = currentSong?.title ?: "No Song Playing",
                    style = MaterialTheme.typography.titleLarge,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    textAlign = TextAlign.Center
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = currentSong?.artist ?: "Unknown Artist",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.secondary,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    textAlign = TextAlign.Center
                )
            }

            // Playback Seekbar & Timestamps
            val duration = currentSong?.durationMs ?: 1L
            Column(modifier = Modifier.fillMaxWidth()) {
                Slider(
                    value = currentPositionMs.toFloat().coerceIn(0f, duration.toFloat()),
                    onValueChange = { onSeek(it.toLong()) },
                    valueRange = 0f..duration.toFloat()
                )
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(
                        text = SongFormatUtils.formatDuration(currentPositionMs),
                        style = MaterialTheme.typography.labelSmall
                    )
                    Text(
                        text = SongFormatUtils.formatDuration(duration),
                        style = MaterialTheme.typography.labelSmall
                    )
                }
            }

            // Playback Transport Controls
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceEvenly,
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconButton(onClick = onPreviousClick) {
                    Icon(Icons.Default.SkipPrevious, contentDescription = "Previous", modifier = Modifier.size(36.dp))
                }
                FilledIconButton(
                    onClick = onPlayPauseClick,
                    modifier = Modifier.size(64.dp),
                    shape = CircleShape
                ) {
                    Icon(
                        imageVector = if (isPlaying) Icons.Default.Pause else Icons.Default.PlayArrow,
                        contentDescription = "Play/Pause",
                        modifier = Modifier.size(32.dp)
                    )
                }
                IconButton(onClick = onNextClick) {
                    Icon(Icons.Default.SkipNext, contentDescription = "Next", modifier = Modifier.size(36.dp))
                }
            }

            Spacer(modifier = Modifier.height(16.dp))
        }
    }
}

/**
 * 2. Equalizer & Bass Boost Bottom Sheet
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EqualizerBottomSheet(
    eqState: EqualizerUiState,
    onToggleEnabled: (Boolean) -> Unit,
    onBandLevelChanged: (Short, Short) -> Unit,
    onPresetSelected: (Int) -> Unit,
    onBassBoostChanged: (Short) -> Unit,
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
            // Header Row with Master Switch
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("Sound Equalizer", style = MaterialTheme.typography.titleLarge)
                Switch(
                    checked = eqState.isEnabled,
                    onCheckedChange = onToggleEnabled
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Presets Dropdown or Row
            if (eqState.presets.isNotEmpty()) {
                ScrollableTabRow(
                    selectedTabIndex = eqState.selectedPresetIndex.coerceAtLeast(0),
                    edgePadding = 0.dp,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    eqState.presets.forEachIndexed { index, presetName ->
                        Tab(
                            selected = eqState.selectedPresetIndex == index,
                            onClick = { onPresetSelected(index) },
                            text = { Text(presetName, maxLines = 1) }
                        )
                    }
                }
                Spacer(modifier = Modifier.height(20.dp))
            }

            // Frequency Dials (Seal Equalizer Nodes)
            if (eqState.bands.isNotEmpty()) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.SpaceEvenly,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    eqState.bands.forEach { band ->
                        SealEqualizerNode(
                            label = band.label,
                            frequencyHz = band.centerFreqHz,
                            currentLevelMb = band.currentLevelMb,
                            minLevelMb = eqState.minLevelMb,
                            maxLevelMb = eqState.maxLevelMb,
                            onLevelChanged = { newMb ->
                                if (eqState.isEnabled) {
                                    onBandLevelChanged(band.index, newMb)
                                }
                            }
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))
            HorizontalDivider()
            Spacer(modifier = Modifier.height(16.dp))

            // Bass Boost Controller
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("Bass Boost", style = MaterialTheme.typography.bodyLarge)
                Text("\${eqState.bassBoostStrength / 10}%", style = MaterialTheme.typography.bodyMedium)
            }
            Slider(
                value = eqState.bassBoostStrength.toFloat(),
                onValueChange = { onBassBoostChanged(it.toInt().toShort()) },
                valueRange = 0f..1000f,
                enabled = eqState.isEnabled,
                modifier = Modifier.fillMaxWidth()
            )

            Spacer(modifier = Modifier.height(24.dp))
        }
    }
}

/**
 * 3. Song Info & Technical Specs Dialog
 */
@Composable
fun SongInfoDialog(
    song: Song,
    onDismiss: () -> Unit,
    onOpenTagEditor: () -> Unit
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Track Information") },
        text = {
            Column(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                InfoRow(label = "Title", value = song.title)
                InfoRow(label = "Artist", value = song.artist)
                InfoRow(label = "Album", value = song.album)
                InfoRow(label = "Duration", value = SongFormatUtils.formatDuration(song.durationMs))
                InfoRow(label = "Bitrate", value = song.bitrate)
                InfoRow(label = "Sample Rate", value = song.sampleRate)
                InfoRow(label = "File Size", value = SongFormatUtils.formatFileSize(song.fileSizeBytes))
                InfoRow(label = "Format / MIME", value = song.mimeType)
                InfoRow(label = "File Path", value = song.filePath)
            }
        },
        confirmButton = {
            TextButton(onClick = onOpenTagEditor) {
                Text("Edit Tags")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Close")
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

  'ui/NinjaMusicPlayerRoot.kt': `package com.yourapp.musicplayer.ui

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
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import com.yourapp.musicplayer.audio.EqualizerBand
import com.yourapp.musicplayer.audio.EqualizerUiState
import com.yourapp.musicplayer.model.Song
import com.yourapp.musicplayer.ui.components.ParchmentTagEditorScreen
import com.yourapp.musicplayer.ui.components.PulsingChakraButton
import com.yourapp.musicplayer.ui.components.SpatialEqualizerBottomSheet
import com.yourapp.musicplayer.util.SongFormatUtils

// --- Thème Ninja / Sceau (Chakra d'encre & fond ténébreux) ---
private val ChakraAccent = Color(0xFFFF5722) // Lueur orangée / Feu ardent
private val SealSurface = Color(0xFF1E222B)

@Composable
fun NinjaMusicPlayerRoot(
    song: Song? = null,
    isPlaying: Boolean = false,
    currentPositionMs: Long = 34000L,
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
    // États locaux de repli pour l'aperçu unifié autonome
    var previewPlaying by remember { mutableStateOf(isPlaying) }
    var previewPositionMs by remember { mutableStateOf(currentPositionMs) }
    var previewSpatialStrength by remember { mutableStateOf<Short>(650) }
    var previewExtendedBass by remember { mutableStateOf<Short>(1100) }

    // État des feuilles modales (Sceaux et Parchemins)
    var showEqualizerSheet by remember { mutableStateOf(false) }
    var showTagEditorScroll by remember { mutableStateOf(false) }
    var showSongInfoDialog by remember { mutableStateOf(false) }

    // Chanson active (réelle ou exemple Ninja/Sceau)
    val currentSong = song ?: Song(
        id = 1L,
        uri = android.net.Uri.EMPTY,
        title = "Chant des Cinq Éléments",
        artist = "Maître du Fuinjutsu",
        album = "Matrice Sonore Vol. 1",
        genre = "Ninjutsu Ambiant",
        year = "2026",
        durationMs = 210000L,
        filePath = "/storage/emulated/0/Music/elemental_chant.mp3",
        fileSizeBytes = 8400000L,
        mimeType = "audio/mpeg",
        bitrate = "320 kbps",
        sampleRate = "44.1 kHz"
    )

    // État de l'égaliseur circulaire
    val activeEqState = if (eqState != null && eqState.bands.isNotEmpty()) {
        eqState
    } else {
        EqualizerUiState(
            isEnabled = true,
            bands = listOf(
                EqualizerBand(0, 60, "60Hz", 200),
                EqualizerBand(1, 230, "230Hz", -150),
                EqualizerBand(2, 910, "910Hz", 400),
                EqualizerBand(3, 3600, "3.6kHz", 100),
                EqualizerBand(4, 14000, "14kHz", 300)
            )
        )
    }

    val effectivePlaying = if (onPlayPauseClick != null) isPlaying else previewPlaying
    val effectivePositionMs = if (onSeek != null) currentPositionMs else previewPositionMs

    Box(modifier = Modifier.fillMaxSize()) {
        // --- ÉCRAN PRINCIPAL : Le Noyau d'Invocation ---
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.SpaceBetween
        ) {
            // Barre supérieure des Sceaux de Contrôle
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "✧ MATRICE AUDIO ✧",
                    style = MaterialTheme.typography.titleMedium,
                    color = ChakraAccent
                )
                Row {
                    IconButton(onClick = { showSongInfoDialog = true }) {
                        Icon(Icons.Default.Info, contentDescription = "Infos", tint = Color.White)
                    }
                    IconButton(onClick = { showEqualizerSheet = true }) {
                        Icon(Icons.Default.Equalizer, contentDescription = "Sceau d'Égalisation", tint = ChakraAccent)
                    }
                }
            }

            // Disque d'Invocation Central (Effet de Résonance)
            Box(
                modifier = Modifier
                    .size(260.dp)
                    .clip(CircleShape)
                    .background(SealSurface),
                contentAlignment = Alignment.Center
            ) {
                AsyncImage(
                    model = currentSong.uri,
                    contentDescription = "Sceau de l'album",
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(16.dp)
                        .clip(CircleShape),
                    contentScale = ContentScale.Crop
                )
                // Anneau d'énergie central si non chargé
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(8.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.Album,
                        contentDescription = null,
                        modifier = Modifier.size(80.dp),
                        tint = ChakraAccent.copy(alpha = 0.6f)
                    )
                }
            }

            // Titre et Artiste (Inscriptions)
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(
                    text = currentSong.title,
                    style = MaterialTheme.typography.titleLarge,
                    color = Color.White
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = currentSong.artist,
                    style = MaterialTheme.typography.bodyMedium,
                    color = Color.Gray
                )
            }

            // Ligne de Flux Temporel (Seekbar)
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
                        thumbColor = ChakraAccent,
                        activeTrackColor = ChakraAccent
                    )
                )
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(
                        SongFormatUtils.formatDuration(effectivePositionMs),
                        style = MaterialTheme.typography.labelSmall,
                        color = Color.Gray
                    )
                    Text(
                        SongFormatUtils.formatDuration(currentSong.durationMs),
                        style = MaterialTheme.typography.labelSmall,
                        color = Color.Gray
                    )
                }
            }

            // Commandes de Flux (Canalisation)
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
                    chakraColor = ChakraAccent,
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

        // --- SECTION MODALE 1 : Le Sceau Circulaire & Spatial 3D HD (Égaliseur) ---
        if (showEqualizerSheet) {
            SpatialEqualizerBottomSheet(
                eqState = activeEqState,
                spatialAudioStrength = if (eqState != null) eqState.spatialAudioStrength else previewSpatialStrength,
                extendedBassStrength = if (eqState != null) eqState.bassBoostStrength else previewExtendedBass,
                onToggleEnabled = { enabled -> onToggleEqualizer?.invoke(enabled) },
                onBandLevelChanged = { index, level -> onBandLevelChanged?.invoke(index, level) },
                onSpatialChanged = { nextSpatial ->
                    previewSpatialStrength = nextSpatial
                    onSpatialChanged?.invoke(nextSpatial)
                },
                onBassChanged = { nextBass ->
                    previewExtendedBass = nextBass
                    onBassChanged?.invoke(nextBass)
                },
                onDismiss = { showEqualizerSheet = false }
            )
        }

        // --- SECTION MODALE 2 : Le Rouleau de Parchemin (Éditeur de Balises) ---
        ParchmentTagEditorScreen(
            initialTitle = currentSong.title,
            initialArtist = currentSong.artist,
            initialAlbum = currentSong.album,
            initialYear = currentSong.year,
            initialGenre = currentSong.genre,
            isVisible = showTagEditorScroll,
            onSave = { newTitle, newArtist, newAlbum, newYear, newGenre ->
                if (onSaveTags != null) {
                    onSaveTags(currentSong, newTitle, newArtist, newAlbum, newYear, newGenre) {
                        showTagEditorScroll = false
                    }
                } else {
                    showTagEditorScroll = false
                }
            },
            onDismiss = { showTagEditorScroll = false }
        )

        // --- SECTION MODALE 3 : Boîte d'Informations Techniques ---
        if (showSongInfoDialog) {
            SongInfoDialog(
                song = currentSong,
                onDismiss = { showSongInfoDialog = false },
                onOpenTagEditor = {
                    showSongInfoDialog = false
                    showTagEditorScroll = true
                }
            )
        }
    }
}
`,

  'ui/components/PulsingChakraButton.kt': `package com.yourapp.musicplayer.ui.components

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
    // Animation de pulsation active uniquement lorsque la musique joue
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
        // Aura pulsée en arrière-plan
        if (isPlaying) {
            Box(
                modifier = Modifier
                    .size(80.dp)
                    .scale(pulseScale)
                    .background(chakraColor.copy(alpha = pulseAlpha), CircleShape)
            )
        }

        // Bouton principal d'invocation
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

  'ui/components/SpatialEqualizerBottomSheet.kt': `package com.yourapp.musicplayer.ui.components

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.yourapp.musicplayer.audio.EqualizerUiState

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SpatialEqualizerBottomSheet(
    eqState: EqualizerUiState,
    spatialAudioStrength: Short, // 0 à 1000 pour la spatialisation 3D
    extendedBassStrength: Short, // 0 à 2000 pour des basses ultra-profondes
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
                Text("Matrice 3D HD & Sceau Acoustique", style = MaterialTheme.typography.titleLarge)
                Switch(checked = eqState.isEnabled, onCheckedChange = onToggleEnabled)
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Cercles de fréquences (Nœuds du Sceau)
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

            // --- SECTION 3D HD : Audio Spatial & Surround ---
            Column(modifier = Modifier.fillMaxWidth()) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text("Champ Sonore Spatial 3D (HD)", style = MaterialTheme.typography.bodyMedium)
                    Text("\${spatialAudioStrength / 10}%", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.primary)
                }
                Slider(
                    value = spatialAudioStrength.toFloat(),
                    onValueChange = { onSpatialChanged(it.toInt().toShort()) },
                    valueRange = 0f..1000f,
                    enabled = eqState.isEnabled
                )
            }

            Spacer(modifier = Modifier.height(8.dp))

            // --- SECTION BASSES ÉTENDUES : Profondeur Maximale ---
            Column(modifier = Modifier.fillMaxWidth()) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text("Amplification Basses Profondes (Sub-Bass)", style = MaterialTheme.typography.bodyMedium)
                    Text("\${extendedBassStrength / 20}%", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.primary)
                }
                Slider(
                    value = extendedBassStrength.toFloat(),
                    onValueChange = { onBassChanged(it.toInt().toShort()) },
                    valueRange = 0f..2000f, // Plage élargie pour un impact physique réaliste
                    enabled = eqState.isEnabled
                )
            }

            Spacer(modifier = Modifier.height(24.dp))
        }
    }
}
`,

  'ui/components/SealEqualizerNode.kt': `package com.yourapp.musicplayer.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.layout.*
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.unit.dp
import com.yourapp.musicplayer.audio.EqualizerUiState
import kotlin.math.*

@Composable
fun SealEqualizerNode(
    label: String,
    frequencyHz: Int,
    currentLevelMb: Short,
    minLevelMb: Short,
    maxLevelMb: Short,
    onLevelChanged: (Short) -> Unit
) {
    // Convert decibels to an angle (-135° to +135°)
    val range = (maxLevelMb - minLevelMb).toFloat()
    val normalized = (currentLevelMb - minLevelMb).toFloat() / if (range == 0f) 1f else range
    var angle by remember(currentLevelMb) { mutableStateOf(normalized * 270f - 135f) }

    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier.padding(8.dp)
    ) {
        Box(
            modifier = Modifier
                .size(72.dp)
                .pointerInput(Unit) {
                    detectDragGestures { change, dragAmount ->
                        change.consume()
                        // Adjust angle based on vertical/horizontal drag
                        angle = (angle + dragAmount.x * 0.7f).coerceIn(-135f, 135f)
                        // Convert angle back to millibels
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

                // Outer energy ring (Seal border)
                drawCircle(
                    color = surfaceVariant,
                    radius = radius,
                    center = center,
                    style = Stroke(width = 3.dp.toPx())
                )

                // Active energy arc
                drawArc(
                    color = primaryColor,
                    startAngle = -135f,
                    sweepAngle = angle + 135f,
                    useCenter = false,
                    style = Stroke(width = 5.dp.toPx())
                )

                // Core indicator node
                val rad = Math.toRadians((angle).toDouble())
                val indicatorX = center.x + (radius - 10.dp.toPx()) * cos(rad).toFloat()
                val indicatorY = center.y + (radius - 10.dp.toPx()) * sin(rad).toFloat()
                drawCircle(
                    color = primaryColor,
                    radius = 4.dp.toPx(),
                    center = Offset(indicatorX, indicatorY)
                )
            }

            // Central text value display
            Text(
                text = "\${currentLevelMb / 100}dB",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurface
            )
        }

        Spacer(modifier = Modifier.height(4.dp))
        Text(text = label, style = MaterialTheme.typography.labelMedium)
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SealEqualizerBottomSheet(
    eqState: EqualizerUiState,
    onToggleEnabled: (Boolean) -> Unit,
    onBandLevelChanged: (Short, Short) -> Unit,
    onPresetSelected: (Int) -> Unit,
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
                Text("Matrice de Fréquence (Sceau Audio)", style = MaterialTheme.typography.titleLarge)
                Switch(checked = eqState.isEnabled, onCheckedChange = onToggleEnabled)
            }

            Spacer(modifier = Modifier.height(20.dp))

            // Circular nodes grid simulating frequency channels
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

            Spacer(modifier = Modifier.height(24.dp))
        }
    }
}
`,

  'ui/components/ParchmentTagEditorScreen.kt': `package com.yourapp.musicplayer.ui.components

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
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

// Parchment Color Palette (Ink & Scroll aesthetics)
private val ParchmentBackground = Color(0xFFF7F2E7)
private val ParchmentSurface = Color(0xFFEFE6D2)
private val ScrollBorderColor = Color(0xFF8C6D46)
private val ScrollRollerColor = Color(0xFF593E25)
private val InkTextColor = Color(0xFF2C221E)

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
                    .border(2.dp, ScrollBorderColor, RoundedCornerShape(8.dp))
                    .background(ParchmentBackground)
                    .padding(16.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                // --- Top Scroll Roller (Wooden Handle) ---
                Box(
                    modifier = Modifier
                        .fillMaxWidth(0.7f)
                        .height(14.dp)
                        .clip(RoundedCornerShape(7.dp))
                        .background(ScrollRollerColor)
                )

                Spacer(modifier = Modifier.height(16.dp))

                // Scroll Title Header
                Text(
                    text = "SCEAU DE METADONNÉES",
                    style = MaterialTheme.typography.titleMedium.copy(
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 2.sp,
                        color = InkTextColor
                    )
                )

                Text(
                    text = "Ajustement des inscriptions du rouleau",
                    style = MaterialTheme.typography.bodySmall.copy(
                        color = ScrollBorderColor
                    )
                )

                Spacer(modifier = Modifier.height(16.dp))

                // --- Calligraphic Ink Input Fields ---
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

                Spacer(modifier = Modifier.height(24.dp))

                // --- Action Seals (Buttons) ---
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceEvenly
                ) {
                    Button(
                        onClick = onDismiss,
                        colors = ButtonDefaults.buttonColors(containerColor = ScrollBorderColor)
                    ) {
                        Icon(Icons.Default.Close, contentDescription = "Annuler", tint = Color.White)
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Sceller", color = Color.White)
                    }

                    Button(
                        onClick = { onSave(title, artist, album, year, genre) },
                        colors = ButtonDefaults.buttonColors(containerColor = ScrollRollerColor)
                    ) {
                        Icon(Icons.Default.Check, contentDescription = "Enregistrer", tint = Color.White)
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Inscrire", color = Color.White)
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                // --- Bottom Scroll Roller (Wooden Handle) ---
                Box(
                    modifier = Modifier
                        .fillMaxWidth(0.7f)
                        .height(14.dp)
                        .clip(RoundedCornerShape(7.dp))
                        .background(ScrollRollerColor)
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
        label = { Text(label, color = ScrollBorderColor) },
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(4.dp),
        colors = OutlinedTextFieldDefaults.colors(
            focusedContainerColor = ParchmentSurface,
            unfocusedContainerColor = ParchmentSurface,
            focusedBorderColor = ScrollBorderColor,
            unfocusedBorderColor = ScrollBorderColor.copy(alpha = 0.6f),
            focusedTextColor = InkTextColor,
            unfocusedTextColor = InkTextColor
        ),
        keyboardOptions = KeyboardOptions(imeAction = ImeAction.Next),
        singleLine = true
    )
}
`,

  'ui/TagEditorSheet.kt': `package com.yourapp.musicplayer.ui

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import com.yourapp.musicplayer.model.Song
import com.yourapp.musicplayer.util.SongFormatUtils

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TagEditorSheet(
    song: Song,
    onDismiss: () -> Unit,
    onSave: (
        title: String,
        artist: String,
        album: String,
        year: String,
        genre: String,
        albumArtBytes: ByteArray?
    ) -> Unit
) {
    val context = LocalContext.current
    var title by remember(song.id) { mutableStateOf(song.title) }
    var artist by remember(song.id) { mutableStateOf(song.artist) }
    var album by remember(song.id) { mutableStateOf(song.album) }
    var year by remember(song.id) { mutableStateOf(song.year) }
    var genre by remember(song.id) { mutableStateOf(song.genre) }
    var selectedImageByteArray by remember(song.id) { mutableStateOf<ByteArray?>(null) }

    val artworkPicker = rememberLauncherForActivityResult(
        ActivityResultContracts.PickVisualMedia()
    ) { uri ->
        if (uri != null) {
            selectedImageByteArray = context.contentResolver
                .openInputStream(uri)
                ?.use { it.readBytes() }
        }
    }

    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 24.dp, vertical = 12.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text(
                text = "Edit Embedded Tags",
                style = MaterialTheme.typography.titleLarge
            )
            Text(
                text = "\${song.mimeType} · \${song.bitrate} · \${song.sampleRate} · \${SongFormatUtils.formatFileSize(song.fileSizeBytes)} · \${SongFormatUtils.formatDuration(song.durationMs)}",
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )

            OutlinedButton(
                onClick = {
                    artworkPicker.launch(
                        PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)
                    )
                },
                modifier = Modifier.fillMaxWidth()
            ) {
                Text(
                    if (selectedImageByteArray != null) {
                        "Cover Art Selected (\${selectedImageByteArray?.size ?: 0} bytes)"
                    } else {
                        "Choose Embedded Album Art (Optional)"
                    }
                )
            }

            OutlinedTextField(
                value = title,
                onValueChange = { title = it },
                label = { Text("Title") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth()
            )
            OutlinedTextField(
                value = artist,
                onValueChange = { artist = it },
                label = { Text("Artist") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth()
            )
            OutlinedTextField(
                value = album,
                onValueChange = { album = it },
                label = { Text("Album") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth()
            )

            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedTextField(
                    value = year,
                    onValueChange = { year = it },
                    label = { Text("Year") },
                    singleLine = true,
                    modifier = Modifier.weight(1f)
                )
                OutlinedTextField(
                    value = genre,
                    onValueChange = { genre = it },
                    label = { Text("Genre") },
                    singleLine = true,
                    modifier = Modifier.weight(1f)
                )
            }

            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 8.dp, bottom = 24.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                OutlinedButton(
                    onClick = onDismiss,
                    modifier = Modifier.weight(1f)
                ) {
                    Text("Cancel")
                }
                Button(
                    onClick = {
                        onSave(title, artist, album, year, genre, selectedImageByteArray)
                    },
                    modifier = Modifier.weight(1f)
                ) {
                    Text("Save Tags")
                }
            }
        }
    }
}
`,

};
