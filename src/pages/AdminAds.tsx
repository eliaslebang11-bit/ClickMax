import React, { useState, useEffect } from "react";
import { 
  Plus, 
  Trash2, 
  ExternalLink, 
  Search, 
  CheckCircle2, 
  XCircle, 
  Filter,
  Megaphone,
  Zap,
  Globe,
  Link as LinkIcon,
  Image as ImageIcon,
  MoreVertical,
  Loader2,
  Users,
  ChevronRight,
  TrendingUp,
  MousePointer2,
  Eye,
  Monitor,
  Smartphone
} from "lucide-react";
import { supabaseService } from "../services/supabaseService";
import { Ad } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";
import { adService } from "../services/adService";

const AdminAds = () => {
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'shorts' | 'classic'>('all');
  const [searchQuery, setSearchQuery] = useState("");
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    fetchAds();
  }, []);

  const fetchAds = async () => {
    setLoading(true);
    try {
      const [regularAds, shortsAds] = await Promise.all([
        adService.getAllAds(),
        adService.getAllShortsAds()
      ]);
      
      const combined = [...(Array.isArray(regularAds) ? regularAds : []), ...(Array.isArray(shortsAds) ? shortsAds : [])];
      // Filter unique by ID
      const unique = combined.reduce((acc: Ad[], current: any) => {
        if (!acc.find(item => item.id === current.id)) {
          acc.push(current);
        }
        return acc;
      }, []);
      
      setAds(unique);
    } catch (error) {
      console.error("Error fetching ads:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (ad: Ad) => {
    setSaving(ad.id);
    try {
      const isShorts = ad.placement_type === 'shorts-feed';
      const updatedAd = { ...ad, active: !ad.active };
      const ok = isShorts 
        ? await adService.saveShortsAd(updatedAd as any) 
        : await adService.saveAd(updatedAd as any);
        
      if (ok) {
        setAds(ads.map(item => item.id === ad.id ? updatedAd : item));
      }
    } catch (error) {
      console.error("Toggle error:", error);
    } finally {
      setSaving(null);
    }
  };

  const handleDelete = async (ad: Ad) => {
    if (!window.confirm("Are you sure you want to delete this campaign?")) return;
    const isShorts = ad.placement_type === 'shorts-feed';
    const ok = isShorts ? await adService.deleteShortsAd(ad.id) : await adService.deleteAd(ad.id);
    if (ok) {
      setAds(ads.filter(item => item.id !== ad.id));
    }
  };

  const handleCreateNewAd = async (isShorts: boolean) => {
    const newAd: Partial<Ad> = {
      title: "New Campaign",
      advertiser_name: "Brand Name",
      active: false,
      placement_type: isShorts ? 'shorts-feed' : ('pre-roll' as any),
      ad_type: isShorts ? 'vertical_video' : 'video',
      media_url: "",
      destination_url: "https://",
      cta_text: "Learn More",
      skippable: true,
      skip_after_seconds: 15
    };

    const result = isShorts ? await adService.saveShortsAd(newAd as any) : await adService.saveAd(newAd as any);
    if (result) {
      fetchAds();
    }
  };

  const handleUpdateField = async (id: string, field: keyof Ad, value: any) => {
    const ad = ads.find(a => a.id === id);
    if (!ad) return;

    // Optimistic update
    const updatedAd = { ...ad, [field]: value };
    setAds(ads.map(item => item.id === id ? updatedAd : item));

    const isShorts = ad.placement_type === 'shorts-feed';
    if (isShorts) {
       await adService.saveShortsAd(updatedAd as any);
    } else {
       await adService.saveAd(updatedAd as any);
    }
  };

  const filteredAds = ads.filter(ad => {
    const matchesTab = 
      activeTab === 'all' || 
      (activeTab === 'shorts' && ad.placement_type === 'shorts-feed') ||
      (activeTab === 'classic' && ad.placement_type !== 'shorts-feed');
    
    const matchesSearch = 
      (ad.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ad.advertiser_name || '').toLowerCase().includes(searchQuery.toLowerCase());

    return matchesTab && matchesSearch;
  });

  return (
    <div className="flex-1 overflow-y-auto bg-black text-white p-4 pt-24 md:p-8 md:pt-28">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
             <div className="bg-purple-600/20 text-purple-500 px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase border border-purple-500/20">
                Authorized Admin
             </div>
          </div>
          <h1 className="text-4xl font-black italic tracking-tighter flex items-center gap-3">
            <Megaphone size={36} className="text-purple-500" />
            CAMPAIGN STUDIO
          </h1>
          <p className="text-zinc-500 font-medium">Full management of video and shorts advertisements.</p>
        </div>
        
        <div className="flex gap-3">
          <button 
            onClick={() => handleCreateNewAd(false)}
            className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-6 py-4 rounded-2xl font-bold hover:bg-zinc-800 transition-all text-sm group"
          >
            <Plus size={18} className="group-hover:rotate-90 transition-transform" />
            Add Classic Ad
          </button>
          <button 
            onClick={() => handleCreateNewAd(true)}
            className="flex items-center gap-2 bg-gradient-to-tr from-purple-600 to-blue-600 px-6 py-4 rounded-2xl font-bold hover:brightness-110 transition-all text-sm shadow-[0_0_20px_rgba(168,85,247,0.2)]"
          >
            <Zap size={18} />
            Add Shorts Ad
          </button>
        </div>
      </div>

      {/* Control Strip */}
      <div className="flex flex-col lg:flex-row gap-6 mb-8 items-start lg:items-center justify-between bg-zinc-900/40 p-4 rounded-3xl border border-zinc-800">
        <div className="flex p-1 bg-black/40 rounded-2xl border border-white/5">
          {[
            { id: 'all', icon: Megaphone, label: 'Everything' },
            { id: 'classic', icon: Globe, label: 'Regular Ads' },
            { id: 'shorts', icon: Zap, label: 'Shorts' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all",
                activeTab === tab.id 
                  ? "bg-white text-black shadow-lg" 
                  : "text-zinc-500 hover:text-white"
              )}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full lg:w-96 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-purple-500 transition-colors" size={18} />
          <input 
            type="text"
            placeholder="Search campaigns, brands, or links..."
            className="w-full bg-black border border-white/5 rounded-2xl py-3 pl-12 pr-4 outline-none focus:ring-2 focus:ring-purple-500/50 transition-all font-medium text-sm placeholder:text-zinc-700"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* SPREADSHEET TABLE VIEW */}
      <div className="bg-zinc-900/80 border border-white/5 rounded-[32px] overflow-hidden shadow-2xl backdrop-blur-xl">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[1300px]">
            <thead>
              <tr className="bg-white/[0.02] border-b border-white/5">
                <th className="px-6 py-6 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] w-20 text-center">Live</th>
                <th className="px-6 py-6 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Advertiser / Brand</th>
                <th className="px-6 py-6 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Campaign Content</th>
                <th className="px-6 py-6 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Destinations & CTA</th>
                <th className="px-6 py-6 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] w-40">Rotation & Priority</th>
                <th className="px-6 py-6 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] w-48 text-center">Performance</th>
                <th className="px-6 py-6 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-32 text-center">
                    <Loader2 className="w-12 h-12 animate-spin mx-auto text-purple-600/50 mb-4" />
                    <p className="text-zinc-500 font-black italic tracking-widest text-sm animate-pulse">SYNCHRONIZING DATABASE...</p>
                  </td>
                </tr>
              ) : filteredAds.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-32 text-center">
                    <div className="w-20 h-20 bg-zinc-800/30 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Megaphone size={32} className="text-zinc-700" />
                    </div>
                    <p className="text-zinc-500 font-bold text-lg">No matching campaigns found</p>
                    <button onClick={() => setSearchQuery("")} className="mt-4 text-purple-500 font-bold hover:underline">Clear search filters</button>
                  </td>
                </tr>
              ) : (
                filteredAds.map(ad => (
                  <tr key={ad.id} className="hover:bg-white/[0.01] transition-all group border-b border-white/5">
                    {/* Status Toggle */}
                    <td className="px-6 py-8 align-top">
                      <div className="flex justify-center">
                        <button 
                          onClick={() => handleToggleActive(ad)}
                          className={cn(
                            "w-12 h-6 rounded-full relative transition-all flex items-center",
                            ad.active ? "bg-green-500" : "bg-zinc-800"
                          )}
                        >
                          <div className={cn(
                            "absolute w-5 h-5 bg-white rounded-full transition-all shadow-xl",
                            ad.active ? "left-[1.625rem]" : "left-0.5"
                          )} />
                          {saving === ad.id && (
                            <Loader2 size={10} className="animate-spin text-black absolute inset-0 m-auto" />
                          )}
                        </button>
                      </div>
                    </td>

                    {/* Advertiser & Identity */}
                    <td className="px-6 py-8 align-top">
                      <div className="flex gap-4">
                        <div className="flex flex-col items-center gap-2">
                          <span className="text-[8px] font-black text-zinc-500 uppercase tracking-tighter">Avatar</span>
                          <div className="relative flex-shrink-0 group/img">
                            <div className="w-14 h-14 rounded-full overflow-hidden bg-zinc-950 border border-white/10 ring-4 ring-transparent group-hover/img:ring-purple-500/20 transition-all shadow-inner">
                              {ad.profile_picture_url ? (
                                <img src={ad.profile_picture_url} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-zinc-800">
                                  <Users size={24} />
                                </div>
                              )}
                            </div>
                            {/* Upload Trigger */}
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center rounded-full cursor-pointer">
                              <input 
                                type="file" 
                                className="absolute inset-0 opacity-0 cursor-pointer"
                                accept="image/*"
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    const url = await supabaseService.uploadFile(file, 'image');
                                    if (url) handleUpdateField(ad.id, 'profile_picture_url', url);
                                  }
                                }}
                              />
                              <Plus size={16} className="text-white" />
                            </div>
                          </div>
                        </div>
                        <div className="space-y-4 flex-1">
                          <div>
                            <span className="text-[8px] font-black text-zinc-600 uppercase mb-1 block">Brand Name</span>
                            <input 
                              className="bg-zinc-800/20 border border-white/5 focus:border-purple-500/50 rounded px-2 py-1 text-[10px] font-black text-zinc-400 placeholder:text-zinc-800 w-full uppercase tracking-widest"
                              value={ad.advertiser_name || ''}
                              placeholder="BRAND / CLIENT NAME"
                              onChange={e => handleUpdateField(ad.id, 'advertiser_name', e.target.value)}
                            />
                          </div>
                          <div>
                            <span className="text-[8px] font-black text-zinc-600 uppercase mb-1 block">Phone / Contact Info</span>
                            <input 
                              className="bg-zinc-800/20 border border-white/5 focus:border-purple-500/50 rounded px-2 py-1 text-[10px] font-mono text-zinc-400 placeholder:text-zinc-800 w-full"
                              value={ad.phone_number || ''}
                              placeholder="0789806794"
                              onChange={e => handleUpdateField(ad.id, 'phone_number', e.target.value)}
                            />
                          </div>
                          <div>
                            <span className="text-[8px] font-black text-zinc-600 uppercase mb-1 block">Catchphrase (Title)</span>
                            <textarea 
                              className="bg-transparent border-none focus:ring-0 p-0 text-lg font-black text-white placeholder:text-zinc-800 w-full leading-tight resize-none h-auto overflow-hidden"
                              value={ad.title || ''}
                              placeholder="Campaign Catchphrase"
                              rows={1}
                              onChange={(e) => {
                                 handleUpdateField(ad.id, 'title', e.target.value);
                                 e.target.style.height = 'auto';
                                 e.target.style.height = e.target.scrollHeight + 'px';
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Media Assets */}
                    <td className="px-6 py-8 align-top">
                      <div className="space-y-3 max-w-sm">
                        <div className="flex items-center gap-3 bg-black/50 border border-white/5 rounded-2xl p-1.5 focus-within:border-purple-500/50 transition-colors">
                          <div className="w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center text-zinc-600 flex-shrink-0">
                             <ImageIcon size={18} />
                          </div>
                          <input 
                            type="text"
                            placeholder="Asset URL (Video/Img)"
                            className="bg-transparent border-none focus:ring-0 px-2 py-1 text-xs w-full font-mono text-zinc-400 placeholder:text-zinc-800"
                            value={ad.media_url || ''}
                            onChange={e => handleUpdateField(ad.id, 'media_url', e.target.value)}
                          />
                          <div className="relative px-2">
                             <Plus size={14} className="text-zinc-500 hover:text-white cursor-pointer" />
                             <input 
                               type="file" 
                               className="absolute inset-0 opacity-0 cursor-pointer"
                               onChange={async (e) => {
                                 const file = e.target.files?.[0];
                                 if (file) {
                                   const url = await supabaseService.uploadFile(file, file.type.includes('image') ? 'image' : 'video');
                                   if (url) handleUpdateField(ad.id, 'media_url', url);
                                 }
                               }}
                             />
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3 bg-black/50 border border-white/5 rounded-2xl p-1.5 focus-within:border-purple-500/50 transition-colors opacity-60 hover:opacity-100">
                          <div className="w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center text-zinc-600 flex-shrink-0">
                             <div className="text-[10px] font-black">THB</div>
                          </div>
                          <input 
                            type="text"
                            placeholder="Thumbnail URL"
                            className="bg-transparent border-none focus:ring-0 px-2 py-1 text-xs w-full font-mono text-zinc-400 placeholder:text-zinc-800"
                            value={ad.thumbnail_url || ''}
                            onChange={e => handleUpdateField(ad.id, 'thumbnail_url', e.target.value)}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Destinations & Conversion */}
                    <td className="px-6 py-8 align-top">
                      <div className="space-y-4 max-w-sm">
                        <div>
                          <span className="text-[8px] font-black text-zinc-600 uppercase mb-1 block italic tracking-widest">Website Link (URL)</span>
                          <div className="flex items-center gap-3 bg-black/50 border border-white/5 rounded-2xl p-1.5 focus-within:border-purple-500/50 transition-colors shadow-inner">
                            <div className="w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center text-zinc-600 flex-shrink-0">
                               <LinkIcon size={18} />
                            </div>
                            <input 
                              type="text"
                              placeholder="https://destination-link.com"
                              className="bg-transparent border-none focus:ring-0 px-2 py-1 text-xs w-full text-zinc-400 placeholder:text-zinc-800 font-mono"
                              value={ad.destination_url || ''}
                              onChange={e => handleUpdateField(ad.id, 'destination_url', e.target.value)}
                            />
                          </div>
                        </div>

                        <div>
                          <span className="text-[8px] font-black text-zinc-600 uppercase mb-1 block italic tracking-widest">Call to Action (CTA)</span>
                          <div className="flex items-center gap-3 bg-black/50 border border-white/5 rounded-2xl p-1.5 focus-within:border-purple-500/50 transition-colors shadow-inner">
                            <div className="w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center text-zinc-600 flex-shrink-0 text-[10px] font-black uppercase">
                               CTA
                            </div>
                            <input 
                              type="text"
                              placeholder="Learn More"
                              className="bg-transparent border-none focus:ring-0 px-2 py-1 text-xs w-full text-zinc-400 placeholder:text-zinc-800 font-bold"
                              value={ad.cta_text || ''}
                              onChange={e => handleUpdateField(ad.id, 'cta_text', e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Rotation & Sequencing */}
                    <td className="px-6 py-8 align-top">
                      <div className="space-y-4">
                        <div>
                          <span className="text-[8px] font-black text-zinc-600 uppercase mb-1 block">Priority Order</span>
                          <select 
                            className="bg-black border border-white/10 rounded-lg px-3 py-2 text-xs font-bold text-white w-full outline-none focus:ring-1 focus:ring-purple-500"
                            value={ad.priority_order || 0}
                            onChange={e => handleUpdateField(ad.id, 'priority_order', parseInt(e.target.value))}
                          >
                            <option value={0}>Standard (0)</option>
                            <option value={1}>1st Ad</option>
                            <option value={2}>2nd Ad</option>
                            <option value={3}>3rd Ad</option>
                            <option value={4}>4th Ad</option>
                            <option value={5}>5th Ad</option>
                          </select>
                        </div>
                        <div>
                          <span className="text-[8px] font-black text-zinc-600 uppercase mb-1 block">Rotation Limit</span>
                          <div className="flex items-center gap-2">
                             <input 
                                type="number"
                                className="bg-black border border-white/10 rounded-lg px-2 py-1 text-xs font-bold text-white w-16 outline-none focus:ring-1 focus:ring-purple-500"
                                value={ad.rotation_limit ?? 3}
                                min={1}
                                onChange={e => handleUpdateField(ad.id, 'rotation_limit', parseInt(e.target.value))}
                             />
                             <span className="text-[8px] text-zinc-500 font-bold uppercase">Plays</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Stats Summary */}
                    <td className="px-6 py-8 align-top">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between bg-zinc-950/50 px-4 py-3 border border-white/5 rounded-2xl">
                          <Eye size={12} className="text-zinc-600" />
                          <span className="text-lg font-black text-white">{ad.impressions || 0}</span>
                        </div>
                        <div className="flex items-center justify-between bg-zinc-950/50 px-4 py-3 border border-white/5 rounded-2xl">
                          <MousePointer2 size={12} className="text-zinc-600" />
                          <span className="text-lg font-black text-white">{ad.clicks || 0}</span>
                        </div>
                        <div className="bg-purple-500/10 text-purple-400 text-center py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border border-purple-500/20">
                          CTR: {ad.impressions ? ((ad.clicks / ad.impressions) * 100).toFixed(2) : 0}%
                        </div>
                      </div>
                    </td>

                    {/* Control Actions */}
                    <td className="px-6 py-8 align-top">
                      <div className="flex flex-col gap-2">
                        <button 
                          onClick={() => handleDelete(ad)}
                          className="w-12 h-12 bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shadow-lg"
                        >
                          <Trash2 size={18} />
                        </button>
                        <a 
                          href={ad.destination_url} 
                          target="_blank" 
                          rel="noreferrer"
                          className="w-12 h-12 bg-zinc-900 text-zinc-500 rounded-2xl flex items-center justify-center hover:bg-white hover:text-black transition-all shadow-lg"
                        >
                          <ExternalLink size={18} />
                        </a>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* FOOTER STATS PANEL */}
      <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-zinc-900/40 p-6 rounded-[32px] border border-white/5 backdrop-blur-md">
           <div className="flex items-center gap-3 mb-4 text-zinc-500">
              <TrendingUp size={16} />
              <span className="text-[10px] font-black uppercase tracking-widest">Global Reach</span>
           </div>
           <div className="text-4xl font-black italic tracking-tighter mb-1">
             {ads.reduce((acc, curr) => acc + (curr.impressions || 0), 0).toLocaleString()}
           </div>
           <div className="text-xs text-zinc-500 font-bold">Accumulated impressions across all campaigns</div>
        </div>

        <div className="bg-zinc-900/40 p-6 rounded-[32px] border border-white/5 backdrop-blur-md">
           <div className="flex items-center gap-3 mb-4 text-zinc-500">
              <CheckCircle2 size={16} className="text-green-500" />
              <span className="text-[10px] font-black uppercase tracking-widest">Active Inventory</span>
           </div>
           <div className="text-4xl font-black italic tracking-tighter mb-1">
             {ads.filter(a => a.active).length} / {ads.length}
           </div>
           <div className="text-xs text-zinc-500 font-bold">Currently delivering live traffic impressions</div>
        </div>

        <div className="bg-zinc-900/40 p-6 rounded-[32px] border border-white/5 backdrop-blur-md">
           <div className="flex items-center gap-3 mb-4 text-zinc-500">
              <Zap size={16} className="text-purple-500" />
              <span className="text-[10px] font-black uppercase tracking-widest">Shorts Penetration</span>
           </div>
           <div className="text-4xl font-black italic tracking-tighter mb-1">
             {ads.filter(a => a.placement_type === 'shorts-feed').length}
           </div>
           <div className="text-xs text-zinc-500 font-bold">Total vertical vertical video ad placements</div>
        </div>
      </div>
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #000;
          border-radius: 20px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #27272a;
          border-radius: 20px;
          border: 2px solid #000;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #3f3f46;
        }
      `}</style>
    </div>
  );
};

export default AdminAds;
