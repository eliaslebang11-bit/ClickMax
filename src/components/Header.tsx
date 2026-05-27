import React, { useState } from "react";
import { Link } from "react-router-dom";
import { 
  Menu, 
  Bell, 
  Search, 
  Plus,
  X,
  Zap,
  LayoutGrid,
  ShieldCheck
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import SearchOverlay from "./SearchOverlay";
import { useNotifications } from "../context/NotificationContext";
import { useVideoStats } from "../context/VideoContext";
import { useUser } from "../context/UserContext";

interface HeaderProps {
  onMenuClick?: () => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  onSearchClick?: () => void;
}

export default function Header({ onMenuClick, searchQuery, onSearchChange, onSearchClick }: HeaderProps) {
  const { unreadCount } = useNotifications();
  const { user } = useUser();

  return (
    <>
      <header className="sticky top-0 z-50 h-14 bg-brand-bg/95 backdrop-blur-xl flex items-center justify-between px-4 md:px-8">
        <div className="flex items-center gap-1.5 relative z-10">
          {onMenuClick && (
            <motion.button 
              whileHover={{ scale: 1.05, backgroundColor: "rgba(255, 255, 255, 0.05)" }}
              whileTap={{ scale: 0.95 }}
              onClick={onMenuClick}
              className="p-2 rounded-xl transition-all hidden md:flex items-center justify-center border border-white/10 hover:border-white/30 group"
            >
              <LayoutGrid className="w-5 h-5 text-brand-muted group-hover:text-white transition-colors" />
            </motion.button>
          )}

          {user?.isAdmin && (
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link 
                to="/admin/ads" 
                className="p-2 w-10 h-10 bg-purple-500/10 border border-purple-500/20 rounded-xl flex items-center justify-center text-purple-400 hover:bg-purple-500/20 hover:text-purple-300 transition-all group"
                title="Admin Ad Dashboard"
              >
                <ShieldCheck size={20} className="group-hover:animate-pulse" />
              </Link>
            </motion.div>
          )}

          <motion.div className="relative group">
            <motion.button 
              whileHover={{ scale: 1.01, backgroundColor: "rgba(63, 63, 70, 0.9)" }}
              whileTap={{ scale: 0.99 }}
              onClick={onSearchClick}
              className="flex items-center gap-3 px-4 py-2 bg-zinc-800/80 text-brand-muted rounded-xl hover:text-white transition-all border border-white/[0.05] hover:border-white/20 w-72 md:w-[520px] justify-between"
            >
              <div className="flex items-center gap-3 min-w-0">
                <Search className="w-4 h-4 group-hover:text-white transition-colors shrink-0" />
                <span className="text-sm font-medium tracking-wide whitespace-nowrap">Search or discover content...</span>
              </div>
              <div className="hidden md:flex items-center gap-1 px-1.5 py-0.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-mono opacity-50">
                <span className="text-xs">⌘</span>K
              </div>
            </motion.button>
          </motion.div>

          <div className="ml-0">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link 
                to="/notifications" 
                className="p-2 w-10 h-10 hover:bg-white/5 rounded-xl transition-all relative group border border-transparent hover:border-white/10 flex items-center justify-center shrink-0"
                title="Notifications"
              >
                <Bell className="w-5 h-5 text-brand-muted group-hover:text-white transition-colors" />
                {unreadCount > 0 && (
                  <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-brand-bg animate-pulse" />
                )}
              </Link>
            </motion.div>
          </div>
        </div>

        <div className="flex items-center gap-3 md:gap-5 relative z-10">
          <div className="flex items-center gap-1 md:gap-2">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="hidden md:block">
              <Link 
                to="/me" 
                className="w-10 h-10 rounded-xl p-[1px] bg-white/10 hover:bg-white/20 transition-all duration-300"
              >
                <div className="w-full h-full rounded-[11px] bg-brand-bg flex items-center justify-center group overflow-hidden">
                  {user?.avatar ? (
                    <img 
                      src={user.avatar} 
                      alt={user.username} 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full bg-white/5 group-hover:bg-white/10 transition-colors flex items-center justify-center font-black text-brand-text text-sm uppercase">
                      {user?.username?.charAt(0) || "G"}
                    </div>
                  )}
                </div>
              </Link>
            </motion.div>
          </div>
        </div>
      </header>
    </>
  );
}
