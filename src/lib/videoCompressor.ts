/**
 * Compresses an uploaded video file in the browser using HTML5 Canvas re-encoding and MediaRecorder.
 * It dynamically scales the video format and constraints bitrates to produce lightweight visual streaming files.
 */
export async function compressVideo(
  file: File,
  onProgress?: (progress: number) => void
): Promise<File> {
  return new Promise((resolve) => {
    // Skip compression for exceptionally small inputs to optimize speed
    if (file.size < 1.5 * 1024 * 1024) {
      console.log(`[COMPRESSOR] File is already small (${(file.size / 1024 / 1024).toFixed(2)} MB). Skipping compression.`);
      if (onProgress) onProgress(100);
      return resolve(file);
    }

    console.log(`[COMPRESSOR] Original size: ${(file.size / 1024 / 1024).toFixed(2)} MB`);
    if (onProgress) onProgress(1);

    const video = document.createElement("video");
    video.preload = "auto";
    video.muted = true;
    video.playsInline = true;

    const fileUrl = URL.createObjectURL(file);
    video.src = fileUrl;

    let cleanupDone = false;
    const cleanup = () => {
      if (cleanupDone) return;
      cleanupDone = true;
      try {
        URL.revokeObjectURL(fileUrl);
        video.pause();
        video.src = "";
        video.load();
      } catch (e) {
        console.warn("[COMPRESSOR] Cleanup warning:", e);
      }
    };

    // Set a maximum timeout (e.g., 2 minutes) for safety to prevent infinite loops
    const safetyTimeout = setTimeout(() => {
      console.warn("[COMPRESSOR] Safety timeout reached! Falling back to original video.");
      cleanup();
      resolve(file);
    }, 120000);

    video.onloadedmetadata = () => {
      try {
        const duration = video.duration || 10;
        const originalWidth = video.videoWidth || 1280;
        const originalHeight = video.videoHeight || 720;

        // Downscale resolutions for fast uploads & streaming
        const MAX_DIMENSION = 960; 
        let targetWidth = originalWidth;
        let targetHeight = originalHeight;

        if (originalWidth > MAX_DIMENSION || originalHeight > MAX_DIMENSION) {
          if (originalWidth > originalHeight) {
            targetHeight = Math.round((originalHeight * MAX_DIMENSION) / originalWidth);
            targetWidth = MAX_DIMENSION;
          } else {
            targetWidth = Math.round((originalWidth * MAX_DIMENSION) / originalHeight);
            targetHeight = MAX_DIMENSION;
          }
        }

        // Must be even dimensions
        targetWidth = targetWidth % 2 === 0 ? targetWidth : targetWidth - 1;
        targetHeight = targetHeight % 2 === 0 ? targetHeight : targetHeight - 1;

        console.log(`[COMPRESSOR] Target resolution: ${targetWidth}x${targetHeight} (from ${originalWidth}x${originalHeight})`);

        // Check canvas element capture capabilities
        const canvas = document.createElement("canvas");
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext("2d");

        const hasCaptureStream = !!(canvas.captureStream || (canvas as any).mozCaptureStream);
        if (!ctx || !hasCaptureStream) {
          throw new Error("Local device capabilities do not support real-time stream re-encoding.");
        }

        const fps = 30;
        const videoStream = canvas.captureStream ? canvas.captureStream(fps) : (canvas as any).mozCaptureStream(fps);

        // Try getting original audio track
        let sourceStream = null;
        try {
          sourceStream = (video as any).captureStream
            ? (video as any).captureStream()
            : ((video as any).mozCaptureStream ? (video as any).mozCaptureStream() : null);
        } catch (audErr) {
          console.warn("[COMPRESSOR] Failed to capture audio track directly from video element:", audErr);
        }

        const audioTrack = sourceStream ? sourceStream.getAudioTracks()[0] : null;

        // Add tracks to recording stream
        const outputStream = new MediaStream();
        if (videoStream.getVideoTracks().length > 0) {
          outputStream.addTrack(videoStream.getVideoTracks()[0]);
        }
        if (audioTrack) {
          outputStream.addTrack(audioTrack);
          console.log("[COMPRESSOR] Embedded original audio track.");
        }

        // Try supported types
        const codecs = [
          "video/mp4;codecs=h264",
          "video/webm;codecs=vp9",
          "video/webm;codecs=h264",
          "video/webm;codecs=vp8",
          "video/webm",
          "video/mp4"
        ];

        let selectedCodec = "";
        for (const codec of codecs) {
          if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(codec)) {
            selectedCodec = codec;
            break;
          }
        }

        const isWebm = selectedCodec.includes("webm");
        const ext = isWebm ? "webm" : "mp4";

        const options = {
          mimeType: selectedCodec || undefined,
          // Limit video bitrate to 1.5 Mbps for ultimate social mobile size saving
          videoBitsPerSecond: 1500000, 
          audioBitsPerSecond: 128000
        };

        const recorder = new MediaRecorder(outputStream, options);
        const chunks: Blob[] = [];

        recorder.ondataavailable = (ev) => {
          if (ev.data && ev.data.size > 0) {
            chunks.push(ev.data);
          }
        };

        recorder.onstop = () => {
          clearTimeout(safetyTimeout);
          try {
            cleanup();
            const mimeType = selectedCodec || (isWebm ? "video/webm" : "video/mp4");
            const compressedBlob = new Blob(chunks, { type: mimeType });

            // If compressed is somehow bigger, discard it and use original
            if (compressedBlob.size >= file.size || compressedBlob.size < 1000) {
              console.log("[COMPRESSOR] Compressed file was same or larger than original. Using original.");
              resolve(file);
            } else {
              const compressedFile = new File([compressedBlob], file.name.replace(/\.[^/.]+$/, "") + `_compressed.${ext}`, {
                type: mimeType,
                lastModified: Date.now()
              });
              console.log(`[COMPRESSOR] Compressed from ${(file.size / 1024 / 1024).toFixed(2)} MB to ${(compressedFile.size / 1024 / 1024).toFixed(2)} MB (${((1 - compressedFile.size / file.size) * 100).toFixed(1)}% size deduction)`);
              resolve(compressedFile);
            }
          } catch (stopErr) {
            console.error("[COMPRESSOR] Custom stop handler crash:", stopErr);
            resolve(file);
          }
        };

        // Start recording playback
        recorder.start();
        video.muted = false;
        video.volume = 0.01; // Keep it practically inaudible during compression rendering
        video.play().catch(playErr => {
          console.warn("[COMPRESSOR] Autoplay blocker triggered, muting to force playback:", playErr);
          video.muted = true;
          video.play().catch(() => {});
        });

        const drawLoop = () => {
          if (cleanupDone) return;
          if (video.ended) {
            recorder.stop();
            return;
          }

          try {
            ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
          } catch (err) {
            console.error("[COMPRESSOR] Frame draw error:", err);
          }

          if (onProgress) {
            const pct = Math.min(99, Math.round((video.currentTime / duration) * 100));
            onProgress(pct);
          }

          requestAnimationFrame(drawLoop);
        };

        requestAnimationFrame(drawLoop);

      } catch (innerErr) {
        console.warn("[COMPRESSOR] Compression failed to initialize, falling back to original video:", innerErr);
        clearTimeout(safetyTimeout);
        cleanup();
        resolve(file);
      }
    };

    video.onerror = (err) => {
      console.warn("[COMPRESSOR] Video load error, falling back to original file:", err);
      clearTimeout(safetyTimeout);
      cleanup();
      resolve(file);
    };
  });
}
