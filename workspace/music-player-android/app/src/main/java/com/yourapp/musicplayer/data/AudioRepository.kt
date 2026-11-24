package com.yourapp.musicplayer.data

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
        val selection = "${MediaStore.Audio.Media.IS_MUSIC} != 0 AND ${MediaStore.Audio.Media.DURATION} >= 30000"
        val sortOrder = "${MediaStore.Audio.Media.TITLE} ASC"

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
                    if (kbps != null && kbps > 0) "$kbps kbps" else "Unknown"
                } else {
                    "Unknown"
                }

                // Extract Sample Rate (Hz -> convert to kHz if applicable)
                // Note: METADATA_KEY_SAMPLERATE is supported on API 29+
                val sampleRateHz = retriever.extractMetadata(19 /* METADATA_KEY_SAMPLERATE */)
                val sampleRateFormatted = if (!sampleRateHz.isNullOrEmpty()) {
                    val hz = sampleRateHz.toIntOrNull()
                    if (hz != null) {
                        if (hz >= 1000) String.format("%.1f kHz", hz / 1000.0) else "$hz Hz"
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
