import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Camera, Loader2, ArrowLeft } from "lucide-react";
import { useUser } from "../context/UserContext";

import { supabaseService } from "../services/supabaseService";

export default function EditProfile() {
  const { user, updateUser } = useUser();
  const navigate = useNavigate();
  
  const [username, setUsername] = useState(user.username);
  const [bio, setBio] = useState(user.description);
  const [avatarUrl, setAvatarUrl] = useState(user.avatar || "");
  const [bannerUrl, setBannerUrl] = useState(user.banner || "");
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const uploadedUrl = await supabaseService.uploadFile(file, 'profile-picture');
      if (uploadedUrl) {
        setAvatarUrl(uploadedUrl);
      } else {
        alert("Failed to upload avatar.");
      }
    } catch (err: any) {
      console.error("Avatar uploading failed:", err);
      alert(err.message || "An error occurred during file upload.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleBannerFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert("Only image files are allowed.");
      return;
    }

    setIsUploadingBanner(true);
    try {
      const uploadedUrl = await supabaseService.uploadFile(file, 'banner');
      if (uploadedUrl) {
        setBannerUrl(uploadedUrl);
      } else {
        alert("Failed to upload banner.");
      }
    } catch (err: any) {
      console.error("Banner uploading failed:", err);
      alert(err.message || "An error occurred during file upload.");
    } finally {
      setIsUploadingBanner(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const cleanHandle = `@${username.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
      const success = await supabaseService.updateProfile({
        username: username,
        handle: cleanHandle,
        description: bio,
        avatar: avatarUrl,
        banner: bannerUrl
      });

      if (success) {
        updateUser({ 
          username: username, 
          description: bio,
          handle: cleanHandle,
          avatar: avatarUrl,
          banner: bannerUrl
        });
        navigate("/me");
      } else {
        alert("Failed to save profile. Please try again.");
      }
    } catch (error) {
      console.error("Error saving profile:", error);
      alert("An error occurred while saving.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-brand-bg h-screen overflow-y-auto border-x border-brand-border pb-32 w-full touch-pan-y">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-brand-bg/80 backdrop-blur-md px-4 py-3 flex items-center justify-between border-b border-brand-border">
        <div className="flex items-center gap-3">
          <button 
            type="button"
            onClick={() => navigate("/me")}
            className="p-1.5 hover:bg-brand-surface rounded-full transition-colors text-brand-text"
            title="Go back"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="font-black text-xl tracking-tight text-brand-text">Edit Profile</h1>
        </div>
        <button 
          onClick={handleSave}
          disabled={isSaving || isUploading || isUploadingBanner}
          className="px-6 py-1.5 bg-brand-text text-brand-bg rounded-full font-black text-sm hover:opacity-90 transition-all disabled:opacity-50 flex items-center gap-2"
        >
          {isSaving ? (
            <div className="w-4 h-4 border-2 border-brand-bg/30 border-t-brand-bg rounded-full animate-spin" />
          ) : (
            <>
              <Check className="w-4 h-4" />
              Save
            </>
          )}
        </button>
      </div>

      <div className="p-6 space-y-8">
        {/* Form */}
        <div className="space-y-6">
          {/* Banner & Avatar Upload Container */}
          <div className="space-y-6 border-b border-brand-border/60 pb-6">
            {/* Banner Section */}
            <div className="space-y-2">
              <label className="text-sm font-black text-brand-muted uppercase tracking-wider">Profile Banner</label>
              <div className="relative group w-full h-44 rounded-2xl overflow-hidden border border-brand-border bg-brand-surface/45 flex items-center justify-center">
                {bannerUrl ? (
                  <img 
                    src={bannerUrl} 
                    alt="Profile Banner" 
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover animate-fade-in"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-r from-blue-950/20 via-brand-surface to-brand-surface flex flex-col items-center justify-center text-center p-4">
                    <p className="text-sm font-bold text-brand-text/70 mb-1">No Profile Banner</p>
                    <p className="text-xs text-brand-muted">Upload a wide banner image to personalize your channel space</p>
                  </div>
                )}
                
                {isUploadingBanner ? (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-white animate-spin" />
                  </div>
                ) : (
                  <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center cursor-pointer transition-opacity">
                    <Camera className="w-8 h-8 text-white mb-1" />
                    <span className="text-xs text-white font-bold uppercase tracking-wider">Change Banner Image</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleBannerFileChange} 
                      className="hidden" 
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Avatar Section */}
            <div className="flex flex-col items-center justify-center pt-2">
              <div className="relative group w-28 h-28 rounded-full overflow-hidden border-2 border-brand-text mb-3 bg-brand-placeholder flex items-center justify-center shadow-lg">
                {avatarUrl ? (
                  <img 
                    src={avatarUrl} 
                    alt="Profile Avatar" 
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover animate-fade-in"
                  />
                ) : (
                  <div className="w-full h-full bg-brand-surface border border-brand-border flex items-center justify-center">
                    <span className="text-4xl font-black text-brand-text/50 uppercase">
                      {username?.charAt(0) || "U"}
                    </span>
                  </div>
                )}
                
                {isUploading ? (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-white animate-spin" />
                  </div>
                ) : (
                  <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center cursor-pointer transition-opacity">
                    <Camera className="w-7 h-7 text-white mb-1" />
                    <span className="text-[10px] text-white font-bold uppercase tracking-wider">Upload Portrait</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleAvatarFileChange} 
                      className="hidden" 
                    />
                  </label>
                )}
              </div>
              <p className="text-xs text-brand-muted font-bold uppercase tracking-wider">Custom Profile Picture</p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-black text-brand-muted uppercase tracking-wider">Email Address</label>
            <div className="w-full bg-brand-surface/50 border border-brand-border rounded-xl px-4 py-3 text-brand-muted font-medium cursor-not-allowed">
              {user.email || "No email linked"}
            </div>
            <p className="text-[10px] text-brand-muted font-bold uppercase tracking-tight">Email cannot be changed here for security</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-black text-brand-muted uppercase tracking-wider">Username</label>
              <span className="text-xs font-bold text-blue-500">@{username}</span>
            </div>
            <input 
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              className="w-full bg-brand-surface border border-brand-border rounded-xl px-4 py-3 text-brand-text font-bold focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-black text-brand-muted uppercase tracking-wider">Bio</label>
            <textarea 
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell us about yourself"
              rows={4}
              className="w-full bg-brand-surface border border-brand-border rounded-xl px-4 py-3 text-brand-text font-medium focus:outline-none focus:border-blue-500 transition-colors resize-none leading-relaxed"
            />
            <p className="text-xs text-brand-muted text-right font-medium">
              {bio.length} characters
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
