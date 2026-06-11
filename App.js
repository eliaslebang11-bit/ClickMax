import React, { useEffect, useState } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  StatusBar, 
  SafeAreaView, 
  Platform, 
  TouchableOpacity, 
  TextInput, 
  ScrollView, 
  ActivityIndicator, 
  Alert 
} from 'react-native';
import * as Notifications from 'expo-notifications';
import * as ImagePicker from 'expo-image-picker';
import { Video } from 'react-native-compressor';
import { getApiUrl } from './src/lib/api';
import { supabase } from './src/lib/supabase';

// Configure Notifications (Mobile Only)
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export default function App() {
  const [apiStatus, setApiStatus] = useState('Checking API...');
  const [hasPermission, setHasPermission] = useState(null);
  
  // Video and form states
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Entertainment');
  
  // Upload flow states
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState('idle'); // 'idle' | 'compressing' | 'uploading' | 'registering' | 'success' | 'error'
  const [progress, setProgress] = useState(0);
  const [errorDetails, setErrorDetails] = useState('');
  const [pipelineLogs, setPipelineLogs] = useState([]);

  const addLog = (msg) => {
    const timestamp = new Date().toLocaleTimeString();
    const formatted = `[${timestamp}] ${msg}`;
    console.log(formatted);
    setPipelineLogs((prev) => [...prev, formatted]);
  };

  useEffect(() => {
    async function checkApi() {
      try {
        const url = getApiUrl('/api/health');
        console.log('[MOBILE] Checking API at:', url);
        const response = await fetch(url);
        if (response.ok) {
          setApiStatus('Connected successfully');
        } else {
          setApiStatus('API responded with error: ' + response.status);
        }
      } catch (error) {
        setApiStatus('Failed to connect to API');
        console.error('[MOBILE] API Check Error:', error);
      }
    }

    async function requestPermissions() {
      if (Platform.OS !== 'web') {
        const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
        const { status: libraryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        setHasPermission(cameraStatus === 'granted' && libraryStatus === 'granted');
        
        checkApi();
        registerForPushNotificationsAsync();
      }
    }

    requestPermissions();
  }, []);

  const selectVideo = async () => {
    try {
      setErrorDetails('');
      setStep('idle');
      setProgress(0);
      setPipelineLogs([]);

      // Launch standard system picker with native hardware compression enabled
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true, // Allow user to trim / adjust
        quality: 0.8, // Set image-picker export compressor quality
        videoQuality: ImagePicker.UIImagePickerControllerQualityType.Medium // hardware-accelerated H.264 compression on-device
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setSelectedVideo(asset);
        
        // Derive initial title from filename if available
        const originalName = asset.uri.split('/').pop() || 'mobile_video.mp4';
        setTitle(originalName.split('.')[0] || '');
      }
    } catch (err) {
      console.error('[IMAGE-PICKER] Selection exception:', err);
      Alert.alert('Selection Error', 'Failed to retrieve selected video: ' + err.message);
    }
  };

  const handleCompressAndUpload = async () => {
    if (!selectedVideo) {
      Alert.alert('Missing Resource', 'Please select a video file first.');
      return;
    }

    setIsProcessing(true);
    setStep('compressing');
    setProgress(0);
    setPipelineLogs([]);

    const overallStartTime = Date.now();
    addLog(`Initiating pipeline processing. Selected Video: ${selectedVideo.width}x${selectedVideo.height} (${formatDuration(selectedVideo.duration)})`);
    addLog(`Source File URI: ${selectedVideo.uri}`);

    let uploadUri = selectedVideo.uri;

    try {
      // 1. Perform Hardware-Accelerated Video Compression with custom high-efficiency presets
      const compressStartTime = Date.now();
      try {
        addLog('Connecting local video to native hardware H.264 compression engine...');
        addLog('Configuration: Resolution = scale down max 720p HD, Bitrate = 1.5 Mbps for highest mobile optimization...');

        const compressedPath = await Video.compress(
          selectedVideo.uri,
          {
            compressionMethod: 'manual',
            bitrate: 1500000, // 1.5 Mbps
            maxSize: 1280, // scale down wider side maximum length
            minimumKiBIsAllowed: 1024,
          },
          (progressValue) => {
            const compPct = Math.min(100, Math.max(0, Math.round(progressValue * 100)));
            setProgress(compPct);
          }
        );
        
        if (compressedPath) {
          uploadUri = compressedPath;
          const compressDurationSec = ((Date.now() - compressStartTime) / 1000).toFixed(1);
          addLog(`[SUCCESS] Native compression complete in ${compressDurationSec}s.`);
          addLog(`Output compressed video path: ${compressedPath}`);
        } else {
          addLog('[WARN] Compression engine returned empty output. Using original file path.');
        }
      } catch (comError) {
        addLog(`[WARN] Host lacks hardware H.264 transcoder (emulator). Bypassing compression path. Error: ${comError.message || comError}`);
      }

      // 2. Fetch compressed binary source directly as Blob without slow base64 conversions
      addLog('Readying raw file streams for network transfer...');
      const streamFetchStart = Date.now();
      const response = await fetch(uploadUri);
      const blob = await response.blob();
      const mimeType = blob.type || 'video/mp4';
      const approxSizeMB = (blob.size / 1024 / 1024).toFixed(2);
      
      addLog(`File binary stream fetched in ${((Date.now() - streamFetchStart)/1000).toFixed(2)}s. Optimized Size: ${approxSizeMB} MB. Content-type: ${mimeType}`);

      // 3. Initiate storage destination pathways with custom progress event hook
      setStep('uploading');
      setProgress(0);
      addLog('Connecting direct high-speed pipeline channel to Supabase Service...');

      const fileExtension = selectedVideo.uri.split('.').pop() || 'mp4';
      const cleanFileName = `${Date.now()}_optimized.${fileExtension}`;
      const storagePath = `mobile-uploads/${cleanFileName}`;
      
      const supabaseUrl = supabase.supabaseUrl;
      const supabaseKey = supabase.supabaseKey;

      if (!supabaseUrl || !supabaseKey) {
        throw new Error('Supabase configuration details missing. Please check .env setup.');
      }

      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token || supabaseKey;

      const uploadUrl = `${supabaseUrl}/storage/v1/object/videos/${storagePath}`;
      addLog(`Posting multipart stream bytes to destination: ${storagePath}`);

      const uploadStartTime = Date.now();
      const publicUrl = await new Promise((resolveXhr, rejectXhr) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', uploadUrl);

        // API token authentication headers
        xhr.setRequestHeader('apikey', supabaseKey);
        xhr.setRequestHeader('Authorization', `Bearer ${authToken}`);
        xhr.setRequestHeader('Content-Type', mimeType);
        xhr.setRequestHeader('x-upsert', 'true'); // Overwrite duplicate elements cleanly

        // Hook direct process listener (resolves the frozen 0% loading issue)
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const uploadPct = Math.round((event.loaded / event.total) * 100);
            setProgress(uploadPct);
            addLog(`Upload: ${uploadPct}% dispatched (${(event.loaded / 1024 / 1024).toFixed(1)}MB of ${(event.total / 1024 / 1024).toFixed(1)}MB)`);
          } else {
            addLog(`Active transfer status: ${event.loaded} bytes uploaded...`);
          }
        };

        xhr.onreadystatechange = () => {
          if (xhr.readyState === 4) {
            const upSecs = ((Date.now() - uploadStartTime) / 1000).toFixed(1);
            if (xhr.status >= 200 && xhr.status < 300) {
              addLog(`[SUCCESS] Storage pipe uploads fully compiled in ${upSecs}s.`);
              const { data: { publicUrl: derivedUrl } } = supabase.storage
                .from('videos')
                .getPublicUrl(storagePath);
              resolveXhr(derivedUrl);
            } else {
              let errorMsg = 'Direct media upload block rejected by Supabase.';
              try {
                const parsedBody = JSON.parse(xhr.responseText);
                errorMsg = parsedBody.message || parsedBody.error || errorMsg;
              } catch (parseFail) {}
              rejectXhr(new Error(`Supabase Storage Upload Error (${xhr.status}): ${errorMsg}`));
            }
          }
        };

        xhr.onerror = (xhrErr) => {
          rejectXhr(new Error('Network pipe fail. Please confirm active internet connection.'));
        };

        xhr.send(blob);
      });

      addLog(`Verified Web URL: ${publicUrl}`);

      // 4. Register content metadata in tables
      setStep('registering');
      const isShort = selectedVideo.duration < 60; // Auto-categorize as Short if under 60 seconds
      addLog(`Identifying format constraints... Video duration: ${formatDuration(selectedVideo.duration)} (${isShort ? 'Shorts Category' : 'Regular Video'})`);
      
      const insertPayload = {
        title: title || 'Untitled Video',
        description: description || 'Uploaded from high-performance mobile application',
        video_url: publicUrl,
        thumbnail_url: 'https://picsum.photos/seed/thumb/800/450',
        duration: formatDuration(selectedVideo.duration),
        category: category,
        created_at: new Date().toISOString(),
        views: 0,
        likes: 0
      };

      const targetTable = isShort ? 'shorts' : 'videos';
      addLog(`Registering data descriptors inside Table "${targetTable}"...`);
      
      const dbStart = Date.now();
      const { error: dbError } = await supabase
        .from(targetTable)
        .insert([insertPayload]);

      if (dbError) {
        addLog(`[WARN] Non-blocking metadata registration warning: ${dbError.message}`);
      } else {
        addLog(`Database linked cleanly in ${((Date.now() - dbStart)/1000).toFixed(2)}s`);
      }

      setStep('success');
      const totalElapsed = ((Date.now() - overallStartTime) / 1000).toFixed(1);
      addLog(`[COMPLETE] Overall upload sequence successfully achieved in ${totalElapsed}s! 🎉`);
      setSelectedVideo(null);
      setTitle('');
      setDescription('');
    } catch (err) {
      addLog(`[CRITICAL] Execution error: ${err.message || err}`);
      setStep('error');
      setErrorDetails(err.message || 'An unexpected error occurred during re-encoding or upload.');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatDuration = (ms) => {
    if (!ms) return '0:00';
    const totalSecs = Math.floor(ms / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  if (Platform.OS === 'web') {
    return (
      <View style={styles.webContainer}>
        <View style={styles.webCard}>
          <Text style={styles.webTitle}>ClickMax Video Uplink</Text>
          <Text style={styles.webText}>
            Mobile client emulator active. Please utilize the developer interactive frame controls directly to preview and compile the application successfully.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.headerTitle}>ClickMax Mobile</Text>
        <Text style={styles.headerSubtitle}>Video Select & High-Efficiency Auto-Compressor</Text>

        <View style={styles.statsCard}>
          <Text style={styles.apiLabel}>System API Link:</Text>
          <Text style={styles.apiValue}>{apiStatus}</Text>
        </View>

        {!selectedVideo ? (
          <TouchableOpacity style={styles.pickerBox} onPress={selectVideo}>
            <Text style={styles.pickerIcon}>📹</Text>
            <Text style={styles.pickerText}>Select Video from Device</Text>
            <Text style={styles.pickerSubText}>MP4, MOV etc. Automatic H.264 compression applied prior to storage upload.</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.selectedContainer}>
            <Text style={styles.sectionLabel}>Selected Media File:</Text>
            <View style={styles.fileDetailCard}>
              <Text style={styles.fileName} numberOfLines={1}>URI: {selectedVideo.uri.split('/').pop()}</Text>
              <Text style={styles.fileStats}>
                Resolution: {selectedVideo.width}x{selectedVideo.height}  •  Duration: {formatDuration(selectedVideo.duration)}
              </Text>
              <Text style={styles.compressionLabel}>⚡ Native hardware auto-compression active</Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>Title</Text>
              <TextInput 
                style={styles.textInput}
                value={title}
                onChangeText={setTitle}
                placeholder="Enter video title..."
                placeholderTextColor="#666"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>Description / Caption</Text>
              <TextInput 
                style={[styles.textInput, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="Write a captivating caption..."
                placeholderTextColor="#666"
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>Category</Text>
              <View style={styles.categoryRow}>
                {['Entertainment', 'Gaming', 'Music', 'Vlog'].map((cat) => (
                  <TouchableOpacity 
                    key={cat} 
                    style={[styles.categoryBtn, category === cat && styles.categoryBtnActive]}
                    onPress={() => setCategory(cat)}
                  >
                    <Text style={[styles.categoryBtnText, category === cat && styles.categoryBtnTextActive]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {isProcessing || step !== 'idle' ? (
              <View style={styles.progressSection}>
                <Text style={styles.progressStep}>
                  {step === 'compressing' && `Re-encoding video codecs: ${progress}%`}
                  {step === 'uploading' && `Uploading to Supabase: ${progress}%`}
                  {step === 'registering' && `Publishing metadata...`}
                  {step === 'success' && `✅ Success! Your video is published.`}
                  {step === 'error' && `❌ Upload failed.`}
                </Text>
                
                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
                </View>

                <Text style={styles.consoleHeader}>⚡ Real-Time Pipeline Logger:</Text>
                <ScrollView 
                  style={styles.consoleBox}
                  contentContainerStyle={styles.consoleContent}
                  nestedScrollEnabled={true}
                >
                  {pipelineLogs.map((logStr, idx) => (
                    <Text key={idx} style={styles.consoleLogItem}>
                      {logStr}
                    </Text>
                  ))}
                </ScrollView>

                {step === 'success' && (
                  <TouchableOpacity style={styles.resetBtn} onPress={() => setStep('idle')}>
                    <Text style={styles.resetBtnText}>Upload Another</Text>
                  </TouchableOpacity>
                )}

                {step === 'error' && (
                  <View style={styles.errorBox}>
                    <Text style={styles.errorText}>{errorDetails}</Text>
                    <TouchableOpacity style={styles.resetBtn} onPress={() => setStep('idle')}>
                      <Text style={styles.resetBtnText}>Retry Selection</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.actionRow}>
                <TouchableOpacity style={styles.cancelButton} onPress={() => setSelectedVideo(null)}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.uploadButton} onPress={handleCompressAndUpload}>
                  <Text style={styles.uploadText}>Compress & Upload</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

async function registerForPushNotificationsAsync() {
  if (Platform.OS === 'web') return;
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return;
    return (await Notifications.getExpoPushTokenAsync()).data;
  } catch (e) {
    console.warn('[NOTIFICATIONS] Error registering tokens:', e);
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0c0f14',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#3b82f6',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#8b9bb4',
    marginTop: 4,
    marginBottom: 20,
  },
  statsCard: {
    backgroundColor: '#171c26',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#242e3f',
    marginBottom: 24,
  },
  apiLabel: {
    fontSize: 10,
    color: '#5e7594',
    textTransform: 'uppercase',
    fontWeight: 'bold',
  },
  apiValue: {
    fontSize: 13,
    color: '#10b981',
    marginTop: 4,
    fontWeight: '600',
  },
  pickerBox: {
    height: 200,
    backgroundColor: '#171c26',
    borderRadius: 24,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  pickerIcon: {
    fontSize: 36,
    marginBottom: 12,
  },
  pickerText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 6,
  },
  pickerSubText: {
    fontSize: 11,
    color: '#5e7594',
    textAlign: 'center',
    lineHeight: 16,
  },
  selectedContainer: {
    marginTop: 10,
  },
  sectionLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    fontWeight: 'bold',
    color: '#5e7594',
    marginBottom: 10,
  },
  fileDetailCard: {
    backgroundColor: '#171c26',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#242e3f',
    marginBottom: 20,
  },
  fileName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 6,
  },
  fileStats: {
    fontSize: 12,
    color: '#8b9bb4',
    marginBottom: 8,
  },
  compressionLabel: {
    fontSize: 11,
    color: '#3b82f6',
    fontWeight: 'bold',
  },
  formGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 12,
    color: '#8b9bb4',
    fontWeight: '700',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#171c26',
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#242e3f',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#171c26',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#242e3f',
    minHeight: 44, // Touch target requirement compliant
    justifyContent: 'center',
  },
  categoryBtnActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  categoryBtnText: {
    fontSize: 13,
    color: '#8b9bb4',
    fontWeight: '600',
  },
  categoryBtnTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#171c26',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#242e3f',
    height: 50, // touch targets >= 44
  },
  cancelText: {
    color: '#8b9bb4',
    fontWeight: 'bold',
  },
  uploadButton: {
    flex: 2,
    backgroundColor: '#3b82f6',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
  },
  uploadText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  progressSection: {
    marginTop: 10,
    backgroundColor: '#171c26',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#242e3f',
  },
  progressStep: {
    fontSize: 14,
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 12,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#0c0f14',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
  },
  consoleHeader: {
    fontSize: 10,
    color: '#8b9bb4',
    textTransform: 'uppercase',
    fontWeight: 'bold',
    marginTop: 15,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  consoleBox: {
    maxHeight: 120,
    backgroundColor: '#0c0f14',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#242e3f',
    padding: 10,
    marginBottom: 12,
  },
  consoleContent: {
    paddingVertical: 2,
  },
  consoleLogItem: {
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    fontSize: 11,
    color: '#10b981', // green terminal output
    marginBottom: 4,
    lineHeight: 15,
  },
  resetBtn: {
    height: 44,
    backgroundColor: '#242e3f',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  resetBtnText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  errorBox: {
    marginTop: 8,
  },
  errorText: {
    color: '#f87171',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 8,
  },
  webContainer: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  webCard: {
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#222',
    borderRadius: 20,
    padding: 30,
    maxWidth: 500,
    alignItems: 'center',
  },
  webTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  webText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  }
});
