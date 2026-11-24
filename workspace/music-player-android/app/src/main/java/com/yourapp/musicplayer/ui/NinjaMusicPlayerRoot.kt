package com.yourapp.musicplayer.ui

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
