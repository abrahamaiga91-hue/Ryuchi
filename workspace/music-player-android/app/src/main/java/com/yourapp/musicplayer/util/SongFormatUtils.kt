package com.yourapp.musicplayer.util

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
