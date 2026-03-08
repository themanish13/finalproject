import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion"; 
import { 
  ArrowLeft, Check, CheckCheck, Trash2, Reply, X,
  Image, Copy
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useNavigate, useLocation } from "react-router-dom";

// Chat components
import { 
  MessageInput, 
  TypingIndicator, 
  MediaPreview,
  FullscreenImage,
} from "@/components/chat";

// Store
import { useChatStore, ChatMessage } from "@/store/chatStore";

// Hooks
import { useChatRealtime } from "@/hooks/useChatRealtime";

interface MatchInfo {
  id: string;
  name: string;
  avatar_url?: string;
}

// Local interface for message display (extends ChatMessage)
interface Message extends ChatMessage {
  reply_to_content?: string;
}

const Chat = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const mediaInputRef = useRef<HTMLInputElement>(null);
  
  const searchParams = new URLSearchParams(location.search);
  const matchId = searchParams.get("matchId");

  // Zustand store - single source of truth
  const {
    messages: storeMessages,
    isLoading,
    isAtBottom,
    setLoading,
    addMessage,
    setMessages,
    updateMessage,
    removeMessage,
    setCurrentChat,
    clearChat,
    addOptimisticMessage,
    confirmMessage,
    failMessage,
    setIsAtBottom,
    currentUserId: storeCurrentUserId,
  } = useChatStore();

  // Local state (non-message related)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [matchInfo, setMatchInfo] = useState<MatchInfo | null>(null);
  
  // Load deleted message IDs from localStorage on mount
  const getInitialDeletedIds = (): Set<string> => {
    try {
      const stored = localStorage.getItem(`deleted_messages_${matchId}`);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  };
  
  // Load "deleted for me" IDs
  const getInitialDeletedForMeIds = (): Set<string> => {
    try {
      const stored = localStorage.getItem(`deleted_for_me_${matchId}`);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  };
  
  const [deletedForMeIds, setDeletedForMeIds] = useState<Set<string>>(() => getInitialDeletedForMeIds());
  const deletedForMeIdsRef = useRef<Set<string>>(getInitialDeletedForMeIds());
  const [deletedMessageIds, setDeletedMessageIds] = useState<Set<string>>(() => getInitialDeletedIds());
  const deletedMessageIdsRef = useRef<Set<string>>(getInitialDeletedIds());
  
  const [sending, setSending] = useState(false);
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  // Message interactions
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set());
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);
  
  // Long press popup state
  const [longPressPopup, setLongPressPopup] = useState<{
    messageId: string;
    isOwnMessage: boolean;
    messageContent: string;
  } | null>(null);
  
  const touchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Media preview
  const [pendingFiles, setPendingFiles] = useState<{file: File; preview: string; type: 'image' | 'video' | 'file'}[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Fullscreen image viewer
  const [fullscreenImage, setFullscreenImage] = useState<{src: string; isOpen: boolean}>({ src: '', isOpen: false });

  // Keyboard detection
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  
  // State for message input
  const [newMessage, setNewMessage] = useState("");
  
  // Track initial load
  const isInitialLoad = useRef(true);
  const hasScrolledToBottom = useRef(false);

  // Use realtime hook when we have chat ID and user ID
  useChatRealtime({
    chatId: matchId || '',
    currentUserId: currentUserId || '',
    onMessageReceived: (message) => {
      // Only show typing indicator if message is from the OTHER user (not yourself)
      if (message.sender_id !== currentUserId) {
        setIsOtherUserTyping(true);
        setTimeout(() => setIsOtherUserTyping(false), 2000);
      }
    },
  });

  // Close long press popup when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (longPressPopup) {
        setLongPressPopup(null);
      }
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [longPressPopup]);
  
  // Keyboard handling
  useEffect(() => {
    let keyboardTimeout: ReturnType<typeof setTimeout>;
    
    const handleKeyboardOpen = () => {
      const viewportHeight = window.visualViewport?.height || window.innerHeight;
      const windowHeight = window.innerHeight;
      const kHeight = windowHeight - viewportHeight;
      setKeyboardHeight(kHeight);
      keyboardTimeout = setTimeout(() => {
        scrollToBottom();
      }, 100);
    };
    
    const handleKeyboardClose = () => {
      setKeyboardHeight(0);
    };

    if (window.visualViewport) {
      const viewport = window.visualViewport;
      
      const handleViewportResize = () => {
        const viewportHeight = viewport.height;
        const windowHeight = window.innerHeight;
        const kHeight = windowHeight - viewportHeight;
        
        if (kHeight > 150) {
          setKeyboardHeight(kHeight);
        } else {
          setKeyboardHeight(0);
        }
      };
      
      viewport.addEventListener('resize', handleViewportResize);
      window.addEventListener('resize', handleViewportResize);

      return () => {
        viewport.removeEventListener('resize', handleViewportResize);
        window.removeEventListener('resize', handleViewportResize);
        if (keyboardTimeout) clearTimeout(keyboardTimeout);
      };
    }

    return () => {
      if (keyboardTimeout) clearTimeout(keyboardTimeout);
    };
  }, []);

  // Reset scroll state when matchId changes
  useEffect(() => {
    isInitialLoad.current = true;
    hasScrolledToBottom.current = false;
  }, [matchId]);

  // Scroll function
  const performScrollToBottom = useCallback(() => {
    const scrollToView = () => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
    };
    
    scrollToView();
    requestAnimationFrame(() => {
      scrollToView();
      setTimeout(scrollToView, 150);
    });
  }, []);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Handle scroll - track if user is at bottom
  const handleScroll = useCallback(() => {
    const container = chatContainerRef.current;
    if (container) {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      const atBottom = distanceFromBottom < 150;
      
      if (isAtBottom !== atBottom) {
        setIsAtBottom(atBottom);
      }
    }
  }, [isAtBottom, setIsAtBottom]);

  // Auto-scroll when new messages arrive (only if user is at bottom)
  useEffect(() => {
    if (isLoading || !storeMessages.length) return;

    // Always scroll to bottom on initial load
    if (isInitialLoad.current && !hasScrolledToBottom.current) {
      performScrollToBottom();
      hasScrolledToBottom.current = true;
      isInitialLoad.current = false;
      return;
    }

    // For new messages, only scroll if user is at bottom
    if (isAtBottom) {
      // Small delay to allow DOM to update
      setTimeout(() => {
        scrollToBottom();
      }, 50);
    }
  }, [storeMessages, isLoading, isAtBottom, performScrollToBottom, scrollToBottom]);

  // Load chat data
  useEffect(() => { 
    loadChatData(); 
    return () => {
      clearChat();
    };
  }, [matchId]);

  // Drag and drop handlers
  useEffect(() => {
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      setIsDragging(true);
    };
    
    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      if (!chatContainerRef.current?.contains(e.relatedTarget as Node)) {
        setIsDragging(false);
      }
    };
    
    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleFiles(e.dataTransfer?.files);
    };

    document.addEventListener('dragover', handleDragOver);
    document.addEventListener('dragleave', handleDragLeave);
    document.addEventListener('drop', handleDrop);

    return () => {
      document.removeEventListener('dragover', handleDragOver);
      document.removeEventListener('dragleave', handleDragLeave);
      document.removeEventListener('drop', handleDrop);
    };
  }, []);

  const handleFiles = (files?: FileList) => {
    if (!files) return;
    
    const newFiles = Array.from(files).map(file => ({
      file,
      preview: URL.createObjectURL(file),
      type: (file.type.startsWith('video/') ? 'video' : 'image') as 'image' | 'video' | 'file'
    }));
    
    setPendingFiles(prev => [...prev, ...newFiles]);
  };

  const removePendingFile = (index: number) => {
    setPendingFiles(prev => {
      const newFiles = [...prev];
      URL.revokeObjectURL(newFiles[index].preview);
      newFiles.splice(index, 1);
      return newFiles;
    });
  };

  const sendPendingFiles = async () => {
    for (const fileData of pendingFiles) {
      await uploadAndSendMedia(fileData.file, fileData.type as 'image' | 'video');
    }
    setPendingFiles([]);
  };

  const loadChatData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      setCurrentUserId(user.id);
      setCurrentChat(matchId || '', user.id);

      if (matchId) {
        // Load match profile
        const { data: profile } = await supabase.from("profiles").select("id, name, avatar_url").eq("id", matchId).single();
        if (profile) setMatchInfo({ 
          id: profile.id, 
          name: profile.name, 
          avatar_url: profile.avatar_url,
        });

        // Load messages
        const { data: messagesData } = await supabase
          .from("messages")
          .select("id, sender_id, content, media_url, media_type, read_at, created_at, is_unsent, reply_to_id, status, delivered_at")
          .or(`and(sender_id.eq.${user.id},receiver_id.eq.${matchId}),and(sender_id.eq.${matchId},receiver_id.eq.${user.id})`)
          .or("is_unsent.is.null,is_unsent.eq.false")
          .order("created_at", { ascending: true });
        
        if (messagesData) {
          // Filter out deleted messages
          const filteredMessages = messagesData.filter(msg => 
            !deletedMessageIdsRef.current.has(msg.id) && 
            !deletedForMeIdsRef.current.has(msg.id)
          );
          
          // Load reply content
          const messagesWithReplies = await Promise.all(
            filteredMessages.map(async (msg: any) => {
              if (msg.reply_to_id) {
                if (deletedMessageIdsRef.current.has(msg.reply_to_id) || deletedForMeIdsRef.current.has(msg.reply_to_id)) {
                  return { ...msg, reply_to_id: null, reply_to_content: "Message" };
                }
                const { data: replyMsg } = await supabase
                  .from("messages")
                  .select("content")
                  .eq("id", msg.reply_to_id)
                  .single();
                return { ...msg, reply_to_content: replyMsg?.content || "Message" };
              }
              return msg;
            })
          );
          
          // Add messages to store
          setMessages(messagesWithReplies as ChatMessage[]);
        }

        // Mark messages as read
        await supabase.from("messages").update({ read_at: new Date().toISOString() })
          .eq("sender_id", matchId).eq("receiver_id", user.id).is("read_at", null);
      } else {
        // No match ID, try to find a match
        const { data: matchesData } = await supabase.from("matches").select("user1_id, user2_id").or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`).limit(1).single();
        if (matchesData) {
          const matchedUserId = matchesData.user1_id === user.id ? matchesData.user2_id : matchesData.user1_id;
          navigate(`/chat?matchId=${matchedUserId}`, { replace: true });
        }
      }
    } catch (error) { console.error("Error loading chat:", error); }
    finally { setLoading(false); }
  };

  const sendMessage = async (content?: string, mediaUrl?: string, mediaType?: string) => {
    const messageContent = content !== undefined ? content : newMessage;
    const hasContent = messageContent?.trim();
    const hasMedia = mediaUrl || mediaType;
    if ((!hasContent && !hasMedia) || !matchId || !currentUserId || sending) return;

    try {
      setSending(true);
      
      // Add optimistic message
      const tempId = addOptimisticMessage({
        sender_id: currentUserId,
        receiver_id: matchId,
        content: (messageContent?.trim() || `[${mediaType || 'media'}]`) as string,
        media_url: mediaUrl || undefined,
        media_type: mediaType || undefined,
        reply_to_id: replyToMessage?.id || undefined,
        status: 'sent',
      });
      
      const newMessageData = {
        sender_id: currentUserId,
        receiver_id: matchId,
        content: (messageContent?.trim() || `[${mediaType || 'media'}]`) as string,
        media_url: mediaUrl || null,
        media_type: mediaType || null,
        reply_to_id: replyToMessage?.id || null,
      };
      
      const { data, error } = await supabase.from("messages").insert(newMessageData).select().single();
      
      if (error) {
        console.error("Error sending message:", error);
        failMessage(tempId);
        return;
      }
      
      // Confirm message with real data
      confirmMessage(tempId, data.id, data.created_at, data.status || 'sent');
      
      setNewMessage("");
      setReplyToMessage(null);
    } catch (error) { 
      console.error("Error sending message:", error); 
      // Find and fail the optimistic message
      failMessage(`temp_${Date.now()}_*`);
    }
    finally { setSending(false); }
  };

  const handleMediaSelect = async (files: File[]) => {
    for (const file of files) {
      const type = file.type.startsWith('video/') ? 'video' : 'image';
      await uploadAndSendMedia(file, type as 'image' | 'video');
    }
  };

  const uploadAndSendMedia = async (file: File, type: 'image' | 'video') => {
    try {
      setUploading(true);
      setUploadProgress(0);
      
      const fileName = `${Date.now()}_${file.name}`;
      const { error } = await supabase.storage.from('chat-media').upload(fileName, file);
      
      if (error) { 
        sendMessage(`[${type}]`); 
        return; 
      }
      
      setUploadProgress(100);
      const { data: { publicUrl } } = supabase.storage.from('chat-media').getPublicUrl(fileName);
      sendMessage('', publicUrl, type);
    } catch (error) { 
      console.error("Upload error:", error); 
      sendMessage(`[${type}]`); 
    }
    finally { 
      setUploading(false); 
      setUploadProgress(0); 
    }
  };

  const handleUnsendMessage = async (messageId: string) => {
    try {
      // Soft delete
      const { error: dbError } = await supabase
        .from("messages")
        .update({ is_unsent: true })
        .eq("id", messageId);
      
      if (dbError) {
        console.error("Database update error:", dbError);
      }
      
      // Broadcast unsend
      const broadcastChannel = supabase.channel(`chat:${matchId}`);
      await broadcastChannel.send({
        type: 'broadcast',
        event: 'unsend',
        payload: { messageId }
      });
      
      // Track locally
      const newDeletedIds = new Set(deletedMessageIdsRef.current).add(messageId);
      setDeletedMessageIds(newDeletedIds);
      deletedMessageIdsRef.current = newDeletedIds;
      
      try {
        localStorage.setItem(`deleted_messages_${matchId}`, JSON.stringify([...newDeletedIds]));
      } catch (storageError) {
        console.error("localStorage save error:", storageError);
      }
      
      // Remove from store
      removeMessage(messageId);
      setSelectedMessageId(null);
    } catch (error) {
      console.error("Error deleting message:", error);
    }
  };

  const handleDeleteForMe = async (messageId: string) => {
    try {
      const message = storeMessages.find(m => m.id === messageId);
      if (!message) return;
      
      const { error: dbError } = await supabase
        .from("messages")
        .update({ 
          deleted_for_sender: message.sender_id === currentUserId,
          deleted_for_receiver: message.sender_id !== currentUserId
        })
        .eq("id", messageId);
      
      if (dbError) {
        console.error("Database update error:", dbError);
      }
      
      const newDeletedForMeIds = new Set(deletedForMeIdsRef.current).add(messageId);
      setDeletedForMeIds(newDeletedForMeIds);
      deletedForMeIdsRef.current = newDeletedForMeIds;
      
      try {
        localStorage.setItem(`deleted_for_me_${matchId}`, JSON.stringify([...newDeletedForMeIds]));
      } catch (storageError) {
        console.error("localStorage save error:", storageError);
      }
      
      removeMessage(messageId);
      setSelectedMessageId(null);
    } catch (error) {
      console.error("Error deleting for me:", error);
    }
  };

  const handleReply = (message: Message) => {
    setReplyToMessage(message);
    setSelectedMessageId(null);
    inputRef.current?.focus();
  };

  const handleMessageClick = (messageId: string) => {
    if (isMultiSelectMode) {
      const newSelected = new Set(selectedMessages);
      if (newSelected.has(messageId)) {
        newSelected.delete(messageId);
      } else {
        newSelected.add(messageId);
      }
      setSelectedMessages(newSelected);
      if (newSelected.size === 0) {
        setIsMultiSelectMode(false);
      }
    } else if (selectedMessageId === messageId) {
      setSelectedMessageId(null);
    } else {
      setSelectedMessageId(messageId);
    }
  };

  const handleMessageLongPress = (messageId: string, isOwnMessage: boolean, messageContent: string) => {
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
    
    setLongPressPopup({
      messageId,
      isOwnMessage,
      messageContent
    });
  };

  const handleTouchStart = (e: React.TouchEvent, messageId: string, isOwnMessage: boolean, messageContent: string) => {
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
    }
    touchTimerRef.current = setTimeout(() => {
      handleMessageLongPress(messageId, isOwnMessage, messageContent);
    }, 500);
  };

  const handleTouchEnd = () => {
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
      touchTimerRef.current = null;
    }
  };

  const handleTouchMove = () => {
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
      touchTimerRef.current = null;
    }
  };

  const handlePopupReply = (e: React.MouseEvent | React.TouchEvent | React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (longPressPopup) {
      const message = storeMessages.find(m => m.id === longPressPopup.messageId);
      if (message) {
        handleReply(message as Message);
      }
    }
    setLongPressPopup(null);
  };

  const handlePopupCopy = (e: React.MouseEvent | React.TouchEvent | React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (longPressPopup?.messageContent) {
      navigator.clipboard.writeText(longPressPopup.messageContent);
    }
    setLongPressPopup(null);
  };

  const handlePopupDelete = (e: React.MouseEvent | React.TouchEvent | React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (longPressPopup) {
      handleUnsendMessage(longPressPopup.messageId);
    }
    setLongPressPopup(null);
  };

  const handleDeleteSelectedMessages = async () => {
    for (const messageId of selectedMessages) {
      await handleUnsendMessage(messageId);
    }
    setIsMultiSelectMode(false);
    setSelectedMessages(new Set());
  };

  const cancelMultiSelect = () => {
    setIsMultiSelectMode(false);
    setSelectedMessages(new Set());
    setLongPressPopup(null);
  };

  const formatTime = (dateString: string) => new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString();
  };

  const cancelReply = () => setReplyToMessage(null);

  // Filter messages for display (remove deleted ones)
  const displayMessages = storeMessages.filter(msg => 
    !deletedMessageIds.has(msg.id) && 
    !deletedForMeIds.has(msg.id)
  );

  const groupedMessages = displayMessages.reduce((groups: { date: string; messages: Message[] }[], message) => {
    const date = formatDate(message.created_at);
    const existingGroup = groups.find(g => g.date === date);
    if (existingGroup) {
      existingGroup.messages.push(message as Message);
    } else {
      groups.push({ date, messages: [message as Message] });
    }
    return groups;
  }, []);

  // Get status icon component
  const StatusIcon = ({ status, isOwn }: { status?: string; isOwn: boolean }) => {
    if (!isOwn) return null;
    
    switch (status) {
      case 'seen':
        return <CheckCheck className="w-3 h-3 text-blue-400" />;
      case 'delivered':
        return <CheckCheck className="w-3 h-3 text-muted-foreground/70" />;
      case 'sent':
      default:
        return <Check className="w-3 h-3 text-muted-foreground/70" />;
    }
  };

  if (isLoading && !storeMessages.length) {
    return (
      <div className="h-[100dvh] bg-background flex items-center justify-center">
        <div className="relative w-20 h-20">
          <span className="z-loading z-1">Z</span>
          <span className="z-loading z-2">Z</span>
          <span className="z-loading z-3">Z</span>
          <span className="z-loading z-4">Z</span>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="h-[100dvh] bg-background flex flex-col overflow-hidden" 
      onClick={() => setLongPressPopup(null)}
      style={{ height: '100dvh' }}
    >
      {/* Drag overlay */}
      <AnimatePresence>
        {isDragging && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-primary/20 backdrop-blur-sm flex items-center justify-center"
          >
            <div className="bg-card border-2 border-dashed border-primary rounded-2xl p-8 text-center">
              <Image className="w-12 h-12 mx-auto mb-4 text-primary" />
              <p className="text-lg font-semibold">Drop files to send</p>
              <p className="text-sm text-muted-foreground">Images or videos</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="flex-shrink-0 px-4 py-3 flex items-center justify-between bg-card border-b border-border z-10 sticky top-0">
        {isMultiSelectMode ? (
          <div className="flex items-center gap-3 w-full">
            <button 
              onClick={cancelMultiSelect} 
              className="p-2 rounded-full hover:bg-secondary transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div>
              <h3 className="font-semibold text-foreground text-base">
                {selectedMessages.size} selected
              </h3>
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <button 
                onClick={handleDeleteSelectedMessages}
                className="p-2 rounded-full bg-destructive/10 hover:bg-destructive/20 transition-colors"
                title="Delete selected"
              >
                <Trash2 className="w-5 h-5 text-destructive" />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate(-1)} 
              className="p-2 rounded-full hover:bg-secondary transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="relative">
              <Avatar className="w-10 h-10 ring-2 ring-primary">
                <AvatarImage src={matchInfo?.avatar_url} />
                <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                  {matchInfo?.name?.charAt(0)?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-base">{matchInfo?.name || 'Chat'}</h3>
            </div>
          </div>
        )}
      </header>

      {/* Message Container */}
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto overflow-visible px-4 space-y-4 pb-2 hide-scrollbar"
        onScroll={handleScroll}
        style={{ 
          paddingBottom: keyboardHeight > 0 ? `${keyboardHeight + 16}px` : undefined,
          minHeight: 0 
        }}
      >
        {/* Fade gradient when scrolling up */}
        <div className="sticky top-0 left-0 right-0 h-4 bg-gradient-to-b from-background to-transparent z-10 pointer-events-none" />
        
        {/* Date headers and messages */}
        {displayMessages.length === 0 ? (
          <div className="flex items-center justify-center h-full min-h-[50vh]">
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl font-bold text-primary-foreground">
                  {matchInfo?.name?.charAt(0)?.toUpperCase() || 'M'}
                </span>
              </div>
              <p className="text-muted-foreground text-sm">No messages yet</p>
              <p className="text-muted-foreground/60 text-xs mt-1">Say hi to start the conversation!</p>
            </div>
          </div>
        ) : (
          groupedMessages.map((group) => (
            <div key={group.date}>
              {/* Date separator */}
              <div className="flex items-center justify-center my-4">
                <span className="px-3 py-1 rounded-full bg-secondary text-xs text-muted-foreground">
                  {group.date}
                </span>
              </div>
              
              {/* Messages for this date */}
              {group.messages.map((message, index) => {
                const isOwnMessage = message.sender_id === currentUserId;
                const isMediaPlaceholder = message.media_url && 
                  (message.content === `[${message.media_type}]` || message.content === '[media]');
                const hasTextContent = message.content && !isMediaPlaceholder && !message.is_unsent;
                const isSelected = selectedMessageId === message.id;
                const isMultiSelected = selectedMessages.has(message.id);
                
                const prevMessage = index > 0 ? group.messages[index - 1] : null;
                const isSequence = prevMessage && 
                  prevMessage.sender_id === message.sender_id &&
                  new Date(message.created_at).getTime() - new Date(prevMessage.created_at).getTime() < 60000;
                
                return (
                  <motion.div 
                    key={message.id} 
                    initial={{ opacity: 0, y: 10 }} 
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.02 }}
                    className={`group flex ${isOwnMessage ? 'justify-end' : 'justify-start'} ${isSequence ? 'mt-0.5' : 'mt-3'} cursor-pointer`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMessageClick(message.id);
                    }}
                    onDoubleClick={() => handleMessageClick(message.id)}
                    onTouchStart={(e) => handleTouchStart(e, message.id, isOwnMessage, message.content || '')}
                    onTouchEnd={handleTouchEnd}
                    onTouchMove={handleTouchMove}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      handleMessageLongPress(message.id, isOwnMessage, message.content || '');
                    }}
                  >
                    <div className={cn(
                      "flex flex-col max-w-[75%] overflow-visible",
                      isOwnMessage ? 'items-end' : 'items-start',
                      isMultiSelected && "relative"
                    )}>
                      {/* Multi-select checkbox */}
                      {(isMultiSelectMode || isMultiSelected) && (
                        <button
                          onClick={() => handleMessageClick(message.id)}
                          className={cn(
                            "absolute -left-8 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                            isMultiSelected 
                              ? "bg-primary border-primary" 
                              : "border-muted-foreground/50 hover:border-primary"
                          )}
                        >
                          {isMultiSelected && (
                            <Check className="w-3 h-3 text-primary-foreground" />
                          )}
                        </button>
                      )}
                      
                      {/* Reply indicator */}
                      {message.reply_to_id && (
                        <div 
                          className={cn(
                            "w-full mb-1 px-3 py-1.5 rounded-lg text-xs",
                            isOwnMessage ? 'bg-primary/20 text-primary-foreground' : 'bg-secondary text-muted-foreground'
                          )}
                          style={{ borderLeft: `3px solid ${isOwnMessage ? 'var(--primary)' : '#4B5563'}` }}
                        >
                          <span className="font-medium">Replying to: </span>
                          <span className="line-clamp-1">{message.reply_to_content || "message"}</span>
                        </div>
                      )}
                      
                        {/* Media */}
                      {message.media_url && !message.is_unsent && (
                        <div 
                          className={cn(
                            "mb-1 rounded-2xl overflow-hidden cursor-pointer relative",
                            (isSelected || isMultiSelected) && "ring-2 ring-primary"
                          )}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMessageClick(message.id);
                          }}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            handleMessageLongPress(message.id, isOwnMessage, message.content || '');
                          }}
                        >
                          {message.media_type === 'video' ? (
                            <video 
                              src={message.media_url} 
                              className="max-w-full rounded-2xl max-h-[400px] object-contain" 
                              controls 
                            />
                          )  : (
                            <img 
                              src={message.media_url} 
                              alt="Shared" 
                              className="max-w-full rounded-2xl max-h-[400px] object-contain cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={() => setFullscreenImage({ src: message.media_url!, isOpen: true })}
                            />
                          )}
                        </div>
                      )}
                      
                      {/* Text bubble */}
                      {hasTextContent && (
                        <div 
                          className={cn(
                            "px-3 py-2 rounded-2xl cursor-pointer relative select-none",
                            "hover:opacity-90 transition-opacity",
                            isOwnMessage 
                              ? 'bg-primary text-primary-foreground rounded-br-md' 
                              : 'bg-secondary text-foreground rounded-bl-md',
                            (isSelected || isMultiSelected) && "ring-2 ring-primary",
                            message.isPending && "opacity-50"
                          )}
                          style={{ borderRadius: isOwnMessage ? '16px 16px 4px 16px' : '16px 16px 16px 4px' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMessageClick(message.id);
                          }}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            handleMessageLongPress(message.id, isOwnMessage, message.content || '');
                          }}
                        >
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                        </div>
                      )}
                      
                      {/* Unsent message */}
                      {message.is_unsent && (
                        <div className="px-4 py-2.5 rounded-2xl bg-secondary/50">
                          <p className="text-sm leading-relaxed italic text-muted-foreground">This message was deleted</p>
                        </div>
                      )}
                      
                      {/* Time and status indicators */}
                      {(isSelected || message.isPending || isOwnMessage) && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className={cn(
                            "flex items-center gap-1 mt-0.5",
                            isOwnMessage ? 'justify-end' : 'justify-start'
                          )}
                        >
                          <span className="text-[10px] text-muted-foreground/70">
                            {message.isPending ? 'Sending...' : formatTime(message.created_at)}
                          </span>
                          {isOwnMessage && (
                            <StatusIcon status={message.status} isOwn={isOwnMessage} />
                          )}
                        </motion.div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ))
        )}
        
        {/* Typing indicator */}
        <AnimatePresence>
          {isOtherUserTyping && (
            <TypingIndicator />
          )}
        </AnimatePresence>
        
        <div ref={messagesEndRef} />
      </div>

      {/* Long press popup */}
      <AnimatePresence>
        {longPressPopup && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
              onClick={() => setLongPressPopup(null)}
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed inset-0 z-50 flex items-center justify-center px-4"
            >
              <div 
                className="w-[75%] max-w-[320px] bg-white rounded-3xl shadow-2xl border border-white/20 overflow-hidden" 
                onClick={(e) => e.stopPropagation()}
              >
                <div className="bg-white py-1">
                  {/* Reply */}
                  <button
                    type="button"
                    onPointerDown={handlePopupReply}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 active:bg-gray-100 transition-colors touch-action-manipulation"
                  >
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                      <Reply className="w-4 h-4 text-blue-600" />
                    </div>
                    <span className="text-gray-700 font-medium text-sm">Reply</span>
                  </button>
                  
                  {/* Copy */}
                  <button
                    type="button"
                    onPointerDown={handlePopupCopy}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 active:bg-gray-100 transition-colors touch-action-manipulation"
                  >
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                      <Copy className="w-4 h-4 text-gray-600" />
                    </div>
                    <span className="text-gray-700 font-medium text-sm">Copy</span>
                  </button>
                  
                  {/* Delete for Me */}
                  <button
                    type="button"
                    onPointerDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (longPressPopup) {
                        handleDeleteForMe(longPressPopup.messageId);
                      }
                      setLongPressPopup(null);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-red-50 active:bg-red-100 transition-colors touch-action-manipulation"
                  >
                    <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </div>
                    <span className="text-red-600 font-medium text-sm">Delete for Me</span>
                  </button>
                  
                  {/* Unsend - only for own messages */}
                  {longPressPopup.isOwnMessage && (
                    <button
                      type="button"
                      onPointerDown={handlePopupDelete}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-red-50 active:bg-red-100 transition-colors touch-action-manipulation"
                    >
                      <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </div>
                      <span className="text-red-600 font-medium text-sm">Unsend</span>
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Reply indicator */}
      <AnimatePresence>
        {replyToMessage && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex-shrink-0 px-4 py-2 bg-card border-t border-border overflow-hidden sticky bottom-12"
          >
            <div className="mx-auto max-w-md px-4 py-2 rounded-xl flex items-center justify-between bg-secondary border border-border border-l-4 border-l-primary">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-primary font-medium">Replying to</p>
                <p className="text-sm text-muted-foreground truncate">{replyToMessage.content}</p>
              </div>
              <button onClick={cancelReply} className="p-1 ml-2 rounded-full hover:bg-background">
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Media Preview */}
      <AnimatePresence>
        {pendingFiles.length > 0 && (
          <MediaPreview
            files={pendingFiles}
            onRemove={removePendingFile}
            onSend={sendPendingFiles}
            uploading={uploading}
            uploadProgress={uploadProgress}
          />
        )}
      </AnimatePresence>

      {/* Input Bar */}
      <div className="flex-shrink-0 bg-background border-t border-border/30 sticky bottom-0" style={{ paddingBottom: keyboardHeight > 0 ? `${keyboardHeight}px` : undefined }}>
        <MessageInput
          value={newMessage}
          onChange={setNewMessage}
          onSend={() => sendMessage()}
          onMediaSelect={handleMediaSelect}
          placeholder="Message..."
          disabled={sending}
          className="select-none"
        />
      </div>

      {/* Hidden Media Input */}
      <input 
        ref={mediaInputRef} 
        type="file" 
        accept="image/*,video/*" 
        multiple
        className="hidden" 
        onChange={(e) => {
          const files = e.target.files;
          if (files) {
            handleMediaSelect(Array.from(files));
          }
        }} 
      />

      {/* Fullscreen Image Viewer */}
      <FullscreenImage
        src={fullscreenImage.src}
        isOpen={fullscreenImage.isOpen}
        onClose={() => setFullscreenImage({ src: '', isOpen: false })}
      />
    </div>
  );
};

export default Chat;

