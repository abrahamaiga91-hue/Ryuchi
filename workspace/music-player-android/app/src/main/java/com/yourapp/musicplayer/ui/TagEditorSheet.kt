package com.yourapp.musicplayer.ui

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
                text = "${song.mimeType} · ${song.bitrate} · ${song.sampleRate} · ${SongFormatUtils.formatFileSize(song.fileSizeBytes)} · ${SongFormatUtils.formatDuration(song.durationMs)}",
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
                        "Cover Art Selected (${selectedImageByteArray?.size ?: 0} bytes)"
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
