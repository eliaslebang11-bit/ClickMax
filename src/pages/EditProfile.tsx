import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check } from "lucide-react";
import { useUser } from "../context/UserContext";

import { supabaseService } from "../services/supabaseService";

export default function EditProfile() {
  const { user, updateUser } = useUser();
  const navigate = useNavigate();
  
  const [username, setUsername] = useState(user.username);
  const [bio, setBio] = useState(user.description);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const success = await supabaseService.updateProfile({
        username: user.username, // keep original as key
        handle: username,
        description: bio,
        avatar: user.avatar,
        banner: user.banner
      });

      if (success) {
        updateUser({ 
          username: username, 
          description: bio,
          handle: username 
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
    <div className="max-w-2xl mx-auto bg-brand-bg min-h-screen border-x border-brand-border pb-20">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-brand-bg/80 backdrop-blur-md px-4 py-3 flex items-center justify-between border-b border-brand-border">
        <div className="flex items-center gap-6">
          <h1 className="font-black text-xl tracking-tight text-brand-text">Edit Profile</h1>
        </div>
        <button 
          onClick={handleSave}
          disabled={isSaving}
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
