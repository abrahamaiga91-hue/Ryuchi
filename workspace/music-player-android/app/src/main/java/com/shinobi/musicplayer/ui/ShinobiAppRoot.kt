package com.shinobi.musicplayer.ui

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
