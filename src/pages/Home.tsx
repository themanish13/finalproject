import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Heart, MessageCircle, Send, Trash2, Loader2, Home as HomeIcon, MoreHorizontal, Pencil
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

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
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState<string>('');
  const [newPostContent, setNewPostContent] = useState("");
  const [posting, setPosting] = useState(false);
  
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
  
  // Comment likes state
  const [commentLikes, setCommentLikes] = useState<Record<string, { count: number; isLiked: boolean }>>({});
  
  // Menu and edit state
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [openCommentMenuId, setOpenCommentMenuId] = useState<string | null>(null);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [postAuthors, setPostAuthors] = useState<Record<string, string>>({});
  
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, (payload) => {
        console.log('Post change detected:', payload);
        loadPosts();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'post_likes' }, (payload) => {
        console.log('Like change detected:', payload);
        loadPosts();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'post_comments' }, (payload) => {
        console.log('Comment change detected:', payload);
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
        // Get user name from profiles
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
          // Count unique likes (one per user)
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

      // Get all post user_ids to determine who is the post author
      const { data: post } = await supabase
        .from('posts')
        .select('user_id')
        .eq('id', postId)
        .single();
      
      const postAuthorId = post?.user_id;

      // Get all unique user_ids from comments
      const userIds = [...new Set(commentsData.map(c => c.user_id))];
      
      // Fetch profiles for all users who commented
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', userIds);

      const profileMap = profiles?.reduce((acc, p) => {
        acc[p.id] = p.name || 'User';
        return acc;
      }, {} as Record<string, string>) || {};

      // Add user_name to each comment - anonymous if same as post author
      const commentsWithNames = commentsData.map(comment => ({
        ...comment,
        user_name: comment.user_id === postAuthorId ? 'Anonymous' : (profileMap[comment.user_id] || 'User')
      }));

      // Also load comment likes
      const { data: allCommentLikes } = await supabase
        .from('comment_likes')
        .select('comment_id, user_id')
        .in('comment_id', commentsData.map(c => c.id));

      // Get current user's liked comments
      const likedCommentIds = new Set(
        allCommentLikes?.filter(l => l.user_id === currentUserId).map(l => l.comment_id) || []
      );

      // Count likes per comment
      const likeCounts: Record<string, number> = {};
      allCommentLikes?.forEach(like => {
        likeCounts[like.comment_id] = (likeCounts[like.comment_id] || 0) + 1;
      });

      // Update commentLikes state
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
      
      // Reload posts
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

    // If already liked, don't allow another like (one like per user only)
    if (post.is_liked) {
      return;
    }

    // First check if like already exists in database - delete duplicates if any
    try {
      // First, delete ALL existing likes for this user/post combination to clean up duplicates
      await supabase
        .from('post_likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', currentUserId);
    } catch (e) {
      // Continue even if delete fails
    }

    // Optimistic update - update UI immediately
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
      // Only insert, never allow multiple likes
      await supabase
        .from('post_likes')
        .insert({ post_id: postId, user_id: currentUserId });
    } catch (error) {
      console.error('Error adding like:', error);
      // Revert on error
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

    // Optimistic update - add comment immediately
    setComments(prev => ({
      ...prev,
      [postId]: [...(prev[postId] || []), tempComment]
    }));
    setNewComment(prev => ({ ...prev, [postId]: '' }));
    
    // Update comment count
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
      // Remove temp comment on error
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

      // Get all unique user_ids from replies
      const userIds = [...new Set(repliesData.map(r => r.user_id))];
      
      // Fetch profiles for all users who replied
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', userIds);

      const profileMap = profiles?.reduce((acc, p) => {
        acc[p.id] = p.name || 'User';
        return acc;
      }, {} as Record<string, string>) || {};

      // Add user_name to each reply
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

    // Optimistic update - add reply immediately
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
      // Remove temp reply on error
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

    // Check if already liked
    const isCurrentlyLiked = commentLikes[commentId]?.isLiked || false;

    // Optimistic update
    setCommentLikes(prev => ({
      ...prev,
      [commentId]: {
        count: (prev[commentId]?.count || 0) + (isCurrentlyLiked ? -1 : 1),
        isLiked: !isCurrentlyLiked
      }
    }));

    try {
      if (isCurrentlyLiked) {
        // Unlike - delete the like
        await supabase
          .from('comment_likes')
          .delete()
          .eq('comment_id', commentId)
          .eq('user_id', currentUserId);
      } else {
        // Like - insert new like
        await supabase
          .from('comment_likes')
          .insert({ comment_id: commentId, user_id: currentUserId });
      }
    } catch (error) {
      console.error('Error toggling comment like:', error);
      // Revert on error
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

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="px-4 py-3 flex items-center gap-2">
          <HomeIcon className="w-5 h-5 text-white" />
          <h1 className="text-lg font-bold text-white">Home</h1>
        </div>
      </header>

      <div className="px-2 py-3 max-w-md mx-auto">
{/* Create Post */}
        <Card className="mb-3 p-2">
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <Textarea
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                placeholder="Share something anonymously..."
                className="min-h-[30px] h-8 resize-none border-none focus-visible:ring-0 bg-secondary/50 text-base py-1 text-white placeholder:text-gray-400"
              />
            </div>
            <button 
              onClick={handleCreatePost}
              disabled={!newPostContent.trim() || posting}
              className={cn(
                "flex items-center gap-1 transition-colors text-white hover:text-primary",
                posting && "opacity-50"
              )}
            >
              {posting ? <Loader2 className="w-7 h-7 animate-spin" /> : <Send className="w-7 h-7" />}
            </button>
          </div>
        </Card>

        {/* Posts Feed */}
        {loading ? (
          <div className="space-y-2">
            {/* Skeleton loaders for posts */}
            {[1, 2, 3].map((i) => (
              <Card key={i} className="p-2.5">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <div className="w-6 h-6 rounded-full bg-muted animate-pulse" />
                    <div className="h-3 w-20 bg-muted rounded animate-pulse" />
                  </div>
                  <div className="w-6 h-6 bg-muted rounded animate-pulse" />
                </div>
                <div className="space-y-1.5 mb-2">
                  <div className="h-3 w-full bg-muted rounded animate-pulse" />
                  <div className="h-3 w-3/4 bg-muted rounded animate-pulse" />
                </div>
                <div className="flex items-center gap-3 pt-1.5 border-t">
                  <div className="h-4 w-12 bg-muted rounded animate-pulse" />
                  <div className="h-4 w-12 bg-muted rounded animate-pulse" />
                </div>
              </Card>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-8 text-white text-sm">
            <p>No posts yet. Be the first to share anonymously!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {posts.map((post, index) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
              >
                <Card className="p-2.5">
                  {/* Post Header */}
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-base text-[#972837]">Anonymous</span>
                      <span className="text-[10px] text-muted-foreground">· {formatTime(post.created_at)}</span>
                    </div>
                    <div className="relative menu-container">
                      <button
                        onClick={() => setOpenMenuId(openMenuId === post.id ? null : post.id)}
                        className="p-1 hover:bg-white/10 rounded-full text-white transition-colors"
                      >
                        <MoreHorizontal className="w-5 h-5" />
                      </button>
                      {/* Dropdown Menu */}
                      {openMenuId === post.id && (
                        <div className="absolute right-0 top-8 bg-[#1A221F] border border-border rounded-lg shadow-lg z-10 py-1 min-w-[120px]">
                          <button
                            onClick={() => handleEdit(post.id, post.content)}
                            className="w-full px-4 py-2 text-left text-white hover:bg-white/10 flex items-center gap-2"
                          >
                            <Pencil className="w-4 h-4" />
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(post.id)}
                            className="w-full px-4 py-2 text-left text-red-500 hover:bg-white/10 flex items-center gap-2"
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
                    <div className="mb-2">
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="w-full bg-secondary/50 rounded-lg p-2 text-white text-base resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                        rows={3}
                      />
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => saveEdit(post.id)}
                          className="px-4 py-1 bg-[#1877f2] text-white rounded-lg text-sm"
                        >
                          Save
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="px-4 py-1 bg-gray-600 text-white rounded-lg text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-base whitespace-pre-wrap mb-2 leading-snug text-white">{post.content}</p>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-3 pt-1.5 border-t text-base text-white">
                    <button
                      onClick={() => handleLike(post.id)}
                      className={cn(
                        "flex items-center gap-1 transition-colors",
                        post.is_liked ? "text-red-500" : "text-white hover:text-red-500"
                      )}
                    >
                      <Heart className={cn("w-7 h-7", post.is_liked && "fill-red-500 text-red-500")} />
                      <span>{post.likes_count || 0}</span>
                    </button>

                    <button
                      onClick={() => toggleComments(post.id)}
                      className="flex items-center gap-1 text-white hover:text-primary transition-colors"
                    >
                      <MessageCircle className="w-7 h-7" />
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
                        className="mt-2 pt-2 border-t overflow-hidden"
                      >
                        {/* Comment Input */}
                        <div className="flex gap-1.5 mb-2">
                          <input
                            type="text"
                            value={newComment[post.id] || ''}
                            onChange={(e) => setNewComment(prev => ({ ...prev, [post.id]: e.target.value }))}
                            placeholder="Write a comment..."
                            className="flex-1 bg-secondary/50 rounded-full px-3 py-1.5 text-base focus:outline-none focus:ring-1 focus:ring-primary text-white placeholder:text-gray-400"
                            onKeyDown={(e) => e.key === 'Enter' && handleComment(post.id)}
                          />
                          <Button
                            size="sm"
                            onClick={() => handleComment(post.id)}
                            disabled={!newComment[post.id]?.trim() || postingComment[post.id]}
                            className="rounded-full h-7 w-7 p-0"
                          >
                            {postingComment[post.id] ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                          </Button>
                        </div>

                        {/* Comments List */}
                        <div className="space-y-1.5">
                          {(comments[post.id] || []).map(comment => (
                            <div key={comment.id} className="bg-secondary/30 rounded-md p-1.5">
                              {/* Comment Header with Menu */}
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1">
                                  <span className="text-base font-medium text-[#972837]">Anonymous</span>
                                  <span className="text-[8px] text-muted-foreground">{formatTime(comment.created_at)}</span>
                                </div>
                                <div className="relative comment-menu-container">
                                  <button
                                    onClick={() => setOpenCommentMenuId(openCommentMenuId === comment.id ? null : comment.id)}
                                    className="p-1 hover:bg-white/10 rounded-full text-gray-400 transition-colors"
                                  >
                                    <MoreHorizontal className="w-4 h-4" />
                                  </button>
                                  {/* Comment Dropdown Menu */}
                                  {openCommentMenuId === comment.id && (
                                    <div className="absolute right-0 top-6 bg-[#1A221F] border border-border rounded-lg shadow-lg z-10 py-1 min-w-[100px] translate-y-[-100%]">
                                      {(currentUserId === post.user_id || currentUserId === comment.user_id) && (
                                        <>
                                          <button
                                            onClick={() => handleEditComment(comment.id, comment.content)}
                                            className="w-full px-3 py-1.5 text-left text-white hover:bg-white/10 flex items-center gap-2 text-sm"
                                          >
                                            <Pencil className="w-3 h-3" />
                                            Edit
                                          </button>
                                          <button
                                            onClick={() => handleDeleteComment(post.id, comment.id)}
                                            className="w-full px-3 py-1.5 text-left text-red-500 hover:bg-white/10 flex items-center gap-2 text-sm"
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
                              
                              {/* Comment Content - Edit Mode */}
                              {editingCommentId === comment.id ? (
                                <div className="mt-1">
                                  <textarea
                                    value={editContent}
                                    onChange={(e) => setEditContent(e.target.value)}
                                    className="w-full bg-secondary/50 rounded-lg p-2 text-white text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                                    rows={2}
                                  />
                                  <div className="flex gap-2 mt-1">
                                    <button
                                      onClick={() => saveCommentEdit(post.id, comment.id)}
                                      className="px-3 py-1 bg-[#1877f2] text-white rounded text-xs"
                                    >
                                      Save
                                    </button>
                                    <button
                                      onClick={cancelCommentEdit}
                                      className="px-3 py-1 bg-gray-600 text-white rounded text-xs"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <p className="text-base pl-0 leading-tight text-white">{comment.content}</p>
                              )}
                              
                              {/* Comment Actions */}
                              <div className="flex items-center gap-3 mt-1">
                                <button 
                                  onClick={() => handleCommentLike(comment.id)}
                                  className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500"
                                >
                                  <Heart className={cn("w-4 h-4", (commentLikes[comment.id]?.isLiked) && "fill-red-500 text-red-500")} />
                                  <span>{commentLikes[comment.id]?.count || 0}</span>
                                </button>
                                <button 
                                  onClick={() => toggleReplies(comment.id)}
                                  className="text-xs text-gray-400 hover:text-white"
                                >
                                  Reply
                                </button>
                              </div>
                              
                              {/* Reply Input */}
                              {showReplies[comment.id] && (
                                <div className="mt-2 pl-2 border-l border-gray-600">
                                  <div className="flex gap-1 mb-2">
                                    <input
                                      type="text"
                                      value={newReply[comment.id] || ''}
                                      onChange={(e) => setNewReply(prev => ({ ...prev, [comment.id]: e.target.value }))}
                                      placeholder="Write a reply..."
                                      className="flex-1 bg-secondary/50 rounded-full px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary text-white placeholder:text-gray-400"
                                      onKeyDown={(e) => e.key === 'Enter' && handleReply(post.id, comment.id)}
                                    />
                                    <button
                                      onClick={() => handleReply(post.id, comment.id)}
                                      disabled={!newReply[comment.id]?.trim() || postingReply[comment.id]}
                                      className="p-1 text-white hover:text-primary"
                                    >
                                      <Send className="w-4 h-4" />
                                    </button>
                                  </div>
                                  
                                  {/* Replies List */}
                                  <div className="space-y-1">
                                    {(replies[comment.id] || []).map(reply => (
                                      <div key={reply.id} className="bg-secondary/20 rounded p-1">
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-1">
                                            <span className="text-sm font-medium text-[#972837]">Anonymous</span>
                                            <span className="text-[8px] text-muted-foreground">{formatTime(reply.created_at)}</span>
                                          </div>
                                        </div>
                                        <p className="text-sm text-white">{reply.content}</p>
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

