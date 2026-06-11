# Jetpack Android High-Performance Video Upload Pipeline for Supabase Storage

This package provides a production-ready, highly optimized Kotlin pipeline designed specifically to solve the common issues with uploading long videos to Supabase Storage from an Android application:
- **No Stuck 0% UI**: Divides processing logically into sequential stages (`Preparing`, `Compressing`, `Uploading`, `Success/Error`) so the user is always informed of active progress.
- **Hardware-Accelerated Video Compression**: Uses Google’s official modern **Jetpack Media3 Transformer** API under the hood to perform extremely fast, low-level compression using device hardware encoders (reducing raw capture file sizes by over 80%).
- **Memory-Safe Chunked Streaming**: Implements an custom chunking HTTP RequestBody streaming bytes directly in 8KB buffers, preventing high-memory spikes and **Out of Memory (OOM) app crashes** even with 1GB+ files.
- **Detailed Logcat Metrics telemetry**: Tracks and logs metrics to sub-millisecond precision, making it trivial to diagnose whether upload delays are due to compression speeds, network conditions, or Supabase server response processing.

---

## 📂 File Architecture & Where to Place Them

Copy the generated Kotlin source code files directly into your Android Studio project under your targeted package namespace (e.g. `app/src/main/java/com/streamcore/upload/`):

1. **`UploadState.kt`**
   - **Purpose**: A Kotlin Sealed Class defining the reactively observable states.
   - **Path**: `com/streamcore/upload/UploadState.kt`
   
2. **`ProgressRequestBody.kt`**
   - **Purpose**: Subclass of standard OkHttp `RequestBody` doing continuous chunk transmission & triggering granular upload percentages.
   - **Path**: `com/streamcore/upload/ProgressRequestBody.kt`

3. **`SupabaseVideoUploader.kt`**
   - **Purpose**: Core engine containing size filtering, compression, async network requests, memory-safe garbage collection, and diagnostic logging.
   - **Path**: `com/streamcore/upload/SupabaseVideoUploader.kt`

4. **`UsageExample.kt`**
   - **Purpose**: A full Jetpack Compose screen showing multi-stage progress indicators and a supporting MVVM architecture layout.
   - **Path**: `com/streamcore/upload/UsageExample.kt`

---

## 🛠️ Step 1: Add App Dependencies

Open your Android **`app/build.gradle`** (or `app/build.gradle.kts`) and add the dependencies:

```groovy
dependencies {
    // 1. Android Jetpack Media3 Transformer for Hardware-Accelerated Video Compression
    implementation "androidx.media3:media3-transformer:1.2.0"
    implementation "androidx.media3:media3-effect:1.2.0" // Required for filter pipelines
    implementation "androidx.media3:media3-common:1.2.0"

    // 2. High Performance networking client (OkHttp)
    implementation "com.squareup.okhttp3:okhttp:4.12.0"

    // 3. Kotlin Coroutines (for background processing & async threading)
    implementation "org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3"
    implementation "org.jetbrains.kotlinx:kotlinx-coroutines-core:1.7.3"
    
    // 4. Lifecycle Extensions for MVVM integration
    implementation "androidx.lifecycle:lifecycle-viewmodel-ktx:2.7.0"
    implementation "androidx.lifecycle:lifecycle-viewmodel-compose:2.7.0"
}
```

Make sure you have declared internet access in your `AndroidManifest.xml`:
```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" android:maxSdkVersion="32" />
```

---

## ⚙️ Step 2: Initialize & Launch the Pipeline

To use the uploader, instantiate it with your Supabase credentials (typically inside your Dependency Injection context e.g., Hilt, or passed into your ViewModel):

```kotlin
// Retrieve or define your credentials
val supabaseUrl = "https://your-project-id.supabase.co"
val supabaseAnonKey = "your-anon-role-or-service-key"

// Instantiate uploader
val videoUploader = SupabaseVideoUploader(
    context = applicationContext,
    supabaseUrl = supabaseUrl,
    supabaseAnonKey = supabaseAnonKey
)

// Inject into your ViewModel
val viewModel = VideoUploadViewModel(videoUploader)
```

Now, trigger the upload within any coroutine scope by passing a content URI selector value:
```kotlin
viewModel.startProcessingAndUpload(selectedVideoUri)
```

---

## 🔍 Step 3: Read Logcat to Pinpoint Bottlenecks

We have embedded customized microsecond timing metrics. During file preparation, compression, and network transport, our class logs specific outputs.

To view these metrics, open your Logcat analyzer in Android Studio and filter for **`SupabaseUploader`**:

### Understanding the Diagnostic Log Readout:

1. **When starting the task**:
   ```
   D/SupabaseUploader: [a1b2c3d4...] Resolved local file. Size: 254.30 MB
   I/SupabaseUploader: [a1b2c3d4...] File is larger than 1.5MB. Initiating hardware compression...
   ```

2. **Stage 1 (Hardware Compression Performance)**:
   ```
   I/SupabaseUploader: [a1b2c3d4...] ====== COMPRESSION METRICS ======
   I/SupabaseUploader: [a1b2c3d4...] Duration: 12500 ms (12.5 seconds)
   I/SupabaseUploader: [a1b2c3d4...] Original Size: 254.30 MB
   I/SupabaseUploader: [a1b2c3d4...] Compressed Size: 41.20 MB
   I/SupabaseUploader: [a1b2c3d4...] Data Reduction: 83.8% space saved.
   I/SupabaseUploader: [a1b2c3d4...] Speed: 20.34 KB/ms
   I/SupabaseUploader: [a1b2c3d4...] ===================================
   ```
   *💡 Actionable Metric*: If the duration takes too long (e.g., > 1.5x length of the video), the bottleneck resides on the device's hardware chip limitations. The file itself is now **over 80% lighter** to upload over mobile networks!

3. **Stage 2 (Real-Time Chunk Upload Progress)**:
   ```
   V/SupabaseUploader: [a1b2c3d4...] Send Progress: 12.4% | Speed: 4096.5 Kbps | Uploaded: 5.10MB / 41.20MB
   V/SupabaseUploader: [a1b2c3d4...] Send Progress: 50.8% | Speed: 5120.2 Kbps | Uploaded: 20.92MB / 41.20MB
   ```
   *💡 Actionable Metric*: If the transmission speed (Kbps) drops very low (e.g., < 250 Kbps), the upload is slow purely because of local cellular network conditions.

4. **Response Processing (Supabase Gateway)**:
   ```
   I/SupabaseUploader: [a1b2c3d4...] ====== UPLOAD SUCCESS ======
   I/SupabaseUploader: [a1b2c3d4...] Net Connection & Send Duration: 8200 ms
   I/SupabaseUploader: [a1b2c3d4...] Supabase API process duration: 150 ms
   I/SupabaseUploader: [a1b2c3d4...] Overall Average Upload Speed: 5024.39 Kbps
   I/SupabaseUploader: [a1b2c3d4...] Public Destination: https://...supabase.co/storage/v1/object/public/videos/video_file.mp4
   I/SupabaseUploader: [a1b2c3d4...] Total Pipeline Duration: 20850 ms
   I/SupabaseUploader: [a1b2c3d4...] =================================
   ```
   *💡 Actionable Metric*: `Supabase API process duration` measures exactly how long the Supabase server took to write the file, index the metadata, and write the row to the storage database *after* all chunks were transferred. If this is very high (e.g. > 10,000ms after sending 100% of the bytes), it indicates a database indexing bottleneck or server-side overload in your Supabase instance, rather than a network speed issue.

---

## 🔒 Step 4: Configure Supabase Storage Settings

To prevent your storage uploads from throwing connection drops, ensure the following policies are configured in your **Supabase Dashboard**:

1. **Increase Max File Size Limit**:
   - Navigate to **Storage** -> **Settings** -> select your bucket.
   - Adjust **Allowed Max File Size** to at least **100MB** or **500MB** (depending on your video caps). Default is often too small!

2. **Add Bucket Row Level Security (RLS) policies**:
   Allow your client to upload directly by granting access under `INSERT` operations:
   ```sql
   -- Allow users to insert files into the 'videos' bucket
   CREATE POLICY "Allow public uploads" 
   ON storage.objects FOR INSERT 
   TO public 
   WITH CHECK (bucket_id = 'videos');
   ```
