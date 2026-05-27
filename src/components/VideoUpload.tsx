import React, { useState, useRef, useEffect } from 'react';
import { Upload, Video, Image as ImageIcon, Loader2, CheckCircle2, AlertCircle, UserCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';
import { useVideoStats } from '../context/VideoContext';
import { supabaseService } from '../services/supabaseService';

interface UploadProgress {
  status: 'idle' | 'uploading' | 'success' | 'error';
  message: string;
}

export const VideoUpload: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Entertainment');
  const [progress, setProgress] = useState<UploadProgress>({ status: 'idle', message: '' });
  const [uploadPercent, setUploadPercent] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  
  const [session, setSession] = useState<any>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const { refreshData } = useVideoStats();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setCheckingSession(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignIn = async () => {
    try {
      // Direct sign in for simplicity in this environment
      // Or show a simple prompt to use anonymous if desired, 
      // but usually OAuth is preferred.
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.href
        }
      });
      if (error) throw error;
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.size > 100 * 1024 * 1024) {
        alert("File too large (max 100MB)");
        return;
      }
      
      setFile(selectedFile);
      const derivedTitle = selectedFile.name.split('.')[0];
      setTitle(derivedTitle);
      
      // Auto-trigger upload
      await startUpload(selectedFile, derivedTitle);
    }
  };

  const startUpload = async (fileToUpload: File, videoTitle: string) => {
    if (isUploading) return;
    
    setIsUploading(true);
    setUploadPercent(0);
    setProgress({ status: 'uploading', message: 'Initializing upload...' });

    try {
      // 1. Upload to Cloudflare Stream
      const streamData = await supabaseService.uploadToCloudflareStream(
        fileToUpload, 
        (percent) => {
          setUploadPercent(percent);
          if (percent >= 100) {
            setProgress({ 
              status: 'uploading', 
              message: 'Processing on Cloudflare Stream...' 
            });
          } else {
            setProgress({ 
              status: 'uploading', 
              message: `Transferring to Cloud: ${percent}%` 
            });
          }
        }
      );
      
      if (!streamData) throw new Error('Failed to upload video to Cloudflare Stream');

      setProgress({ status: 'uploading', message: 'Finalizing and saving...' });

      // 2. Insert into database
      const success = await supabaseService.insertVideo({
        title: videoTitle || "Untitled Video",
        // Using Cloudflare Stream default thumbnail pattern if possible, else fallback
        thumbnail: thumbnailUrl || `https://videodelivery.net/${streamData.uid}/thumbnails/thumbnail.jpg?time=2s&height=720`,
        videoUrl: streamData.videoUrl,
        channelName: session?.user?.email?.split('@')[0] || "Guest",
        channelAvatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${session?.user?.id || 'guest'}`,
        description: "",
        duration: "0:00",
        isLive: false
      });

      if (!success) throw new Error("Database update failed after Cloudflare upload");

      setProgress({ status: 'success', message: 'Video published successfully!' });
      await refreshData();
      
      // Reset form after success
      setTimeout(() => {
        setFile(null);
        setProgress({ status: 'idle', message: '' });
        setUploadPercent(0);
        setIsUploading(false);
      }, 3000);
    } catch (error: any) {
      console.error('[UPLOAD-UI] Error:', error);
      setIsUploading(false);
      
      let errorMsg = error.message || 'Upload failed';
      if (error.hint) {
        errorMsg = `${errorMsg}. ${error.hint}`;
      } else if (errorMsg.includes('Failed to fetch') || errorMsg.includes('Network error')) {
        errorMsg = 'Connection error. Check your internet and try again.';
      } else if (errorMsg.includes('Storage error')) {
        errorMsg = 'Cloud storage rejected the file. Check your bucket settings.';
      }
      
      setProgress({ status: 'error', message: errorMsg });
    }
  };

  if (!session && !checkingSession) {
    return (
      <div className="max-w-md mx-auto p-8 bg-zinc-900 rounded-3xl border border-white/10 shadow-2xl flex flex-col items-center text-center">
        <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mb-6">
          <UserCircle className="w-8 h-8 text-blue-500" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Sign in to Post</h2>
        <p className="text-zinc-500 text-sm mb-8 leading-relaxed">
          Create an account or sign in to share your amazing videos and shorts with the community.
        </p>
        <button 
          onClick={() => window.location.href = '/auth'}
          className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 active:scale-95 transition-all shadow-lg shadow-blue-600/20"
        >
          Sign In Now
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-4 bg-zinc-900 rounded-3xl border border-white/10 shadow-2xl overflow-hidden">
      <div className="space-y-4">
        {/* Simplified Upload Area */}
        <div 
          onClick={() => !isUploading && fileInputRef.current?.click()}
          className={`relative group cursor-pointer border-2 border-dashed rounded-2xl p-8 transition-all flex flex-col items-center justify-center text-center
            ${file ? 'border-green-500/50 bg-green-500/5' : 'border-white/10 hover:border-blue-500/50 hover:bg-blue-500/5'}
            ${isUploading || checkingSession ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <input 
            type="file" 
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="video/*"
            className="hidden"
            disabled={isUploading || checkingSession}
          />
          
          {checkingSession ? (
            <Loader2 className="w-8 h-8 text-zinc-500 animate-spin" />
          ) : file ? (
            <div className="animate-in zoom-in duration-300">
              <div className="w-14 h-14 bg-green-500/20 rounded-full flex items-center justify-center mb-3 mx-auto">
                <Video className="w-7 h-7 text-green-500" />
              </div>
              <p className="text-white font-bold truncate max-w-[200px] mb-1">{file.name}</p>
              <p className="text-green-500/60 text-[10px] font-black uppercase tracking-widest">
                {isUploading ? 'Transferring...' : 'Ready'}
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-inner shadow-black/40">
                <Upload className="w-7 h-7 text-zinc-400 group-hover:text-blue-500 transition-colors" />
              </div>
              <div className="space-y-1">
                 <p className="text-zinc-500 text-[11px] font-medium tracking-tight">Select from device</p>
              </div>
            </div>
          )}
        </div>

        {/* Status Messages - Integrated and prominent */}
        <AnimatePresence>
          {progress.status !== 'idle' && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className={`p-4 mt-2 rounded-2xl flex items-center gap-3 border shadow-sm
                ${progress.status === 'uploading' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : ''}
                ${progress.status === 'success' ? 'bg-green-500/10 text-green-400 border-green-500/20 shadow-green-500/5' : ''}
                ${progress.status === 'error' ? 'bg-red-500/10 text-red-400 border-red-500/20' : ''}
              `}
              >
                {progress.status === 'uploading' ? (
                  <div className="relative flex items-center justify-center w-5 h-5">
                    <Loader2 className="w-5 h-5 animate-spin absolute" />
                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
                  </div>
                ) : progress.status === 'success' ? (
                  <CheckCircle2 className="w-5 h-5 anim-bounce" />
                ) : (
                  <AlertCircle className="w-5 h-5" />
                )}
                <div className="flex-1">
                  <span className="text-xs font-black uppercase tracking-widest">{progress.message}</span>
                  {progress.status === 'uploading' && (
                    <div className="mt-2 w-full h-1 bg-white/5 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${uploadPercent}%` }}
                        className="h-full bg-blue-500"
                      />
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default VideoUpload;
