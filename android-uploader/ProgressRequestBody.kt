package com.streamcore.upload

import okhttp3.MediaType
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.RequestBody
import okio.BufferedSink
import java.io.File
import java.io.FileInputStream
import java.io.IOException

/**
 * A custom OkHttp RequestBody implementation designed specifically to prevent Out-Of-Memory (OOM) 
 * issues during large file uploads on Android, while providing real-time upload progress feedback.
 * 
 * Instead of loading the entire file into device RAM, this class streams the file in chunks 
 * of 8KB directly into the network buffer.
 * 
 * @property file The local file to be uploaded.
 * @property contentType The mime type of the target payload (e.g., "video/mp4").
 * @property onProgress Callback invoked during content transmission, detailing current bytes sent & total bytes.
 */
class ProgressRequestBody(
    private val file: File,
    private val contentType: String,
    private val onProgress: (bytesWritten: Long, totalBytes: Long) -> Unit
) : RequestBody() {

    override fun contentType(): MediaType? {
        return contentType.toMediaTypeOrNull()
    }

    override fun contentLength(): Long {
        return file.length()
    }

    @Throws(IOException::class)
    override fun writeTo(sink: BufferedSink) {
        val totalBytes = file.length()
        if (totalBytes <= 0L) {
            // Avoid divide by zero issues with empty files
            onProgress(0L, 1L)
            return
        }

        val buffer = ByteArray(DEFAULT_BUFFER_SIZE)
        val fileInputStream = FileInputStream(file)
        var bytesUploaded: Long = 0

        fileInputStream.use { input ->
            var read: Int
            while (input.read(buffer).also { read = it } != -1) {
                // Write the chunk data directly to the OkHttp network engine sink
                sink.write(buffer, 0, read)
                bytesUploaded += read
                
                // Flush the sink to force transmission of the chunk over the socket
                sink.flush()
                
                // Notify the callback with updated figures
                onProgress(bytesUploaded, totalBytes)
            }
        }
    }

    companion object {
        /**
         * 8KB buffer chunk size is standard for optimal throughput balancing on mobile connections.
         */
        private const val DEFAULT_BUFFER_SIZE = 8192
    }
}
