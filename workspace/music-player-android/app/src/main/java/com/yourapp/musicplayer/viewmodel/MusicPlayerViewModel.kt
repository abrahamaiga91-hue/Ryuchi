package com.yourapp.musicplayer.viewmodel

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
