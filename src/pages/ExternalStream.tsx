import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Copy, 
  Check, 
  ChevronLeft, 
  Settings, 
  Info,
  Play,
  Wifi,
  WifiOff,
  ExternalLink
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { getApiUrl } from "../lib/api";

export default function ExternalStream() {
  const navigate = useNavigate();
  const [streamKey, setStreamKey] = useState("");
  const [isLive, setIsLive] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showKey, setShowKey] = useState(false);

  const rtmpUrl = "rtmp://your-server-ip/live"; 

  useEffect(() => {
    // Check localStorage first for persistent key
    const savedKey = localStorage.getItem("stream_key_persistent");
    
    if (savedKey) {
      setStreamKey(savedKey);
      setLoading(false);
    } else {
      // Generate or fetch stream key fallback
      const fakeKey = "live_" + Math.random().toString(36).substr(2, 9);
      setStreamKey(fakeKey);
      localStorage.setItem("stream_key_persistent", fakeKey);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Poll for stream status (Mocked)
    if (!streamKey) return;

    const interval = setInterval(() => {
      // Streaming from mobile isn't connected to an RTMP mock
      setIsLive(false);
    }, 5000);

    return () => clearInterval(interval);
  }, [streamKey]);

  const copyToClipboard = (text: string, setCopied: (v: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black z-[200] flex flex-col text-white font-sans overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-white/10 bg-black/50 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-bold">External Stream</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${isLive ? 'bg-red-600 animate-pulse' : 'bg-white/10'}`}>
            {isLive ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {isLive ? 'Live' : 'Offline'}
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6 max-w-2xl mx-auto w-full">
        {/* Preview Area */}
        <div className="aspect-video bg-white/5 rounded-3xl overflow-hidden relative group border border-white/10 shadow-2xl">
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 space-y-4">
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center">
              <Play className="w-8 h-8 text-white/20" />
            </div>
            <div>
              <h3 className="font-bold text-white/60">Stream Preview</h3>
              <p className="text-xs text-white/30">Preview is disabled in lightweight mode</p>
            </div>
          </div>
        </div>

        {/* Setup Info */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-white/40 px-1">
            <Settings className="w-4 h-4" />
            <h2 className="text-xs font-black uppercase tracking-widest">Stream Settings</h2>
          </div>

          <div className="space-y-3">
            {/* RTMP URL */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">RTMP Server URL</span>
                <button 
                  onClick={() => copyToClipboard(rtmpUrl, setCopiedUrl)}
                  className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                >
                  {copiedUrl ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-white/40" />}
                </button>
              </div>
              <p className="text-sm font-mono text-white/80 break-all">{rtmpUrl}</p>
            </div>

            {/* Stream Key */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Stream Key</span>
                <button 
                  onClick={() => copyToClipboard(streamKey, setCopiedKey)}
                  className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                >
                  {copiedKey ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-white/40" />}
                </button>
              </div>
              <div className="flex items-center gap-3">
                <p className="text-sm font-mono text-white/80 flex-1 break-all">
                  {loading ? "Generating..." : (showKey ? streamKey : "••••••••••••••••")}
                </p>
                {!loading && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowKey(!showKey);
                    }}
                    className="shrink-0 px-3 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-[10px] font-bold text-blue-400 transition-colors"
                  >
                    {showKey ? "Hide" : "Show"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-3xl p-6 space-y-4">
          <div className="flex items-center gap-2 text-blue-400">
            <Info className="w-5 h-5" />
            <h3 className="font-bold">How to stream with OBS</h3>
          </div>
          
          <ol className="space-y-4">
            {[
              "Open OBS Studio on your computer",
              "Go to Settings > Stream",
              "Select 'Custom' as the Service",
              "Paste the RTMP Server URL and Stream Key above",
              "Click 'Start Streaming' in OBS"
            ].map((step, i) => (
              <li key={i} className="flex gap-4">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center text-xs font-bold">
                  {i + 1}
                </span>
                <p className="text-sm text-white/70 leading-relaxed">{step}</p>
              </li>
            ))}
          </ol>
        </div>

        {/* Note about Preview Environment */}
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-4 flex gap-3">
          <ExternalLink className="w-5 h-5 text-yellow-500 flex-shrink-0" />
          <p className="text-[10px] text-yellow-500/80 leading-relaxed font-medium">
            Note: In this preview environment, external RTMP connections may be limited by port restrictions. 
            For a full production setup, ensure port 1935 is open on your firewall.
          </p>
        </div>
      </div>
    </div>
  );
}
