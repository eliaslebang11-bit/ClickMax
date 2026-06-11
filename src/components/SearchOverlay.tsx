import React, { useState, useEffect, useRef } from "react";
import { Search, X, Clock, ArrowLeft, TrendingUp } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onSearch: (query: string) => void;
  initialQuery?: string;
  placeholder?: string;
}

export default function SearchOverlay({ 
  isOpen, 
  onClose, 
  onSearch, 
  initialQuery = "",
  placeholder = "Search ClickMax..."
}: SearchOverlayProps) {
  const [query, setQuery] = useState(initialQuery);
  const [history, setHistory] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const savedHistory = localStorage.getItem("search_history");
    if (savedHistory) {
      setHistory(JSON.parse(savedHistory));
    }
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSearch = (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    
    const newHistory = [searchQuery, ...history.filter(h => h !== searchQuery)].slice(0, 10);
    setHistory(newHistory);
    localStorage.setItem("search_history", JSON.stringify(newHistory));
    onSearch(searchQuery);
    onClose();
  };

  const removeHistoryItem = (item: string) => {
    const newHistory = history.filter(h => h !== item);
    setHistory(newHistory);
    localStorage.setItem("search_history", JSON.stringify(newHistory));
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem("search_history");
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-brand-bg flex flex-col"
        >
          {/* Search Header */}
          <div className="h-16 border-b border-brand-border flex items-center px-4 md:px-6 gap-3 bg-brand-bg sticky top-0 z-10">
            <button 
              onClick={onClose}
              className="p-2 hover:bg-brand-text/10 rounded-full transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            
            <div className="flex-1 relative">
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch(query)}
                placeholder={placeholder}
                className="w-full bg-transparent py-2 text-base font-medium focus:outline-none placeholder:text-brand-muted/40"
              />
              {query && (
                <button 
                  onClick={() => setQuery("")}
                  className="absolute right-0 top-1/2 -translate-y-1/2 p-1.5 hover:bg-brand-text/10 rounded-full transition-colors"
                >
                  <X className="w-4 h-4 text-brand-muted" />
                </button>
              )}
            </div>

            <button 
              onClick={() => handleSearch(query)}
              className={cn(
                "p-2 rounded-full transition-all",
                query.trim() ? "bg-brand-text text-brand-bg shadow-md" : "hover:bg-brand-text/10"
              )}
            >
              <Search className="w-5 h-5" />
            </button>
          </div>

          {/* Search Content */}
          <div className="flex-1 overflow-y-auto p-4 max-w-2xl mx-auto w-full space-y-8">
            {/* History Section */}
            {history.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between px-2">
                  <h3 className="text-xs font-bold text-brand-muted">Recent searches</h3>
                  <button 
                    onClick={clearHistory}
                    className="text-xs font-bold text-brand-muted hover:text-brand-text transition-colors"
                  >
                    Clear all
                  </button>
                </div>
                <div className="space-y-0.5">
                  {history.map((item) => (
                    <div 
                      key={item}
                      className="group flex items-center justify-between p-2 hover:bg-brand-text/5 rounded-lg transition-colors cursor-pointer"
                      onClick={() => {
                        setQuery(item);
                        handleSearch(item);
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <Clock className="w-4 h-4 text-brand-muted" />
                        <span className="text-sm">{item}</span>
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          removeHistoryItem(item);
                        }}
                        className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-brand-text/10 rounded-full transition-all"
                      >
                        <X className="w-3.5 h-3.5 text-brand-muted" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Trending Section */}
            <div className="space-y-6">
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-brand-muted px-2">Trending searches</h3>
                <div className="space-y-0.5">
                  {["Video lighting", "Resolve workflow", "Camera gear 2024", "Color grading tips"].map((item) => (
                    <div 
                      key={item}
                      className="flex items-center gap-3 p-2 hover:bg-brand-text/5 rounded-lg transition-colors cursor-pointer"
                      onClick={() => {
                        setQuery(item);
                        handleSearch(item);
                      }}
                    >
                      <TrendingUp className="w-4 h-4 text-brand-muted" />
                      <span className="text-sm">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
