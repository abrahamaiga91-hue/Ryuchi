package com.shinobi.musicplayer.data

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
            "editable_${System.currentTimeMillis()}.${originalFile.extension}"
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
