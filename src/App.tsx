import React, { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Watch from "./pages/Watch";
import Shorts from "./pages/Shorts";
import Channels from "./pages/Channels";
import Me from "./pages/Me";
import Live from "./pages/Live";
import LiveSetup from "./pages/LiveSetup";
import Notifications from "./pages/Notifications";
import Profile from "./pages/Profile";
import Dashboard from "./pages/Dashboard";
import Library from "./pages/Library";
import History from "./pages/History";
import Playlists from "./pages/Playlists";
import LikedVideos from "./pages/LikedVideos";
import AddContent from "./pages/AddContent";
import VideoEditor from "./pages/VideoEditor";
import LiveStream from "./pages/LiveStream";
import LiveTalk from "./pages/LiveTalk";
import StreamingViewer from "./pages/StreamingViewer";
import LiveStreamSetup from "./pages/LiveStreamSetup";
import Gifts from "./pages/Gifts";
import ExternalStream from "./pages/ExternalStream";
import EditProfile from "./pages/EditProfile";
import Settings from "./pages/Settings";
import Downloads from "./pages/Downloads";
import Auth from "./pages/Auth";
import AdminAds from "./pages/AdminAds";
import { VideoProvider } from "./context/VideoContext";
import { UserProvider, useUser } from "./context/UserContext";
import { ThemeProvider } from "./context/ThemeContext";
import { NotificationProvider } from "./context/NotificationContext";
import ScrollToTop from "./components/ScrollToTop";
import { Loader2 } from "lucide-react";

const AppContent = () => {
  const { session } = useUser();

  useEffect(() => {
    // Handle OAuth popup auto-close
    if (window.opener && window.opener !== window) {
      const isAuthRedirect = window.location.hash.includes('access_token=') || 
                             window.location.search.includes('code=');
      
      if (isAuthRedirect) {
        setTimeout(() => {
          try {
            window.opener.postMessage({ type: 'OAUTH_SUCCESS' }, window.location.origin);
          } catch (e) {}
          window.close();
        }, 2000);
      }
    }
  }, []);

  return (
    <>
      <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route 
          path="/auth" 
          element={session ? <Navigate to="/" replace /> : <Auth />} 
        />
        
        {/* Public Routes */}
        <Route path="watch/:id" element={<Watch />} />
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="shorts" element={<Shorts />} />
          <Route path="profile/:username" element={<Profile />} />
          <Route path="streaming-viewer/:id" element={<StreamingViewer />} />
        </Route>

        {/* Private Routes */}
        <Route element={!session ? <Navigate to="/auth" state={{ mode: 'login' }} replace /> : <Outlet />}>
          <Route element={<Layout />}>
            <Route path="channels" element={<Channels />} />
            <Route path="me" element={<Me />} />
            <Route path="live" element={<Live />} />
            <Route path="live-setup" element={<LiveSetup />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="library" element={<Library />} />
            <Route path="history" element={<History />} />
            <Route path="playlists" element={<Playlists />} />
            <Route path="liked" element={<LikedVideos />} />
            <Route path="downloads" element={<Downloads />} />
            <Route path="watch-later" element={<Library />} />
            <Route path="add-content" element={<AddContent />} />
            <Route path="video-editor" element={<VideoEditor />} />
            <Route path="live-stream" element={<LiveStream />} />
            <Route path="live-stream-setup" element={<LiveStreamSetup />} />
            <Route path="live-talk" element={<LiveTalk />} />
            <Route path="gifts" element={<Gifts />} />
            <Route path="external-stream" element={<ExternalStream />} />
            <Route path="edit-profile" element={<EditProfile />} />
            <Route path="admin/ads" element={<AdminAds />} />
          </Route>
          <Route path="settings" element={<Settings />} />
        </Route>

        {/* Fallback for when no session */}
        <Route path="*" element={session ? <Navigate to="/" replace /> : <Navigate to="/auth" state={{ mode: 'signup' }} replace />} />
      </Routes>
    </BrowserRouter>
    </>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <UserProvider>
        <VideoProvider>
          <NotificationProvider>
            <AppContent />
          </NotificationProvider>
        </VideoProvider>
      </UserProvider>
    </ThemeProvider>
  );
}
