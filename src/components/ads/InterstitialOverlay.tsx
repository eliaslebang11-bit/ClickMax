import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ExternalLink, Info } from 'lucide-react';
import { adService } from '../../services/adService';
import { Ad } from '../../types';

const InterstitialOverlay = () => {
  const [currentAd, setCurrentAd] = useState<Ad | null>(null);
  const [show, setShow] = useState(false);
  const [isImpressionLogged, setIsImpressionLogged] = useState(false);

  useEffect(() => {
    // Interstital frequency logic: e.g., show after 2 minutes or on specific navigation
    const checkInterval = setInterval(() => {
      if (!show && Math.random() < 0.2) { // 20% chance every 45s
        loadInterstitial();
      }
    }, 45000);

    return () => clearInterval(checkInterval);
  }, [show]);

  const loadInterstitial = async () => {
    const ads = await adService.getActiveAds(undefined, 'interstitial');
    if (ads && ads.length > 0) {
      const ad = ads[Math.floor(Math.random() * ads.length)];
      setCurrentAd(ad);
      setShow(true);
      setIsImpressionLogged(false);
    }
  };

  useEffect(() => {
    if (show && currentAd && !isImpressionLogged) {
      adService.logEvent(currentAd.id, 'impression');
      setIsImpressionLogged(true);
    }
  }, [show, currentAd]);

  const handleClose = () => {
    setShow(false);
    setCurrentAd(null);
  };

  const handleClick = () => {
    if (currentAd) {
      adService.logEvent(currentAd.id, 'click');
      window.open(currentAd.destination_url, '_blank');
      handleClose();
    }
  };

  return (
    <AnimatePresence>
      {show && currentAd && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/90 backdrop-blur-md"
            onClick={handleClose}
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-lg bg-zinc-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
          >
            {/* Close Button */}
            <button 
              onClick={handleClose}
              className="absolute top-4 right-4 z-10 p-2 bg-black/50 hover:bg-black/80 rounded-full text-white/70 hover:text-white transition-all backdrop-blur-md"
            >
              <X size={20} />
            </button>

            {/* Ad Content */}
            <div className="aspect-[4/5] bg-black relative">
              <img 
                src={currentAd.media_url} 
                className="w-full h-full object-cover" 
                alt="Ad"
              />
              <div className="absolute top-4 left-4">
                <div className="bg-black/60 backdrop-blur-md px-2 py-1 rounded text-[10px] font-bold text-white/50 uppercase tracking-widest border border-white/10">
                  Sponsored
                </div>
              </div>
            </div>

            <div className="p-8 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-2xl font-bold text-white tracking-tight">{currentAd.title}</h3>
                  <p className="text-zinc-400 mt-1 line-clamp-2 text-sm">{currentAd.description || 'Exclusive offer for you. Click to learn more.'}</p>
                </div>
                <div className="p-2 bg-zinc-800 rounded-xl text-zinc-500">
                  <Info size={20} />
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleClick}
                  className="w-full flex items-center justify-center gap-2 bg-white text-black h-14 rounded-2xl font-bold text-lg hover:bg-zinc-200 transition-all shadow-xl active:scale-95"
                >
                  <span>Learn More</span>
                  <ExternalLink size={20} />
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default InterstitialOverlay;
