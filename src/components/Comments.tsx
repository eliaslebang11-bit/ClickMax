import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ThumbsUp, ThumbsDown, MessageSquare, Send, MoreVertical, ChevronDown, Filter, Heart, Info, DollarSign, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";
import { supabaseService } from "../services/supabaseService";
import { VideoComment } from "../types";
import { useUser } from "../context/UserContext";

interface CommentsProps {
  videoId?: string;
  shortId?: string;
  onCommentsCountChange?: (count: number) => void;
}

function countCommentsTree(commentsList: VideoComment[]): number {
  let count = 0;
  commentsList.forEach(c => {
    count += 1;
    if (c.replies && c.replies.length > 0) {
      count += countCommentsTree(c.replies);
    }
  });
  return count;
}

function getUserColorClass(username: string): string {
  const colors = [
    "bg-red-500",
    "bg-orange-500",
    "bg-amber-500",
    "bg-yellow-500",
    "bg-lime-500",
    "bg-green-500",
    "bg-emerald-500",
    "bg-teal-500",
    "bg-cyan-500",
    "bg-sky-500",
    "bg-blue-500",
    "bg-indigo-500",
    "bg-violet-500",
    "bg-purple-500",
    "bg-fuchsia-500",
    "bg-pink-500",
    "bg-rose-500"
  ];
  if (!username) return colors[0];
  let sum = 0;
  for (let i = 0; i < username.length; i++) {
    sum += username.charCodeAt(i);
  }
  return colors[sum % colors.length];
}

function CommentItem({ 
  comment, 
  onReply,
  isReply = false
}: { 
  comment: VideoComment; 
  onReply: (parentId: string, text: string) => Promise<boolean>;
  isReply?: boolean;
}) {
  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [showReplies, setShowReplies] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load from localStorage whether comment is liked
  const [isLiked, setIsLiked] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("streamcore_liked_comments");
      const list = saved ? JSON.parse(saved) : [];
      return list.includes(comment.id);
    } catch {
      return false;
    }
  });
  
  // Track initial like state to calculate likes offset cleanly
  const [initialLiked] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("streamcore_liked_comments");
      const list = saved ? JSON.parse(saved) : [];
      return list.includes(comment.id);
    } catch {
      return false;
    }
  });

  const handleLikeToggle = async () => {
    const nextLiked = !isLiked;
    setIsLiked(nextLiked);

    try {
      const saved = localStorage.getItem("streamcore_liked_comments");
      let list = saved ? JSON.parse(saved) : [];
      if (nextLiked) {
        if (!list.includes(comment.id)) {
          list.push(comment.id);
        }
      } else {
        list = list.filter((id: string) => id !== comment.id);
      }
      localStorage.setItem("streamcore_liked_comments", JSON.stringify(list));
    } catch (e) {
      console.error(e);
    }

    supabaseService.toggleCommentLike(comment.id).catch(err => {
      console.warn("Failed to toggle comment like on server:", err);
    });
  };

  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || isSubmitting) return;
    
    setIsSubmitting(true);
    const success = await onReply(comment.id, replyText);
    setIsSubmitting(false);

    if (success) {
      setReplyText("");
      setIsReplying(false);
      setShowReplies(true);
    }
  };

  const isCreator = comment.user === "Creator";

  // Mathematically perfect like count:
  let displayedLikes = comment.likes;
  if (initialLiked && !isLiked) {
    displayedLikes = Math.max(0, comment.likes - 1);
  } else if (!initialLiked && isLiked) {
    displayedLikes = comment.likes + 1;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "relative py-2.5",
        !isReply && "border-b border-white/5 last:border-0"
      )}
    >
      <div className="flex gap-2.5">
        <Link to={`/profile/${comment.user}`} className="flex-shrink-0 hover:opacity-80 transition-opacity">
          <div className={cn(
            "rounded-full flex items-center justify-center font-bold text-white uppercase select-none",
            isReply ? "w-5 h-5 text-[10px]" : "w-9 h-9 text-sm",
            getUserColorClass(comment.user)
          )}>
            {comment.user ? comment.user.trim().charAt(0).toUpperCase() : "?"}
          </div>
        </Link>
        
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start gap-2">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5">
                <Link to={`/profile/${comment.user}`} className="hover:underline">
                  <span className="text-[12px] font-bold text-white/90">
                    {comment.user}
                  </span>
                </Link>
                {isCreator && (
                  <span className="bg-red-500 text-[8px] font-black px-1 rounded-sm text-white uppercase tracking-tighter">
                    Creator
                  </span>
                )}
              </div>
              <p className="text-[13px] text-white/90 leading-snug break-words">
                {comment.text}
                <span className="ml-2 text-[11px] text-white/40">{comment.timestamp}</span>
              </p>
              
              <div className="flex items-center gap-4 pt-0.5">
                <button 
                  onClick={() => setIsReplying(!isReplying)}
                  className="text-[11px] font-bold text-white/40 hover:text-white transition-colors"
                >
                  Reply
                </button>
              </div>
            </div>
            
            <div className="flex flex-col items-center gap-0.5 pt-0.5">
              <button 
                onClick={handleLikeToggle}
                className={cn(
                  "transition-all duration-300",
                  isLiked ? "text-red-500 scale-110" : "text-white/30 hover:text-white/50"
                )}
              >
                <Heart className={cn("w-4 h-4", isLiked && "fill-current")} />
              </button>
              <span className="text-[10px] font-medium text-white/30">
                {displayedLikes}
              </span>
            </div>
          </div>

          <AnimatePresence>
            {isReplying && (
              <motion.form 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                onSubmit={handleReplySubmit} 
                className="mt-3"
              >
                <div className="flex gap-2 bg-white/5 p-2 rounded-xl border border-white/5">
                  <textarea
                    autoFocus
                    rows={1}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Add a reply..."
                    className="flex-1 bg-transparent py-1 focus:outline-none transition-colors text-xs resize-none placeholder:text-white/20"
                  />
                  <button 
                    type="submit"
                    disabled={!replyText.trim() || isSubmitting}
                    className="text-xs font-bold text-brand-text disabled:opacity-30 transition-opacity px-2 flex items-center gap-1"
                  >
                    {isSubmitting && <Loader2 className="w-3 h-3 animate-spin" />}
                    Post
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-2">
              {!showReplies ? (
                <button 
                  onClick={() => setShowReplies(true)}
                  className="flex items-center gap-2 text-[11px] font-bold text-white/40 hover:text-white transition-colors py-1"
                >
                  <div className="w-6 h-px bg-white/10" />
                  View more replies ({comment.replies.length})
                </button>
              ) : (
                <div className="space-y-3 mt-2">
                  {comment.replies.map((reply) => (
                    <CommentItem key={reply.id} comment={reply} onReply={onReply} isReply={true} />
                  ))}
                  <button 
                    onClick={() => setShowReplies(false)}
                    className="flex items-center gap-2 text-[11px] font-bold text-white/40 hover:text-white transition-colors py-1"
                  >
                    <div className="w-6 h-px bg-white/10" />
                    Hide replies
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default function Comments({ videoId, shortId, onCommentsCountChange }: CommentsProps) {
  const [comments, setComments] = useState<VideoComment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const { session } = useUser();
  const navigate = useNavigate();

  const loadComments = async () => {
    setIsLoading(true);
    const data = await supabaseService.getComments(videoId, shortId);
    setComments(data);
    setIsLoading(false);
    
    if (onCommentsCountChange) {
      const total = countCommentsTree(data);
      onCommentsCountChange(total);
    }
  };

  useEffect(() => {
    loadComments();
  }, [videoId, shortId]);

  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  const handleReply = async (parentId: string, text: string) => {
    if (!session) {
      navigate("/auth");
      return false;
    }

    const success = await supabaseService.postComment(text, videoId, shortId, parentId);
    if (success === true) {
      loadComments();
      setFeedback({ message: "Reply posted!", type: 'success' });
      return true;
    } else {
      const errorMsg = typeof success === 'string' ? success : "Failed to post reply";
      setFeedback({ message: errorMsg, type: 'error' });
      return false;
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newComment.trim() || isSubmitting) return;

    if (!session) {
      navigate("/auth");
      return;
    }

    try {
      setIsSubmitting(true);
      const success = await supabaseService.postComment(newComment, videoId, shortId);
      
      if (success === true) {
        setNewComment("");
        setFeedback({ message: "Comment posted!", type: 'success' });
        await loadComments();
      } else {
        const errorMsg = typeof success === 'string' ? success : "Failed to post comment.";
        setFeedback({ message: errorMsg, type: 'error' });
      }
    } catch (err) {
      console.error("Error in handleSubmit:", err);
      setFeedback({ message: "Error posting comment", type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex flex-col h-full bg-brand-bg">
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-1">
        {isLoading && !isSubmitting ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="w-6 h-6 animate-spin text-white/20" />
          </div>
        ) : comments.length > 0 ? (
          <AnimatePresence initial={false}>
            {comments.map((comment) => (
              <CommentItem key={comment.id} comment={comment} onReply={handleReply} />
            ))}
          </AnimatePresence>
        ) : (
          <div className="flex flex-col items-center justify-center py-10 gap-3 opacity-30 text-center">
            <MessageSquare className="w-10 h-10" />
            <p className="text-sm font-medium">No comments yet. Be the first!</p>
          </div>
        )}
        <div className="h-4" />
      </div>

      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className={cn(
              "mx-4 mb-2 p-2 rounded-lg text-xs font-bold text-center",
              feedback.type === 'success' ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
            )}
          >
            {feedback.message}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-brand-bg border-t border-white/5 px-4 pt-3 pb-8 shrink-0 z-50">
        <form onSubmit={handleSubmit} className="flex items-center gap-3">
          <div className="flex-1 relative flex items-center bg-white/5 rounded-full px-4 py-2 border border-white/5 focus-within:bg-white/10 transition-colors">
            <input
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={session ? "Add a comment..." : "Log in to comment"}
              className="flex-1 bg-transparent text-sm text-white focus:outline-none placeholder:text-white/30"
              disabled={isSubmitting}
            />
            <div className="flex items-center gap-2 ml-2">
              <button 
                type="button" 
                onClick={() => setNewComment(prev => prev + "😊")}
                className="text-lg hover:scale-110 transition-transform active:scale-90"
                disabled={!session || isSubmitting}
              >
                😊
              </button>
              <button 
                type="button" 
                onClick={() => setNewComment(prev => prev + "🔥")}
                className="text-lg hover:scale-110 transition-transform active:scale-90"
                disabled={!session || isSubmitting}
              >
                🔥
              </button>
            </div>
          </div>
          <button 
            type="submit"
            disabled={!newComment.trim() || isSubmitting}
            className={cn(
              "relative p-2 rounded-full transition-all duration-200",
              newComment.trim() && !isSubmitting
                ? "text-brand-text scale-100" 
                : "text-white/20 scale-90"
            )}
          >
            {isSubmitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5 transition-transform active:scale-90" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
