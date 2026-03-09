import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Heart, MessageCircle, Send, Trash2, Loader2, MoreHorizontal, Pencil, User, Eye, EyeOff
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { useShowProfile } from "@/contexts/ProfileViewerContext";

interface Post {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  likes_count?: number;
  comments_count?: number;
  is_liked?: boolean;
}

interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  user_name?: string;
}

interface Reply {
  id: string;
  comment_id: string;
  user_id: string;
  content: string;
  created_at: string;
  user_name?: string;
}

const Home = () => {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState<string>('');
  const [newPostContent, setNewPostContent] = useState("");
  const [posting, setPosting] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(true);
  
  // Comments state
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [showComments, setShowComments] = useState<Record<string, boolean>>({});
  const [newComment, setNewComment] = useState<Record<string, string>>({});
  const [postingComment, setPostingComment] = useState<Record<string, boolean>>({});
  
  // Replies state
  const [replies, setReplies] = useState<Record<string, Reply[]>>({});
  const [showReplies, setShowReplies] = useState<Record<string, boolean>>({});
  const [newReply, setNewReply] = useState<Record<string, string>>({});
  const [postingReply, setPostingReply] = useState<Record<string, boolean>>({});
  const [replyCounts, setReplyCounts] = useState<Record<string, number>>({});
  
  // Comment likes state
  const [commentLikes, setCommentLikes] = useState<Record<string, { count: number; isLiked: boolean }>>({});
  
  // Menu and edit state
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [openCommentMenuId, setOpenCommentMenuId] = useState<string | null>(null);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  
  // Use global profile viewer
  const { showProfile } = useShowProfile();
  
  // Click outside handler to close menu
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (openMenuId && !(e.target as Element).closest('.menu-container')) {
        setOpenMenuId(null);
      }
      if (openCommentMenuId && !(e.target as Element).closest('.comment-menu-container')) {
        setOpenCommentMenuId(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [openMenuId, openCommentMenuId]);

  // Load current user and posts
  useEffect(() => {
    const init = async () => {
      await loadCurrentUser();
      await loadPosts();
    };
    init();
  }, []);

  // Real-time subscriptions
  useEffect(() => {
    if (!currentUserId) return;

    const postsChannel = supabase
      .channel('posts-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => {
        loadPosts();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'post_likes' }, () => {
        loadPosts();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'post_comments' }, () => {
        loadPosts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(postsChannel);
    };
  }, [currentUserId]);

  const loadCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        const { data: profile } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', user.id)
          .single();
        if (profile?.name) {
          setCurrentUserName(profile.name);
        }
      }
    } catch (e) {
      console.log('User not logged in');
    }
  };

  const loadPosts = useCallback(async () => {
    setLoading(true);
    try {
      const { data: postsData, error } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.log('Posts table may not exist yet');
        setPosts([]);
        setLoading(false);
        return;
      }

      if (!postsData || postsData.length === 0) {
        setPosts([]);
        setLoading(false);
        return;
      }

      const postsWithCounts = await Promise.all((postsData || []).map(async (post) => {
        try {
          const { count: likesCount } = await supabase
            .from('post_likes')
            .select('user_id', { count: 'exact', head: true })
            .eq('post_id', post.id);

          const { count: commentsCount } = await supabase
            .from('post_comments')
            .select('*', { count: 'exact', head: true })
            .eq('post_id', post.id);

          let isLiked = false;
          if (currentUserId) {
            const { data: likeData } = await supabase
              .from('post_likes')
              .select('id')
              .eq('post_id', post.id)
              .eq('user_id', currentUserId)
              .single();
            isLiked = !!likeData;
          }

          return {
            ...post,
            likes_count: likesCount || 0,
            comments_count: commentsCount || 0,
            is_liked: isLiked,
          };
        } catch {
          return {
            ...post,
            likes_count: 0,
            comments_count: 0,
            is_liked: false,
          };
        }
      }));

      setPosts(postsWithCounts);
    } catch (error) {
      console.error('Error loading posts:', error);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  const loadComments = async (postId: string) => {
    try {
      const { data: commentsData } = await supabase
        .from('post_comments')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      if (!commentsData || commentsData.length === 0) {
        setComments(prev => ({ ...prev, [postId]: [] }));
        return;
      }

      const { data: post } = await supabase
        .from('posts')
        .select('user_id')
        .eq('id', postId)
        .single();
      
      const postAuthorId = post?.user_id;

      const userIds = [...new Set(commentsData.map(c => c.user_id))];
      
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', userIds);

      const profileMap = profiles?.reduce((acc, p) => {
        acc[p.id] = p.name || 'User';
        return acc;
      }, {} as Record<string, string>) || {};

      const commentsWithNames = commentsData.map(comment => ({
        ...comment,
        user_name: comment.user_id === postAuthorId ? 'Anonymous' : (profileMap[comment.user_id] || 'User')
      }));

      const { data: allCommentLikes } = await supabase
        .from('comment_likes')
        .select('comment_id, user_id')
        .in('comment_id', commentsData.map(c => c.id));

      const likedCommentIds = new Set(
        allCommentLikes?.filter(l => l.user_id === currentUserId).map(l => l.comment_id) || []
      );

      const likeCounts: Record<string, number> = {};
      allCommentLikes?.forEach(like => {
        likeCounts[like.comment_id] = (likeCounts[like.comment_id] || 0) + 1;
      });

      const newCommentLikes: typeof commentLikes = {};
      commentsData.forEach(comment => {
        newCommentLikes[comment.id] = {
          count: likeCounts[comment.id] || 0,
          isLiked: likedCommentIds.has(comment.id)
        };
      });
      setCommentLikes(prev => ({ ...prev, ...newCommentLikes }));

      setComments(prev => ({ ...prev, [postId]: commentsWithNames }));
    } catch (error) {
      console.error('Error loading comments:', error);
    }
  };

  const handleCreatePost = async () => {
    if (!newPostContent.trim()) {
      return;
    }

    if (!currentUserId) {
      return;
    }

    setPosting(true);
    try {
      const { error } = await supabase
        .from('posts')
        .insert({
          user_id: currentUserId,
          content: newPostContent.trim(),
        });

      if (error) {
        console.error('Post error:', error);
        return;
      }
      
      setNewPostContent("");
      await loadPosts();
    } catch (error) {
      console.error('Error creating post:', error);
    } finally {
      setPosting(false);
    }
  };

  const handleLike = async (postId: string) => {
    if (!currentUserId) {
      return;
    }

    const post = posts.find(p => p.id === postId);
    if (!post) return;

    if (post.is_liked) {
      return;
    }

    try {
      await supabase
        .from('post_likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', currentUserId);
    } catch (e) {
      // Continue even if delete fails
    }

    setPosts(prev => prev.map(p => {
      if (p.id === postId) {
        return {
          ...p,
          is_liked: true,
          likes_count: (p.likes_count || 0) + 1
        };
      }
      return p;
    }));

    try {
      await supabase
        .from('post_likes')
        .insert({ post_id: postId, user_id: currentUserId });
    } catch (error) {
      console.error('Error adding like:', error);
      setPosts(prev => prev.map(p => {
        if (p.id === postId) {
          return {
            ...p,
            is_liked: false,
            likes_count: Math.max(0, (p.likes_count || 1) - 1)
          };
        }
        return p;
      }));
    }
  };

  const handleComment = async (postId: string) => {
    const content = newComment[postId]?.trim();
    if (!content || !currentUserId) return;

    const tempId = `temp-${Date.now()}`;
    const tempComment: Comment = {
      id: tempId,
      post_id: postId,
      user_id: currentUserId,
      content,
      created_at: new Date().toISOString()
    };

    setComments(prev => ({
      ...prev,
      [postId]: [...(prev[postId] || []), tempComment]
    }));
    setNewComment(prev => ({ ...prev, [postId]: '' }));
    
    setPosts(prev => prev.map(p => {
      if (p.id === postId) {
        return { ...p, comments_count: (p.comments_count || 0) + 1 };
      }
      return p;
    }));

    setPostingComment(prev => ({ ...prev, [postId]: true }));
    
    try {
      await supabase
        .from('post_comments')
        .insert({
          post_id: postId,
          user_id: currentUserId,
          content,
        });
    } catch (error) {
      console.error('Error adding comment:', error);
      setComments(prev => ({
        ...prev,
        [postId]: (prev[postId] || []).filter(c => c.id !== tempId)
      }));
      setPosts(prev => prev.map(p => {
        if (p.id === postId) {
          return { ...p, comments_count: Math.max(0, (p.comments_count || 1) - 1) };
        }
        return p;
      }));
    } finally {
      setPostingComment(prev => ({ ...prev, [postId]: false }));
    }
  };

  const loadReplies = async (commentId: string) => {
    try {
      const { data: repliesData } = await supabase
        .from('comment_replies')
        .select('*')
        .eq('comment_id', commentId)
        .order('created_at', { ascending: true });

      if (!repliesData || repliesData.length === 0) {
        setReplies(prev => ({ ...prev, [commentId]: [] }));
        return;
      }

      const userIds = [...new Set(repliesData.map(r => r.user_id))];
      
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', userIds);

      const profileMap = profiles?.reduce((acc, p) => {
        acc[p.id] = p.name || 'User';
        return acc;
      }, {} as Record<string, string>) || {};

      const repliesWithNames = repliesData.map(reply => ({
        ...reply,
        user_name: profileMap[reply.user_id] || 'User'
      }));

      setReplies(prev => ({ ...prev, [commentId]: repliesWithNames }));
    } catch (error) {
      console.error('Error loading replies:', error);
    }
  };

  const handleReply = async (postId: string, commentId: string) => {
    const content = newReply[commentId]?.trim();
    if (!content || !currentUserId) return;

    const tempId = `temp-${Date.now()}`;
    const tempReply: Reply = {
      id: tempId,
      comment_id: commentId,
      user_id: currentUserId,
      content,
      created_at: new Date().toISOString(),
      user_name: currentUserName || 'User'
    };

    setReplies(prev => ({
      ...prev,
      [commentId]: [...(prev[commentId] || []), tempReply]
    }));
    setNewReply(prev => ({ ...prev, [commentId]: '' }));
    setShowReplies(prev => ({ ...prev, [commentId]: true }));

    setPostingReply(prev => ({ ...prev, [commentId]: true }));
    
    try {
      await supabase
        .from('comment_replies')
        .insert({
          comment_id: commentId,
          user_id: currentUserId,
          content,
        });
    } catch (error) {
      console.error('Error adding reply:', error);
      setReplies(prev => ({
        ...prev,
        [commentId]: (prev[commentId] || []).filter(r => r.id !== tempId)
      }));
    } finally {
      setPostingReply(prev => ({ ...prev, [commentId]: false }));
    }
  };

  const toggleReplies = (commentId: string) => {
    const newShowReplies = !showReplies[commentId];
    setShowReplies(prev => ({ ...prev, [commentId]: newShowReplies }));
    if (newShowReplies && !replies[commentId]) {
      loadReplies(commentId);
    }
  };

  const handleCommentLike = async (commentId: string) => {
    if (!currentUserId) return;

    const isCurrentlyLiked = commentLikes[commentId]?.isLiked || false;

    setCommentLikes(prev => ({
      ...prev,
      [commentId]: {
        count: (prev[commentId]?.count || 0) + (isCurrentlyLiked ? -1 : 1),
        isLiked: !isCurrentlyLiked
      }
    }));

    try {
      if (isCurrentlyLiked) {
        await supabase
          .from('comment_likes')
          .delete()
          .eq('comment_id', commentId)
          .eq('user_id', currentUserId);
      } else {
        await supabase
          .from('comment_likes')
          .insert({ comment_id: commentId, user_id: currentUserId });
      }
    } catch (error) {
      console.error('Error toggling comment like:', error);
      setCommentLikes(prev => ({
        ...prev,
        [commentId]: {
          count: prev[commentId]?.count || 0,
          isLiked: isCurrentlyLiked
        }
      }));
    }
  };

  const handleDelete = async (postId: string) => {
    try {
      const post = posts.find(p => p.id === postId);
      if (!post || post.user_id !== currentUserId) {
        console.error('Unauthorized deletion attempt');
        return;
      }

      await supabase.from('post_likes').delete().eq('post_id', postId);
      await supabase.from('post_comments').delete().eq('post_id', postId);
      await supabase.from('post_shares').delete().eq('post_id', postId);
      await supabase.from('posts').delete().eq('id', postId);

      setPosts(prev => prev.filter(p => p.id !== postId));
      setOpenMenuId(null);
    } catch (error) {
      console.error('Error deleting post:', error);
    }
  };

  const handleDeleteComment = async (postId: string, commentId: string) => {
    try {
      await supabase.from('comment_likes').delete().eq('comment_id', commentId);
      await supabase.from('comment_replies').delete().eq('comment_id', commentId);
      await supabase.from('post_comments').delete().eq('id', commentId);

      setComments(prev => ({
        ...prev,
        [postId]: (prev[postId] || []).filter(c => c.id !== commentId)
      }));
      
      setPosts(prev => prev.map(p => {
        if (p.id === postId) {
          return { ...p, comments_count: Math.max(0, (p.comments_count || 1) - 1) };
        }
        return p;
      }));
      
      setOpenCommentMenuId(null);
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  const handleEditComment = (commentId: string, currentContent: string) => {
    setEditingCommentId(commentId);
    setEditContent(currentContent);
    setOpenCommentMenuId(null);
  };

  const saveCommentEdit = async (postId: string, commentId: string) => {
    if (!editContent.trim()) return;
    
    try {
      await supabase
        .from('post_comments')
        .update({ content: editContent.trim() })
        .eq('id', commentId);
      
      setComments(prev => ({
        ...prev,
        [postId]: (prev[postId] || []).map(c => 
          c.id === commentId ? { ...c, content: editContent.trim() } : c
        )
      }));
      setEditingCommentId(null);
      setEditContent("");
    } catch (error) {
      console.error('Error updating comment:', error);
    }
  };

  const cancelCommentEdit = () => {
    setEditingCommentId(null);
    setEditContent("");
  };

  const handleEdit = (postId: string, currentContent: string) => {
    const post = posts.find(p => p.id === postId);
    if (!post || post.user_id !== currentUserId) {
      console.error('Unauthorized edit attempt');
      return;
    }
    setEditingPostId(postId);
    setEditContent(currentContent);
    setOpenMenuId(null);
  };

  const saveEdit = async (postId: string) => {
    if (!editContent.trim()) return;
    
    try {
      await supabase
        .from('posts')
        .update({ content: editContent.trim() })
        .eq('id', postId);
      
      setPosts(prev => prev.map(p => 
        p.id === postId ? { ...p, content: editContent.trim() } : p
      ));
      setEditingPostId(null);
      setEditContent("");
    } catch (error) {
      console.error('Error updating post:', error);
    }
  };

  const cancelEdit = () => {
    setEditingPostId(null);
    setEditContent("");
  };

  const toggleComments = (postId: string) => {
    const newShowComments = !showComments[postId];
    setShowComments(prev => ({ ...prev, [postId]: newShowComments }));
    if (newShowComments && !comments[postId]) {
      loadComments(postId);
    }
  };

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

  // Get user avatar from localStorage
  const avatarUrl = localStorage.getItem('navbar_avatarUrl') || "";
  const userName = localStorage.getItem('navbar_userName') || "User";

  const getInitials = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      {/* Mobile Header - Only shows on small screens */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border lg:hidden">
        <div className="px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-bold text-white">Home</h1>
          <button 
            onClick={() => navigate("/settings")}
            className="p-1.5 rounded-full hover:bg-white/10 transition-colors"
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt={userName} className="w-8 h-8 rounded-full object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                <span className="text-sm font-bold text-blue-400">{getInitials(userName)}</span>
              </div>
            )}
          </button>
        </div>
      </header>



<div className="container mx-auto px-4 md:px-6 py-4 md:py-6 max-w-2xl mx-auto">
        {/* Create Post Panel - Glass Panel */}
        <div className="mb-4 p-3 rounded-lg" style={{ background: 'linear-gradient(to bottom, #2b2b2b 0%, #1e1e1e 100%)' }}>
{/* Input Area */}
          <div className="flex items-center gap-2">
            <div className="flex-1 border-b" style={{ borderColor: 'rgba(245, 245, 230, 0.2)' }}>
              <Textarea
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                placeholder="Share something..."
                className="min-h-[36px] h-9 resize-none border-none focus-visible:ring-0 bg-transparent text-sm"
                style={{ color: 'rgba(245, 245, 230, 0.6)' }}
              />
            </div>

            {/* Anonymous Toggle with Eye Icon - Dark Green */}
            <div className="flex items-center px-2">
              <button
                onClick={() => setIsAnonymous(!isAnonymous)}
                className="flex items-center justify-center w-9 h-9 rounded-full transition-all"
                style={{ backgroundColor: '#006600' }}
              >
                {isAnonymous ? (
                  <Eye className="w-4 h-4 text-white" />
                ) : (
                  <EyeOff className="w-4 h-4 text-white" />
                )}
              </button>
            </div>
            
            {/* Post Button - Blue with White Text */}
            <button 
              onClick={handleCreatePost}
              disabled={!newPostContent.trim() || posting}
              className="flex items-center justify-center px-4 py-1.5 rounded-md transition-all text-sm font-medium bg-[#0078d4] text-white hover:bg-[#006cbd]"
            >
              {posting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
              ) : (
                "Post"
              )}
            </button>
          </div>
        </div>

        {/* Posts Feed */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="p-4 bg-[#161A18] border border-white/5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
                    <div className="h-3 w-24 bg-muted rounded animate-pulse" />
                  </div>
                  <div className="w-6 h-6 bg-muted rounded animate-pulse" />
                </div>
                <div className="space-y-2 mb-3">
                  <div className="h-4 w-full bg-muted rounded animate-pulse" />
                  <div className="h-4 w-3/4 bg-muted rounded animate-pulse" />
                </div>
                <div className="flex items-center gap-4 pt-2 border-t border-white/5">
                  <div className="h-5 w-12 bg-muted rounded animate-pulse" />
                  <div className="h-5 w-12 bg-muted rounded animate-pulse" />
                </div>
              </Card>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <div className="text-4xl mb-3">🌌</div>
            <p className="text-sm">No posts yet. Be the first to share anonymously!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {posts.map((post, index) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
              >
                <Card className="p-4 bg-gradient-to-b from-[#1A221F]/80 to-[#161A18]/80 border border-white/5 backdrop-blur-sm">
                  {/* Post Header */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary/30 to-[#972837]/20 flex items-center justify-center border border-primary/20 cursor-pointer hover:scale-105 transition-transform"
                        onClick={() => showProfile('Anonymous')}
                      >
                        <User className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <span className="font-medium text-sm text-white">Anonymous</span>
                        <span className="text-[10px] text-gray-500 ml-2">· {formatTime(post.created_at)}</span>
                      </div>
                    </div>
                    <div className="relative menu-container">
                      {currentUserId === post.user_id && (
                        <button
                          onClick={() => setOpenMenuId(openMenuId === post.id ? null : post.id)}
                          className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400 transition-colors"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      )}
                      {openMenuId === post.id && currentUserId === post.user_id && (
                        <div className="absolute right-0 top-8 bg-[#1A221F] border border-white/10 rounded-lg shadow-xl z-10 py-1 min-w-[120px]">
                          <button
                            onClick={() => handleEdit(post.id, post.content)}
                            className="w-full px-4 py-2 text-left text-gray-300 hover:bg-white/10 flex items-center gap-2 text-sm"
                          >
                            <Pencil className="w-4 h-4" />
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(post.id)}
                            className="w-full px-4 py-2 text-left text-red-400 hover:bg-white/10 flex items-center gap-2 text-sm"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Post Content - Edit Mode */}
                  {editingPostId === post.id ? (
                    <div className="mb-3">
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="w-full bg-white/5 rounded-lg p-3 text-white text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                        rows={3}
                      />
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => saveEdit(post.id)}
                          className="px-4 py-1.5 bg-primary text-white rounded-lg text-sm"
                        >
                          Save
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="px-4 py-1.5 bg-white/10 text-gray-300 rounded-lg text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm whitespace-pre-wrap mb-3 leading-relaxed text-gray-200">{post.content}</p>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-4 pt-2 border-t border-white/5">
                    <button
                      onClick={() => handleLike(post.id)}
                      className={cn(
                        "flex items-center gap-1.5 transition-colors text-sm",
                        post.is_liked ? "text-red-400" : "text-gray-400 hover:text-red-400"
                      )}
                    >
                      <Heart className={cn("w-5 h-5", post.is_liked && "fill-red-400 text-red-400")} />
                      <span>{post.likes_count || 0}</span>
                    </button>

                    <button
                      onClick={() => toggleComments(post.id)}
                      className="flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors text-sm"
                    >
                      <MessageCircle className="w-5 h-5" />
                      <span>{post.comments_count || 0}</span>
                    </button>
                  </div>

                  {/* Comments Section */}
                  <AnimatePresence>
                    {showComments[post.id] && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="mt-3 pt-3 border-t border-white/5 overflow-hidden"
                      >
                        {/* Comment Input - Dark Theme */}
                        <div className="flex gap-2 mb-3">
                          <input
                            type="text"
                            value={newComment[post.id] || ''}
                            onChange={(e) => setNewComment(prev => ({ ...prev, [post.id]: e.target.value }))}
                            placeholder="Write a comment..."
                            className="flex-1 rounded-lg px-3 py-2 text-sm focus:outline-none"
                            style={{ backgroundColor: '#2b2b2b', color: '#F5F5E6', border: '1px solid rgba(245, 245, 230, 0.2)' }}
                            onKeyDown={(e) => e.key === 'Enter' && handleComment(post.id)}
                          />
                          <Button
                            size="sm"
                            onClick={() => handleComment(post.id)}
                            disabled={!newComment[post.id]?.trim() || postingComment[post.id]}
                            className="rounded-lg px-3 py-2 text-sm font-medium"
                            style={{ backgroundColor: '#006600', color: '#fff' }}
                          >
                            {postingComment[post.id] ? <Loader2 className="w-4 h-4 animate-spin" /> : "Post"}
                          </Button>
                        </div>

                        {/* Comments List */}
                        <div className="space-y-2">
                          {(comments[post.id] || []).map(comment => (
                            <div key={comment.id} className="bg-white/5 rounded-lg p-2.5">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                  <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-primary/20 to-[#972837]/10 flex items-center justify-center shrink-0">
                                    <User className="w-3 h-3 text-primary" />
                                  </div>
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <span className={`text-xs font-bold truncate ${comment.user_name === 'Anonymous' ? 'text-red-500' : ''}`} style={{ color: comment.user_name === 'Anonymous' ? '#ef4444' : '#F5F5E6' }}>{comment.user_name}</span>
                                    <span className="text-xs text-gray-200 truncate">{comment.content}</span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="text-[10px]" style={{ color: 'rgba(245, 245, 230, 0.4)' }}>{formatTime(comment.created_at)}</span>
                                  <div className="relative comment-menu-container">
                                    <button
                                      onClick={() => setOpenCommentMenuId(openCommentMenuId === comment.id ? null : comment.id)}
                                      className="p-1 hover:bg-white/10 rounded text-gray-500 transition-colors"
                                    >
                                      <MoreHorizontal className="w-3 h-3" />
                                    </button>
                                    {openCommentMenuId === comment.id && (
                                      <div className="absolute right-0 top-5 bg-[#1A221F] border border-white/10 rounded-lg shadow-xl z-10 py-1 min-w-[100px]">
                                        {(currentUserId === post.user_id || currentUserId === comment.user_id) && (
                                          <>
                                            <button
                                              onClick={() => handleEditComment(comment.id, comment.content)}
                                              className="w-full px-3 py-1.5 text-left text-gray-300 hover:bg-white/10 flex items-center gap-2 text-xs"
                                            >
                                              <Pencil className="w-3 h-3" />
                                              Edit
                                            </button>
                                            <button
                                              onClick={() => handleDeleteComment(post.id, comment.id)}
                                              className="w-full px-3 py-1.5 text-left text-red-400 hover:bg-white/10 flex items-center gap-2 text-xs"
                                            >
                                              <Trash2 className="w-3 h-3" />
                                              Delete
                                            </button>
                                          </>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                              
                              {/* Comment Content - Edit Mode */}
                              {editingCommentId === comment.id ? (
                                <div className="mt-1 ml-7">
                                  <textarea
                                    value={editContent}
                                    onChange={(e) => setEditContent(e.target.value)}
                                    className="w-full bg-white/5 rounded-lg p-2 text-white text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                                    rows={2}
                                  />
                                  <div className="flex gap-2 mt-1">
                                    <button
                                      onClick={() => saveCommentEdit(post.id, comment.id)}
                                      className="px-3 py-1 bg-primary text-white rounded text-xs"
                                    >
                                      Save
                                    </button>
                                    <button
                                      onClick={cancelCommentEdit}
                                      className="px-3 py-1 bg-white/10 text-gray-300 rounded text-xs"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              ) : null}
                              
                              {/* Comment Actions */}
                              <div className="flex items-center gap-3 mt-1.5 pl-7">
                                <button 
                                  onClick={() => handleCommentLike(comment.id)}
                                  className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-400"
                                >
                                  <Heart className={cn("w-3.5 h-3.5", (commentLikes[comment.id]?.isLiked) && "fill-red-400 text-red-400")} />
                                  <span>{commentLikes[comment.id]?.count || 0}</span>
                                </button>
                                <button 
                                  onClick={() => toggleReplies(comment.id)}
                                  className="text-xs text-gray-500 hover:text-white"
                                >
                                  Reply
                                </button>
                              </div>
                              
                              {/* Reply Input */}
                              {showReplies[comment.id] && (
                                <div className="mt-2 pl-4 border-l border-white/10">
                                  <div className="flex gap-1.5 mb-2">
                                    <input
                                      type="text"
                                      value={newReply[comment.id] || ''}
                                      onChange={(e) => setNewReply(prev => ({ ...prev, [comment.id]: e.target.value }))}
                                      placeholder="Write a reply..."
                                      className="flex-1 bg-white/5 rounded-full px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary text-white placeholder:text-gray-500"
                                      onKeyDown={(e) => e.key === 'Enter' && handleReply(post.id, comment.id)}
                                    />
                                    <button
                                      onClick={() => handleReply(post.id, comment.id)}
                                      disabled={!newReply[comment.id]?.trim() || postingReply[comment.id]}
                                      className="p-1.5 text-gray-400 hover:text-primary"
                                    >
                                      <Send className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                  
                                  {/* Replies List */}
                                  <div className="space-y-1.5">
                                    {(replies[comment.id] || []).map(reply => (
                                      <div key={reply.id} className="bg-white/5 rounded p-1.5">
                                        <div className="flex items-center gap-1 mb-0.5">
                                          <div className="w-5 h-5 rounded bg-gradient-to-br from-primary/20 to-[#972837]/10 flex items-center justify-center">
                                            <User className="w-2.5 h-2.5 text-primary" />
                                          </div>
                                          <span className="text-xs font-medium text-[#972837]">Anonymous</span>
                                          <span className="text-[8px] text-gray-500">{formatTime(reply.created_at)}</span>
                                        </div>
                                        <p className="text-xs text-gray-200 pl-6">{reply.content}</p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;

