package com.yourapp.musicplayer

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
