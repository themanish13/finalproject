
import { useState, useEffect, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Send, Trash2, MoreHorizontal, Pencil, User, MessageCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { useShowProfile } from "@/contexts/ProfileViewerContext";

interface Reply {
  id: string;
  comment_id: string;
  user_id: string;
  content: string;
  created_at: string;
  user_name?: string;
  replies_count?: number;
}

interface NestedCommentProps {
  commentId: string;
  postId: string;
  userId: string | null;
  userName: string;
  content: string;
  createdAt: string;
  isPostAuthor: boolean;
  isCommentAuthor: boolean;
  replyCount: number;
  likeCount: number;
  isLiked: boolean;
  depth?: number;
}

const NestedComment = memo(({
  commentId,
  postId,
  userId,
  userName: commentUserName,
  content,
  createdAt,
  isPostAuthor,
  isCommentAuthor,
  replyCount: initialReplyCount,
  likeCount: initialLikeCount,
  isLiked: initialIsLiked,
  depth = 0,
}: NestedCommentProps) => {
  const { showProfile } = useShowProfile();
  
  const [replies, setReplies] = useState<Reply[]>([]);
  const [showReplies, setShowReplies] = useState(false);
  const [replyCount, setReplyCount] = useState(initialReplyCount);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [isLiked, setIsLiked] = useState(initialIsLiked);
  const [newReply, setNewReply] = useState("");
  const [postingReply, setPostingReply] = useState(false);
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(content);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  
  const maxDepth = 5; // Limit nesting depth to prevent infinite recursion

  // Format time helper
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString();
  };

  // Load replies for this comment
  const loadReplies = async () => {
    try {
      const { data: repliesData } = await supabase
        .from('comment_replies')
        .select('*')
        .eq('comment_id', commentId)
        .order('created_at', { ascending: true });

      if (!repliesData || repliesData.length === 0) {
        setReplies([]);
        return;
      }

      // Get user profiles for replies
      const userIds = [...new Set(repliesData.map(r => r.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', userIds);

      const profileMap = profiles?.reduce((acc, p) => {
        acc[p.id] = p.name || 'User';
        return acc;
      }, {} as Record<string, string>) || {};

      // Get reply counts for each reply (for nested replies)
      const repliesWithNames = await Promise.all(repliesData.map(async (reply) => {
        const { count } = await supabase
          .from('comment_replies')
          .select('*', { count: 'exact', head: true })
          .eq('comment_id', reply.id);

        return {
          ...reply,
          user_name: profileMap[reply.user_id] || 'User',
          replies_count: count || 0,
        };
      }));

      setReplies(repliesWithNames);
    } catch (error) {
      console.error('Error loading replies:', error);
    }
  };

  // Toggle replies visibility
  const toggleReplies = () => {
    const newShowReplies = !showReplies;
    setShowReplies(newShowReplies);
    if (newShowReplies && replies.length === 0) {
      loadReplies();
    }
  };

  // Handle like on comment
  const handleLike = async () => {
    if (!userId) return;

    setIsLiked(!isLiked);
    setLikeCount(prev => isLiked ? prev - 1 : prev + 1);

    try {
      if (isLiked) {
        await supabase
          .from('comment_likes')
          .delete()
          .eq('comment_id', commentId)
          .eq('user_id', userId);
      } else {
        await supabase
          .from('comment_likes')
          .insert({ comment_id: commentId, user_id: userId });
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      // Revert on error
      setIsLiked(isLiked);
      setLikeCount(prev => isLiked ? prev + 1 : prev - 1);
    }
  };

  // Submit a reply
  const handleReply = async () => {
    const content = newReply.trim();
    if (!content || !userId) return;

    setPostingReply(true);
    
    const tempId = `temp-${Date.now()}`;
    const tempReply: Reply = {
      id: tempId,
      comment_id: commentId,
      user_id: userId,
      content,
      created_at: new Date().toISOString(),
      user_name: commentUserName,
    };

    setReplies(prev => [...prev, tempReply]);
    setReplyCount(prev => prev + 1);
    setNewReply("");
    setShowReplyInput(false);

    try {
      await supabase
        .from('comment_replies')
        .insert({
          comment_id: commentId,
          user_id: userId,
          content,
        });
    } catch (error) {
      console.error('Error adding reply:', error);
      // Remove temp reply on error
      setReplies(prev => prev.filter(r => r.id !== tempId));
      setReplyCount(prev => prev - 1);
    } finally {
      setPostingReply(false);
    }
  };

  // Delete this comment
  const handleDelete = async () => {
    try {
      await supabase.from('comment_likes').delete().eq('comment_id', commentId);
      await supabase.from('comment_replies').delete().eq('comment_id', commentId);
      await supabase.from('post_comments').delete().eq('id', commentId);
      setOpenMenuId(null);
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  // Edit comment
  const handleEdit = () => {
    setIsEditing(true);
    setOpenMenuId(null);
  };

  const saveEdit = async () => {
    if (!editContent.trim()) return;
    
    try {
      await supabase
        .from('post_comments')
        .update({ content: editContent.trim() })
        .eq('id', commentId);
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating comment:', error);
    }
  };

  const canModify = isPostAuthor || isCommentAuthor;

  return (
    <div className={cn("relative overflow-visible", depth > 0 && "ml-4 pl-3 border-l border-white/10")}>
      {/* Comment Content */}
      <div className="bg-white/5 rounded-lg p-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-1.5 flex-1 min-w-0">
            <div 
              className="w-6 h-6 rounded-lg bg-gradient-to-br from-primary/20 to-[#972837]/10 flex items-center justify-center shrink-0 cursor-pointer"
              onClick={() => showProfile(commentUserName)}
            >
              <User className="w-3 h-3 text-primary" />
            </div>
            <div className="flex flex-col gap-0.5 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span 
                  className={cn("text-xs font-bold truncate cursor-pointer", commentUserName === 'Anonymous' ? 'text-red-500' : 'text-[#F5F5E6]')}
                  onClick={() => showProfile(commentUserName)}
                >
                  {commentUserName}
                </span>
                <span className="text-[10px]" style={{ color: 'rgba(245, 245, 230, 0.4)' }}>
                  {formatTime(createdAt)}
                </span>
              </div>
              
              {/* Edit Mode */}
              {isEditing ? (
                <div className="mt-1">
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full bg-white/5 rounded-lg p-2 text-white text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                    rows={2}
                  />
                  <div className="flex gap-2 mt-1">
                    <button
                      onClick={saveEdit}
                      className="px-3 py-1 bg-primary text-white rounded text-xs"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="px-3 py-1 bg-white/10 text-gray-300 rounded text-xs"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <span className="text-xs text-gray-200">{content}</span>
              )}
            </div>
          </div>
          
          {/* Menu Button */}
          {canModify && (
            <div className="relative shrink-0 overflow-visible">
              <button
                onClick={() => setOpenMenuId(openMenuId === commentId ? null : commentId)}
                className="p-1.5 hover:bg-white/10 rounded text-gray-500 transition-colors"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
              {openMenuId === commentId && (
                <div className="absolute right-0 top-8 bg-[#1A221F] border border-white/10 rounded-lg shadow-xl z-[100] py-1 min-w-[120px] overflow-visible">
                  <button
                    onClick={handleEdit}
                    className="w-full px-4 py-2.5 text-left text-gray-300 hover:bg-white/10 flex items-center gap-3 text-sm"
                  >
                    <Pencil className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    onClick={handleDelete}
                    className="w-full px-4 py-2.5 text-left text-red-400 hover:bg-white/10 flex items-center gap-3 text-sm"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Comment Actions */}
        <div className="flex items-center gap-3 mt-1.5 pl-7">
          <button 
            onClick={handleLike}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-400 transition-colors"
          >
            <Heart className={cn("w-3.5 h-3.5", isLiked && "fill-red-400 text-red-400")} />
            <span>{likeCount}</span>
          </button>
          
          {depth < maxDepth && (
            <button 
              onClick={() => setShowReplyInput(!showReplyInput)}
              className="text-xs text-gray-500 hover:text-white transition-colors"
            >
              Reply
            </button>
          )}
        </div>
        
        {/* Reply Input */}
        <AnimatePresence>
          {showReplyInput && userId && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-2 pl-7 overflow-hidden"
            >
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={newReply}
                  onChange={(e) => setNewReply(e.target.value)}
                  placeholder="Write a reply..."
                  className="flex-1 bg-white/5 rounded-full px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary text-white placeholder:text-gray-500"
                  onKeyDown={(e) => e.key === 'Enter' && handleReply()}
                />
                <button
                  onClick={handleReply}
                  disabled={!newReply.trim() || postingReply}
                  className="p-1.5 text-gray-400 hover:text-primary disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* View Replies Button */}
      {replyCount > 0 && (
        <button
          onClick={toggleReplies}
          className="ml-7 mt-1.5 flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
        >
          <MessageCircle className="w-3 h-3" />
          <span>
            {showReplies ? 'Hide' : 'View'} {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
          </span>
        </button>
      )}

      {/* Replies Section */}
      <AnimatePresence>
        {showReplies && replies.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mt-2 pl-4 overflow-hidden"
          >
            <div className="space-y-2">
              {replies.map((reply) => (
                <NestedComment
                  key={reply.id}
                  commentId={reply.id}
                  postId={postId}
                  userId={userId}
                  userName={reply.user_name || 'User'}
                  content={reply.content}
                  createdAt={reply.created_at}
                  isPostAuthor={false}
                  isCommentAuthor={userId === reply.user_id}
                  replyCount={reply.replies_count || 0}
                  likeCount={0}
                  isLiked={false}
                  depth={depth + 1}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

NestedComment.displayName = 'NestedComment';

export default NestedComment;

