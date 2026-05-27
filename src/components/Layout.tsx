import React, { useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { 
  Home, 
  PlaySquare, 
  Clock, 
  ThumbsUp, 
  Layers,
  Zap,
  Radio,
  Plus,
  BarChart3,
  ListVideo,
  UserCircle,
  Megaphone
} from "lucide-react";
import { cn } from "../lib/utils";
import SearchOverlay from "./SearchOverlay";
import CreateModal from "./CreateModal";
import { useVideoStats } from "../context/VideoContext";

const SidebarItem = ({ icon: Icon, label, to, active, collapsed }: { icon: any, label: string, to: string, active?: boolean, collapsed?: boolean }) => (
  <Link
    to={to}
    className={cn(
      "flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 group relative",
      active 
        ? "bg-brand-text/10 text-brand-text" 
        : "text-brand-muted hover:bg-brand-text/5 hover:text-brand-text",
      collapsed && "justify-center px-0"
    )}
  >
    <Icon className={cn("w-5 h-5 transition-transform duration-200", !active && "group-hover:scale-110")} />
    {!collapsed && <span className="text-sm font-medium">{label}</span>}
    {collapsed && active && (
      <div className="absolute left-0 w-1 h-6 bg-brand-text rounded-r-full" />
    )}
  </Link>
);

const BottomNavItem = ({ icon: Icon, label, to, active, onClick }: { icon: any, label: string, to?: string, active?: boolean, onClick?: () => void }) => {
  if (onClick) {
    return (
      <button
        onClick={onClick}
        className={cn(
          "flex flex-col items-center justify-center gap-0.5 flex-1 transition-colors",
          active ? "text-brand-text" : "text-brand-muted"
        )}
      >
        <Icon className="w-5 h-5" />
        <span className="text-[9px] font-medium">{label}</span>
      </button>
    );
  }
  return (
    <Link
      to={to!}
      className={cn(
        "flex flex-col items-center justify-center gap-0.5 flex-1 transition-colors",
        active ? "text-brand-text" : "text-brand-muted"
      )}
    >
      <Icon className="w-5 h-5" />
      <span className="text-[9px] font-medium">{label}</span>
    </Link>
  );
};

export default function Layout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [shortsSearchQuery, setShortsSearchQuery] = useState("");
  const location = useLocation();
  const navigate = useNavigate();
  const isFullScreen = useVideoStats().isFullScreen || location.pathname === "/live-talk";

  const navItems = [
    { icon: Home, label: "Home", to: "/" },
    { icon: Zap, label: "Shorts", to: "/shorts" },
    { icon: Radio, label: "Live", to: "/live" },
    { icon: Plus, label: "Create", to: "/add-content" },
    { icon: BarChart3, label: "Dashboard", to: "/dashboard" },
    { icon: Megaphone, label: "Ads", to: "/admin/ads" },
    { icon: Layers, label: "Channels", to: "/channels" },
  ];

  const libraryItems = [
    { icon: PlaySquare, label: "Library", to: "/library" },
    { icon: Clock, label: "History", to: "/history" },
    { icon: ListVideo, label: "Playlists", to: "/playlists" },
    { icon: ThumbsUp, label: "Liked Videos", to: "/liked" },
    { icon: UserCircle, label: "Me", to: "/me" },
  ];

  return (
    <div className="h-[100dvh] w-full flex flex-col bg-brand-bg overflow-hidden">
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Sidebar - Desktop Only */}
        {!isFullScreen && (
          <aside 
            className={cn(
              "hidden md:block bg-brand-bg border-r border-brand-border pt-6 transition-all duration-300",
              isSidebarOpen ? "w-64" : "w-20"
            )}
          >
            <div className="h-full flex flex-col px-3 space-y-6 overflow-hidden">
              <div className="flex-1 overflow-y-auto no-scrollbar space-y-6 pb-20">
                <div className="space-y-1">
                {navItems.map((item) => {
                  if (item.label === "Create") {
                    return (
                      <Link
                        key={item.label}
                        to={item.to!}
                        className={cn(
                          "w-full flex items-center justify-center py-2.5 rounded-xl transition-all duration-500 group relative my-4 mx-1",
                          location.pathname === "/add-content"
                            ? "text-black shadow-[0_0_15px_rgba(255,255,255,0.1)]"
                            : "text-white",
                        )}
                        title="Create"
                      >
                        {/* Tri-color border background */}
                        <div className="absolute -inset-[1.5px] rounded-xl bg-gradient-to-tr from-white via-cyan-400 to-blue-600 -z-20 opacity-80 group-hover:opacity-100 transition-opacity blur-[0.5px]" />
                        
                        {/* Inner background */}
                        <div className={cn(
                          "absolute inset-0 rounded-xl -z-10 transition-all duration-500",
                          location.pathname === "/add-content"
                            ? "bg-gradient-to-br from-white to-white/80"
                            : "bg-brand-bg group-hover:bg-brand-bg/80"
                        )} />
 
                        <Plus className={cn(
                          "w-5.5 h-5.5 transition-all duration-500",
                          location.pathname !== "/add-content" && "group-hover:scale-110 group-hover:rotate-180"
                        )} />
                        
                        {/* Glow effect */}
                        <div className="absolute inset-0 rounded-xl bg-blue-500/10 opacity-0 group-hover:opacity-100 blur-lg transition-opacity duration-500 -z-30" />
                      </Link>
                    );
                  }
                  return (
                    <SidebarItem 
                      key={item.label} 
                      {...item} 
                      to={item.to!}
                      active={location.pathname === item.to} 
                      collapsed={!isSidebarOpen}
                    />
                  );
                })}
              </div>
              
              <div className="pt-6 border-t border-brand-border space-y-1">
                <h3 className={cn("px-4 text-[10px] text-brand-muted font-medium mb-2", !isSidebarOpen && "hidden")}>
                  Library
                </h3>
                {libraryItems.map((item) => (
                  <SidebarItem 
                    key={item.label} 
                    {...item} 
                    active={location.pathname === item.to} 
                    collapsed={!isSidebarOpen}
                  />
                ))}
              </div>
            </div>
            </div>
          </aside>
        )}

        {/* Main Content */}
        <main className="flex-1 min-w-0 overflow-hidden relative pb-14 md:pb-0">
          <Outlet context={{ 
            setIsSidebarOpen, 
            isSidebarOpen, 
            searchQuery, 
            setSearchQuery,
            shortsSearchQuery,
            setShortsSearchQuery,
            setIsSearchOpen,
            isSearchOpen
          }} />
        </main>
      </div>

      <SearchOverlay 
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSearch={(query) => {
          if (location.pathname === "/shorts") {
            setShortsSearchQuery(query);
          } else {
            setSearchQuery(query);
            if (location.pathname !== "/") {
              navigate("/");
            }
          }
        }}
        initialQuery={location.pathname === "/shorts" ? shortsSearchQuery : searchQuery}
        placeholder={location.pathname === "/shorts" ? "Search Shorts" : "Search ClickMax..."}
      />

      {/* Bottom Navigation - Mobile Only */}
      {!isFullScreen && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 h-14 bg-brand-bg border-t border-brand-border flex items-center justify-around px-2 z-50">
          <BottomNavItem icon={Home} label="Home" to="/" active={location.pathname === "/"} />
          <BottomNavItem icon={Zap} label="Shorts" to="/shorts" active={location.pathname === "/shorts"} />
          <Link
            to="/add-content"
            className={cn(
              "flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-500 shadow-lg relative group",
              location.pathname === "/add-content"
                ? "text-black"
                : "text-white hover:scale-105"
            )}
          >
            {/* Tri-color border background */}
            <div className="absolute -inset-[1px] rounded-lg bg-gradient-to-tr from-white via-cyan-400 to-blue-600 -z-20 opacity-80 group-hover:opacity-100 transition-opacity blur-[0.5px]" />
            
            {/* Inner background */}
            <div className={cn(
              "absolute inset-0 rounded-lg -z-10 transition-all duration-500",
              location.pathname === "/add-content"
                ? "bg-gradient-to-br from-white to-white/80"
                : "bg-brand-bg"
            )} />
 
            <Plus className={cn(
              "w-5 h-5 transition-transform duration-500",
              location.pathname !== "/add-content" && "group-hover:rotate-180"
            )} />
            
            {/* Glow effect */}
            <div className="absolute inset-0 rounded-lg bg-blue-500/10 opacity-0 group-hover:opacity-100 blur-lg transition-opacity duration-500 -z-30" />
          </Link>
          <BottomNavItem icon={Layers} label="Channels" to="/channels" active={location.pathname === "/channels"} />
          <BottomNavItem icon={UserCircle} label="Me" to="/me" active={location.pathname === "/me"} />
        </nav>
      )}

      <CreateModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} />
    </div>
  );
}
