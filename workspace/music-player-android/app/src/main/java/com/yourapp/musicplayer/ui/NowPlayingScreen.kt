package com.yourapp.musicplayer.ui

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
                Text("${eqState.bassBoostStrength / 10}%", style = MaterialTheme.typography.bodyMedium)
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
