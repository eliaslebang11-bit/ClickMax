import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ArrowLeft, 
  Gift, 
  TrendingUp, 
  History, 
  Calendar,
  ChevronRight,
  Sparkles,
  Trophy
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";

interface GiftItem {
  id: string;
  name: string;
  sender: string;
  time: string;
  value: number;
  icon: string;
}

export default function Gifts() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"today" | "all">("today");

  const todayGifts: GiftItem[] = [
    { id: "1", name: "Rose", sender: "Alex", time: "2m ago", value: 1, icon: "🌹" },
    { id: "2", name: "Diamond", sender: "Jordan", time: "15m ago", value: 100, icon: "💎" },
    { id: "3", name: "Heart", sender: "Taylor", time: "1h ago", value: 10, icon: "❤️" },
    { id: "4", name: "Star", sender: "Morgan", time: "2h ago", value: 5, icon: "⭐" },
  ];

  const allGifts: GiftItem[] = [
    ...todayGifts,
    { id: "5", name: "Crown", sender: "Casey", time: "Yesterday", value: 500, icon: "👑" },
    { id: "6", name: "Rocket", sender: "Riley", time: "2 days ago", value: 1000, icon: "🚀" },
    { id: "7", name: "Fire", sender: "Jamie", time: "3 days ago", value: 50, icon: "🔥" },
  ];

  const gifts = activeTab === "today" ? todayGifts : allGifts;
  const totalValue = gifts.reduce((acc, gift) => acc + gift.value, 0);

  return (
    <div className="min-h-screen bg-brand-bg text-white pb-20">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-brand-bg/80 backdrop-blur-xl border-b border-white/5 px-4 py-4 flex items-center gap-4">
        <button 
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-white/5 rounded-full transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-bold tracking-tight">Received Gifts</h1>
      </div>

      <div className="p-4 space-y-6">
        {/* Summary Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-yellow-500/20 rounded-[32px] p-6 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-4 opacity-20">
            <Trophy className="w-24 h-24 text-yellow-500" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 text-yellow-500 mb-2">
              <Sparkles className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-widest">Total Earnings</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black tracking-tighter">{totalValue}</span>
              <span className="text-sm font-bold text-white/60">Coins</span>
            </div>
            <p className="text-xs text-white/40 mt-4 leading-relaxed">
              You've received {gifts.length} gifts in this period. Keep up the great work!
            </p>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="flex bg-white/5 p-1 rounded-2xl">
          <button
            onClick={() => setActiveTab("today")}
            className={cn(
              "flex-1 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2",
              activeTab === "today" ? "bg-white text-black shadow-lg" : "text-white/60 hover:text-white"
            )}
          >
            <Calendar className="w-4 h-4" />
            Today
          </button>
          <button
            onClick={() => setActiveTab("all")}
            className={cn(
              "flex-1 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2",
              activeTab === "all" ? "bg-white text-black shadow-lg" : "text-white/60 hover:text-white"
            )}
          >
            <History className="w-4 h-4" />
            All Time
          </button>
        </div>

        {/* Gifts List */}
        <div className="space-y-3">
          <AnimatePresence mode="wait">
            {gifts.length > 0 ? (
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-3"
              >
                {gifts.map((gift) => (
                  <div 
                    key={gift.id}
                    className="bg-white/5 border border-white/5 rounded-2xl p-4 flex items-center gap-4 group hover:bg-white/10 transition-colors"
                  >
                    <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center text-2xl shadow-inner">
                      {gift.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <h3 className="font-bold text-sm truncate">{gift.name}</h3>
                        <span className="text-[10px] font-bold text-yellow-500">+{gift.value} Coins</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-white/40 truncate">from <span className="text-white/60 font-medium">{gift.sender}</span></p>
                        <span className="text-[10px] text-white/20">{gift.time}</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-white/10 group-hover:text-white/40 transition-colors" />
                  </div>
                ))}
              </motion.div>
            ) : (
              <div className="py-20 text-center space-y-4">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto">
                  <Gift className="w-8 h-8 text-white/20" />
                </div>
                <p className="text-sm text-white/40 font-medium">No gifts received yet</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
