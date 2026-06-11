package com.streamcore.upload

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.Crossfade
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

/**
 * Example Architecture: ViewModel that administers the pipeline background worker.
 * Connects the UI state triggers directly to the Kotlin Coroutine Scope.
 */
class VideoUploadViewModel(
    private val uploader: SupabaseVideoUploader
) : ViewModel() {

    // Expose uploader's internal reactive StateFlow
    val uploadState: StateFlow<UploadState> = uploader.uploadState

    fun startProcessingAndUpload(videoUri: Uri) {
        viewModelScope.launch {
            uploader.processAndUpload(
                videoUri = videoUri,
                bucketName = "videos",
                targetFileName = "android_upload_${System.currentTimeMillis()}.mp4"
            )
        }
    }
}

/**
 * Production-ready Jetpack Compose screen showing real-time feedback with dual stages:
 * Video Compression Progress & Live Network Upload Percentage.
 */
@Composable
fun VideoUploadScreen(viewModel: VideoUploadViewModel) {
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()
    val state by viewModel.uploadState.collectAsState()

    // Android gallery picker
    val videoPickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        if (uri != null) {
            viewModel.startProcessingAndUpload(uri)
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF121214)) // Deep, sleek dark background
            .padding(24.dp),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
            modifier = Modifier.fillMaxWidth()
        ) {
            // Elegant Header
            Text(
                text = "StreamCore Uploader",
                fontSize = 24.sp,
                fontWeight = FontWeight.Bold,
                color = Color.White,
                modifier = Modifier.padding(bottom = 8.dp)
            )
            
            Text(
                text = "Optimized Multi-Stage Streaming Pipeline",
                fontSize = 14.sp,
                color = Color.Gray,
                modifier = Modifier.padding(bottom = 32.dp)
            )

            // Dynamic progression cards
            Crossfade(targetState = state, label = "state_transition") { currentState ->
                when (currentState) {
                    is UploadState.Idle -> {
                        Button(
                            onClick = { videoPickerLauncher.launch("video/*") },
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF3B82F6)),
                            contentPadding = PaddingValues(horizontal = 32.dp, vertical = 16.dp),
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Text("Select video to upload", fontWeight = FontWeight.SemiBold, fontSize = 16.sp)
                        }
                    }

                    is UploadState.Preparing -> {
                        ProgressCard(
                            title = "Preparing Pipeline",
                            subtitle = "Analyzing file descriptors & caching variables...",
                            progressFraction = null,
                            footerText = "Original size: ${(currentState.originalSizeBytes / 1024.0 / 1024.0).format(2)} MB"
                        )
                    }

                    is UploadState.Compressing -> {
                        ProgressCard(
                            title = "Stage 1: Hardware Compression",
                            subtitle = "Compressing content with H.264 codecs to reduce network payload...",
                            progressFraction = currentState.progress / 100f,
                            footerText = "Compression Level: ${currentState.progress.toInt()}%"
                        )
                    }

                    is UploadState.Uploading -> {
                        val uploadedMb = currentState.bytesUploaded / 1024.0 / 1024.0
                        val totalMb = currentState.totalBytes / 1024.0 / 1024.0
                        val speedStr = if (currentState.speedKbps > 1024) {
                            "${(currentState.speedKbps / 1024.0).format(2)} Mbps"
                        } else {
                            "${currentState.speedKbps.toInt()} Kbps"
                        }
                        
                        ProgressCard(
                            title = "Stage 2: Live Supabase Transfer",
                            subtitle = "Streaming highly optimized byte chunks to public storage bucket...",
                            progressFraction = currentState.progress / 100f,
                            footerText = "Uploaded: ${uploadedMb.format(1)}MB / ${totalMb.format(1)}MB (${currentState.progress.toInt()}%)\nNetwork Speed: $speedStr"
                        )
                    }

                    is UploadState.Success -> {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Card(
                                colors = CardDefaults.cardColors(containerColor = Color(0xFF065F46)),
                                shape = RoundedCornerShape(16.dp),
                                modifier = Modifier.padding(16.dp)
                            ) {
                                Column(
                                    modifier = Modifier.padding(24.dp),
                                    horizontalAlignment = Alignment.CenterHorizontally
                                ) {
                                    Text("✓ Upload Succeeded!", fontWeight = FontWeight.Bold, color = Color.White, fontSize = 18.sp)
                                    Spacer(modifier = Modifier.height(8.dp))
                                    Text(
                                        text = "Your media file is ready for global streaming distribution.",
                                        color = Color(0xFFA7F3D0),
                                        fontSize = 13.sp,
                                        modifier = Modifier.padding(bottom = 12.dp)
                                    )
                                }
                            }
                            
                            Spacer(modifier = Modifier.height(16.dp))
                            
                            Button(
                                onClick = { videoPickerLauncher.launch("video/*") },
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF374151))
                            ) {
                                Text("Upload another video")
                            }
                        }
                    }

                    is UploadState.Error -> {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Card(
                                colors = CardDefaults.cardColors(containerColor = Color(0xFF991B1B)),
                                shape = RoundedCornerShape(16.dp),
                                modifier = Modifier.padding(16.dp)
                            ) {
                                Column(modifier = Modifier.padding(20.dp)) {
                                    Text("⚠ Connection Fault", fontWeight = FontWeight.Bold, color = Color.White)
                                    Spacer(modifier = Modifier.height(8.dp))
                                    Text(currentState.message, color = Color(0xFFFECACA), fontSize = 12.sp)
                                }
                            }
                            Spacer(modifier = Modifier.height(16.dp))
                            Button(
                                onClick = { videoPickerLauncher.launch("video/*") },
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF3B82F6))
                            ) {
                                Text("Retry Upload")
                            }
                        }
                    }
                }
            }
        }
    }
}

/**
 * Reusable visual wrapper for showing steps.
 * Provides a clean progress bar, dynamic status texts, and keeps layout state steady.
 */
@Composable
fun ProgressCard(
    title: String,
    subtitle: String,
    progressFraction: Float?,
    footerText: String
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 8.dp),
        colors = CardDefaults.cardColors(containerColor = Color(0xFF1E1E24)),
        shape = RoundedCornerShape(16.dp),
    ) {
        Column(
            modifier = Modifier.padding(24.dp)
        ) {
            Text(title, fontWeight = FontWeight.Bold, color = Color.White, fontSize = 18.sp)
            Spacer(modifier = Modifier.height(6.dp))
            Text(subtitle, color = Color.Gray, fontSize = 13.sp, lineHeight = 18.sp)
            
            Spacer(modifier = Modifier.height(24.dp))
            
            if (progressFraction != null) {
                LinearProgressIndicator(
                    progress = progressFraction,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(8.dp)
                        .clip(RoundedCornerShape(4.dp)),
                    color = Color(0xFF3B82F6),
                    trackColor = Color(0xFF2E2E38)
                )
            } else {
                LinearProgressIndicator(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(8.dp)
                        .clip(RoundedCornerShape(4.dp)),
                    color = Color(0xFF3B82F6),
                    trackColor = Color(0xFF2E2E38)
                )
            }

            Spacer(modifier = Modifier.height(16.dp))
            
            Text(
                text = footerText,
                color = Color(0xFF9CA3AF),
                fontSize = 12.sp,
                fontWeight = FontWeight.Medium,
                lineHeight = 16.sp,
                modifier = Modifier.align(Alignment.Start)
            )
        }
    }
}

// Inline helper for formatting strings cleanly on Android views
private fun Double.format(digits: Int) = String.format("%.${digits}f", this)
