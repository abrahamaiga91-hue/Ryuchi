package com.yourapp.musicplayer.data

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
            "editable_${System.currentTimeMillis()}.${originalFile.extension}"
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
        } ?: throw IllegalStateException("Unable to open destination file descriptor for $targetUri")
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
