package com.streamcore.upload

/**
 * Represents the detailed progression state of a video processing and upload operation.
 * Separates work stages so the user interface remains reactive, precise, and never stuck.
 */
sealed class UploadState {
    
    /**
     * Initial idle state. No action has started yet.
     */
    object Idle : UploadState()

    /**
     * Sizing lookups, caching inputs, or file access preparation before starting.
     * Starts with a known or calculated preliminary size.
     */
    data class Preparing(val originalSizeBytes: Long) : UploadState()

    /**
     * Active hardware-accelerated video video compression phase.
     * @param progress Percentage of video compression completed (0.0 to 100.0).
     */
    data class Compressing(val progress: Float) : UploadState()

    /**
     * Active cloud storage stream upload phase.
     * @param progress Percentage of the compressed file already uploaded (0.0 to 100.0).
     * @param bytesUploaded Total bytes sent to Supabase.
     * @param totalBytes Total compressed file size.
     * @param speedKbps Active network upload transmission speed in Kilobits per second (Kbps).
     */
    data class Uploading(
        val progress: Float,
        val bytesUploaded: Long,
        val totalBytes: Long,
        val speedKbps: Double
    ) : UploadState()

    /**
     * Successful completion.
     * @param publicUrl Publicly reachable content streaming URL for the newly registered video asset.
     */
    data class Success(val publicUrl: String) : UploadState()

    /**
     * Terminal failure state. Holds debug info and technical stack exception warnings.
     * @param message Human friendly string indicating the error context.
     * @param throwable Exception details that triggered the capture.
     */
    data class Error(val message: String, val throwable: Throwable) : UploadState()
}
