import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion"; 
import { 
  ArrowLeft, Check, CheckCheck, Trash2, Reply, X,
  Mic, Image, Copy
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useNavigate, useLocation } from "react-router-dom";

// Chat components
import { 
  MessageInput, 
  TypingIndicator, 
  ChatLoadingSkeleton,
  MessageReactions,
  ReactionBadge,
  MediaPreview,
  MessageActionSheet,
  FullscreenImage,
} from "@/components/chat";
import { MediaItem, uriToBase64 } from "@/hooks/useMediaPicker";

interface Message {
  id: string;
  sender_id: string;
  content: string;
  media_url?: string;
  media_type?: string;
  read_at?: string | null;
  created_at: string;
  is_unsent?: boolean;
  reply_to_id?: string | null;
  reply_to_content?: string;
  reactions?: string[];
}

interface MatchInfo {
  id: string;
  name: string;
  avatar_url?: string;
  isOnline?: boolean;
}

// Quick reactions for Instagram-like popup
const QUICK_REACTIONS = ["❤️", "👍", "😂", "😮", "😢", "🔥"];

const Chat = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const mediaInputRef = useRef<HTMLInputElement>(null);
  
  const searchParams = new URLSearchParams(location.search);
  const matchId = searchParams.get("matchId");

  // Load deleted message IDs from localStorage on mount
  const getInitialDeletedIds = (): Set<string> => {
    try {
      const stored = localStorage.getItem(`deleted_messages_${matchId}`);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  };
  
  // Load "deleted for me" IDs (messages user deleted for themselves only)
  const getInitialDeletedForMeIds = (): Set<string> => {
    try {
      const stored = localStorage.getItem(`deleted_for_me_${matchId}`);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  };
  
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [matchInfo, setMatchInfo] = useState<MatchInfo | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  // Track "deleted for me" IDs - messages user deleted for themselves only (receiver still sees them)
  const [deletedForMeIds, setDeletedForMeIds] = useState<Set<string>>(() => getInitialDeletedForMeIds());
  const deletedForMeIdsRef = useRef<Set<string>>(getInitialDeletedForMeIds());
  // Track permanently deleted IDs (unsent - both users can't see)
  const [deletedMessageIds, setDeletedMessageIds] = useState<Set<string>>(() => getInitialDeletedIds());
  const deletedMessageIdsRef = useRef<Set<string>>(getInitialDeletedIds());
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  
  // Message interactions
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set());
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);
  
  // Long press popup state (Instagram-like)
  const [longPressPopup, setLongPressPopup] = useState<{
    messageId: string;
    isOwnMessage: boolean;
    messageContent: string;
  } | null>(null);
  
  // Ref for the long press timer
  const touchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Media preview
  const [pendingFiles, setPendingFiles] = useState<{file: File; preview: string; type: 'image' | 'video' | 'audio' | 'file'}[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Fullscreen image viewer
  const [fullscreenImage, setFullscreenImage] = useState<{src: string; isOpen: boolean}>({ src: '', isOpen: false });

  // Audio player
  const [audioPlayer, setAudioPlayer] = useState<{src: string; isOpen: boolean}>({ src: '', isOpen: false });

  // Keyboard detection for proper padding
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  
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

  useEffect(() => { loadChatData(); }, [matchId]);
  useEffect(() => { scrollToBottom(); }, [messages]);

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

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });

  const handleFiles = (files?: FileList) => {
    if (!files) return;
    
    const newFiles = Array.from(files).map(file => ({
      file,
      preview: URL.createObjectURL(file),
      type: (file.type.startsWith('video/') ? 'video' : file.type.startsWith('audio/') ? 'audio' : 'image') as 'image' | 'video' | 'audio' | 'file'
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
      await uploadAndSendMedia(fileData.file, fileData.type as 'image' | 'video' | 'audio');
    }
    setPendingFiles([]);
  };

  const loadChatData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUserId(user.id);

      if (matchId) {
        const { data: profile } = await supabase.from("profiles").select("id, name, avatar_url").eq("id", matchId).single();
        if (profile) setMatchInfo({ 
          id: profile.id, 
          name: profile.name, 
          avatar_url: profile.avatar_url,
          isOnline: Math.random() > 0.3
        });
        setIsOnline(profile ? Math.random() > 0.3 : false);

        const { data: messagesData } = await supabase
          .from("messages")
          .select("id, sender_id, content, media_url, media_type, read_at, created_at, is_unsent, reply_to_id, reactions")
          .or(`and(sender_id.eq.${user.id},receiver_id.eq.${matchId}),and(sender_id.eq.${matchId},receiver_id.eq.${user.id})`)
          .or("is_unsent.is.null,is_unsent.eq.false")
          .order("created_at", { ascending: true });
        
        if (messagesData) {
          // Filter out messages that have been permanently deleted (unsent) OR deleted for me
          const filteredMessages = messagesData.filter(msg => 
            !deletedMessageIdsRef.current.has(msg.id) && 
            !deletedForMeIdsRef.current.has(msg.id)
          );
          
          const messagesWithReplies = await Promise.all(
            filteredMessages.map(async (msg) => {
              // Parse reactions from database (stored as JSON string or JSONB)
              let reactions: string[] = [];
              if (msg.reactions) {
                if (typeof msg.reactions === 'string') {
                  try {
                    reactions = JSON.parse(msg.reactions);
                  } catch { reactions = []; }
                } else if (Array.isArray(msg.reactions)) {
                  reactions = msg.reactions;
                }
              }
              
              if (msg.reply_to_id) {
                // Check if the replied message was also deleted
                if (deletedMessageIdsRef.current.has(msg.reply_to_id) || deletedForMeIdsRef.current.has(msg.reply_to_id)) {
                  return { ...msg, reply_to_id: null, reply_to_content: "Message", reactions };
                }
                const { data: replyMsg } = await supabase
                  .from("messages")
                  .select("content")
                  .eq("id", msg.reply_to_id)
                  .single();
                return { ...msg, reply_to_content: replyMsg?.content || "Message", reactions };
              }
              return { ...msg, reactions };
            })
          );
          setMessages(messagesWithReplies);
        }

        await supabase.from("messages").update({ read_at: new Date().toISOString() })
          .eq("sender_id", matchId).eq("receiver_id", user.id).is("read_at", null);

        // Create a dedicated channel for real-time chat communication (including unsend)
        const chatChannel = supabase.channel(`chat:${matchId}`);
        
        // Listen for broadcast messages (unsend notifications)
        chatChannel.on(
          'broadcast',
          { event: 'unsend' },
          ({ payload }) => {
            console.log('Received unsend broadcast:', payload);
            if (payload && payload.messageId) {
              // Add to local deleted IDs and save to localStorage
              const newDeletedIds = new Set(deletedMessageIdsRef.current).add(payload.messageId);
              setDeletedMessageIds(newDeletedIds);
              deletedMessageIdsRef.current = newDeletedIds;
              try {
                localStorage.setItem(`deleted_messages_${matchId}`, JSON.stringify([...newDeletedIds]));
              } catch (e) { /* ignore */ }
              // Remove from UI
              setMessages(prev => prev.filter(msg => msg.id !== payload.messageId));
            }
          }
        );
        
        // Listen for broadcast messages (reaction notifications)
        chatChannel.on(
          'broadcast',
          { event: 'reaction' },
          ({ payload }) => {
            console.log('Received reaction broadcast:', payload);
            if (payload && payload.messageId && payload.reactions) {
              // Update the message with the new reactions
              setMessages(prev => prev.map(msg => 
                msg.id === payload.messageId 
                  ? { ...msg, reactions: payload.reactions } 
                  : msg
              ));
            }
          }
        ).subscribe();
        
        // Also listen for INSERT events
        chatChannel.on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "messages", filter: `receiver_id=eq.${user.id}` },
          (payload) => { 
            if (payload.new && (payload.new as Message).sender_id === matchId) {
              const newMsg = payload.new as Message;
              // Don't add if this message was deleted locally (unsent or deleted for me)
              // Also filter out messages that are marked as unsent in the database
              if (!deletedMessageIdsRef.current.has(newMsg.id) && 
                  !deletedForMeIdsRef.current.has(newMsg.id) &&
                  !(newMsg as any).is_unsent) {
                setMessages(prev => [...prev, { ...newMsg, reactions: [] }]); 
                setIsOtherUserTyping(true);
                setTimeout(() => setIsOtherUserTyping(false), 2000);
              }
            }
          }
        );
        
        // Listen for UPDATE events (including is_unsent)
        chatChannel.on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "messages" },
          (payload) => {
            if (payload.new && (payload.new as Message).id) {
              const updatedMsg = payload.new as Message;
              
              // Check if message was unsent - remove from UI for both users
              if ((updatedMsg as any).is_unsent === true) {
                // Add to local deleted IDs and save to localStorage
                const newDeletedIds = new Set(deletedMessageIdsRef.current).add(updatedMsg.id);
                setDeletedMessageIds(newDeletedIds);
                deletedMessageIdsRef.current = newDeletedIds;
                try {
                  localStorage.setItem(`deleted_messages_${matchId}`, JSON.stringify([...newDeletedIds]));
                } catch (e) { /* ignore */ }
                // Remove from UI
                setMessages(prev => prev.filter(msg => msg.id !== updatedMsg.id));
                return;
              }
              
              // Check if the other user deleted this message for themselves
              // If so, add to our local "deleted for me" list and remove from UI
              const isDeletedForReceiver = updatedMsg.sender_id !== currentUserId && (updatedMsg as any).deleted_for_receiver;
              const isDeletedForSender = updatedMsg.sender_id === currentUserId && (updatedMsg as any).deleted_for_sender;
              
              if (isDeletedForReceiver || isDeletedForSender) {
                // Add to local deleted IDs and save to localStorage
                const newDeletedForMeIds = new Set(deletedForMeIdsRef.current).add(updatedMsg.id);
                setDeletedForMeIds(newDeletedForMeIds);
                deletedForMeIdsRef.current = newDeletedForMeIds;
                try {
                  localStorage.setItem(`deleted_for_me_${matchId}`, JSON.stringify([...newDeletedForMeIds]));
                } catch (e) { /* ignore */ }
                // Remove from UI
                setMessages(prev => prev.filter(msg => msg.id !== updatedMsg.id));
              } else {
                setMessages(prev => prev.map(msg => 
                  msg.id === updatedMsg.id 
                    ? { ...msg, ...updatedMsg } 
                    : msg
                ));
              }
            }
          }
        );
        
        // Legacy: Listen for DELETE events
        const deleteChannel = supabase.channel(`chat:delete:${matchId}`).on(
          "postgres_changes",
          { event: "DELETE", schema: "public", table: "messages" },
          (payload) => {
            if (payload.old && (payload.old as any).id) {
              const deletedId = (payload.old as any).id;
              // Add to local deleted IDs and save to localStorage
              const newDeletedIds = new Set(deletedMessageIdsRef.current).add(deletedId);
              setDeletedMessageIds(newDeletedIds);
              deletedMessageIdsRef.current = newDeletedIds;
              try {
                localStorage.setItem(`deleted_messages_${matchId}`, JSON.stringify([...newDeletedIds]));
              } catch (e) { /* ignore */ }
              // Remove from UI
              setMessages(prev => prev.filter(msg => msg.id !== deletedId));
            }
          }
        ).subscribe();
        
        return () => { 
          supabase.removeChannel(chatChannel); 
          supabase.removeChannel(deleteChannel);
        };
      } else {
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
      const newMessageData = {
        sender_id: currentUserId,
        receiver_id: matchId,
        content: (messageContent?.trim() || `[${mediaType || 'media'}]`) as string,
        media_url: mediaUrl || null,
        media_type: mediaType || null,
        reply_to_id: replyToMessage?.id || null,
      };
      
      const { data, error } = await supabase.from("messages").insert(newMessageData).select().single();
      
      if (error) console.error("Error sending message:", error);
      
      setNewMessage("");
      setReplyToMessage(null);
      
      setMessages(prev => [...prev, {
        id: data?.id || Date.now().toString(),
        sender_id: currentUserId,
        content: (messageContent?.trim() || `[${mediaType || 'media'}]`) as string,
        media_url: mediaUrl,
        media_type: mediaType,
        created_at: data?.created_at || new Date().toISOString(),
        reply_to_id: replyToMessage?.id || null,
        reply_to_content: replyToMessage?.content,
        reactions: []
      }]);
    } catch (error) { console.error("Error sending message:", error); }
    finally { setSending(false); }
  };

  const handleMediaSelect = async (files: FileList) => {
    const fileArray = Array.from(files);
    for (const file of fileArray) {
      const type = file.type.startsWith('video/') ? 'video' : file.type.startsWith('audio/') ? 'audio' : 'image';
      await uploadAndSendMedia(file, type as 'image' | 'video' | 'audio');
    }
  };

  // Handle media selection from the MediaPicker component
  const handleMediaPickerSelect = async (items: MediaItem[]) => {
    for (const item of items) {
      try {
        setUploading(true);
        setUploadProgress(0);
        
        // Convert URI to blob and then upload
        const response = await fetch(item.uri);
        const blob = await response.blob();
        
        // Determine file extension from URI
        const ext = item.uri.split('.').pop()?.split('?')[0] || 'jpg';
        const mimeType = item.type === 'video' ? 'video/mp4' : 'image/jpeg';
        const fileName = `${Date.now()}_media.${ext}`;
        
        // Create File from Blob
        const file = new File([blob], fileName, { type: mimeType });
        
        const type = item.type;
        await uploadAndSendMedia(file, type);
      } catch (error) {
        console.error("Error processing media:", error);
        sendMessage(`[${item.type}]`);
      }
    }
    setUploading(false);
    setUploadProgress(0);
  };

  const handleVoiceRecord = async (blob: Blob, duration: number) => {
    const file = new File([blob], `voice_${Date.now()}.webm`, { type: 'audio/webm' });
    await uploadAndSendMedia(file, 'audio');
  };

  const uploadAndSendMedia = async (file: File, type: 'image' | 'video' | 'audio') => {
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

  const handleReaction = async (messageId: string, reaction: string) => {
    // First, get the current reactions for this message from the message in state
    const message = messages.find(m => m.id === messageId);
    const currentReactions = message?.reactions || [];
    
    // Update local state immediately for responsiveness
    setMessages(prev => prev.map(msg => {
      if (msg.id === messageId) {
        const reactions = msg.reactions || [];
        if (reactions.includes(reaction)) {
          return { ...msg, reactions: reactions.filter(r => r !== reaction) };
        }
        return { ...msg, reactions: [...reactions, reaction] };
      }
      return msg;
    }));
    
    // Now save to database and broadcast to other user
    try {
      // Get the current reactions from database to avoid overwriting
      const { data: msgData } = await supabase
        .from("messages")
        .select("reactions")
        .eq("id", messageId)
        .single();
      
      let newReactions: string[] = [];
      if (msgData?.reactions && Array.isArray(msgData.reactions)) {
        // reactions is stored as JSON array
        newReactions = msgData.reactions;
      } else if (msgData?.reactions && typeof msgData.reactions === 'object') {
        // Handle case where reactions might be stored as object
        newReactions = (msgData.reactions as any).reactions || [];
      }
      
      // Toggle reaction
      if (currentReactions.includes(reaction)) {
        newReactions = newReactions.filter(r => r !== reaction);
      } else {
        newReactions = [...newReactions, reaction];
      }
      
      // Save to database
      await supabase
        .from("messages")
        .update({ reactions: JSON.stringify(newReactions) })
        .eq("id", messageId);
      
      // Broadcast reaction to the other user via realtime
      const broadcastChannel = supabase.channel(`chat:${matchId}`);
      await broadcastChannel.send({
        type: 'broadcast',
        event: 'reaction',
        payload: { 
          messageId, 
          reactions: newReactions,
          userId: currentUserId
        }
      });
    } catch (error) {
      console.error("Error saving reaction:", error);
    }
  };

  const handleUnsendMessage = async (messageId: string) => {
    try {
      // Soft delete: Mark message as unsent instead of permanently deleting
      // This ensures realtime notifications are sent to the receiver
      const { error: dbError } = await supabase
        .from("messages")
        .update({ is_unsent: true })
        .eq("id", messageId);
      
      if (dbError) {
        console.error("Database update error:", dbError);
      }
      
      // Send broadcast notification to the receiver using Supabase realtime
      // This doesn't depend on database realtime being enabled
      const broadcastChannel = supabase.channel(`chat:${matchId}`);
      await broadcastChannel.send({
        type: 'broadcast',
        event: 'unsend',
        payload: { messageId }
      });
      
      // Track deleted message ID locally to ensure it stays deleted
      // Also save to localStorage so it persists across page refreshes
      const newDeletedIds = new Set(deletedMessageIdsRef.current).add(messageId);
      setDeletedMessageIds(newDeletedIds);
      deletedMessageIdsRef.current = newDeletedIds;
      
      // Save to localStorage for persistence
      try {
        localStorage.setItem(`deleted_messages_${matchId}`, JSON.stringify([...newDeletedIds]));
      } catch (storageError) {
        console.error("localStorage save error:", storageError);
      }
      
      // Remove the message from local state completely
      setMessages(prev => prev.filter(msg => msg.id !== messageId));
      setSelectedMessageId(null);
    } catch (error) {
      console.error("Error deleting message:", error);
    }
  };

  // Handle "Delete for Me" - only hides message for current user, receiver still sees it
  const handleDeleteForMe = async (messageId: string) => {
    try {
      // Update the message in DB to mark as deleted for this user
      const message = messages.find(m => m.id === messageId);
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
      
      // Track "deleted for me" ID locally - save to localStorage
      const newDeletedForMeIds = new Set(deletedForMeIdsRef.current).add(messageId);
      setDeletedForMeIds(newDeletedForMeIds);
      deletedForMeIdsRef.current = newDeletedForMeIds;
      
      try {
        localStorage.setItem(`deleted_for_me_${matchId}`, JSON.stringify([...newDeletedForMeIds]));
      } catch (storageError) {
        console.error("localStorage save error:", storageError);
      }
      
      // Remove from local UI only
      setMessages(prev => prev.filter(msg => msg.id !== messageId));
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
    console.log('handleMessageClick called with:', messageId);
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
    console.log("Long press detected for message:", messageId);
    
    // Vibrate for feedback
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
    
    setLongPressPopup({
      messageId,
      isOwnMessage,
      messageContent
    });
  };

  // Touch handling for mobile long-press
  const handleTouchStart = (e: React.TouchEvent, messageId: string, isOwnMessage: boolean, messageContent: string) => {
    console.log("Touch started for message:", messageId);
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

  const handleQuickReaction = async (e: React.MouseEvent | React.TouchEvent | React.PointerEvent, messageId: string, reaction: string) => {
    e.preventDefault();
    e.stopPropagation();
    await handleReaction(messageId, reaction);
    setLongPressPopup(null);
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }
  };

  // Handle reply from popup
  const handlePopupReply = (e: React.MouseEvent | React.TouchEvent | React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (longPressPopup) {
      const message = messages.find(m => m.id === longPressPopup.messageId);
      if (message) {
        handleReply(message);
      }
    }
    setLongPressPopup(null);
  };

  // Handle copy from popup
  const handlePopupCopy = (e: React.MouseEvent | React.TouchEvent | React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (longPressPopup?.messageContent) {
      navigator.clipboard.writeText(longPressPopup.messageContent);
    }
    setLongPressPopup(null);
  };

  // Handle delete from popup
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

  const groupedMessages = messages.reduce((groups: { date: string; messages: Message[] }[], message) => {
    const date = formatDate(message.created_at);
    const existingGroup = groups.find(g => g.date === date);
    if (existingGroup) {
      existingGroup.messages.push(message);
    } else {
      groups.push({ date, messages: [message] });
    }
    return groups;
  }, []);

  if (loading) {
    return (
      <div className="h-[100dvh] bg-background flex flex-col">
        <ChatLoadingSkeleton />
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
              <p className="text-sm text-muted-foreground">Images, videos, or audio</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header - Sticky at top */}
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
              {isOnline && (
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full ring-2 ring-card" />
              )}
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-base">{matchInfo?.name || 'Chat'}</h3>
              {isOnline && (
                <p className="text-xs text-green-500">Active Now</p>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Message Container - Scrollable middle section */}
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto overflow-visible px-4 space-y-4 pb-2 hide-scrollbar"
        style={{ 
          paddingBottom: keyboardHeight > 0 ? `${keyboardHeight + 16}px` : undefined,
          minHeight: 0 
        }}
      >
        {/* Fade gradient when scrolling up */}
        <div className="sticky top-0 left-0 right-0 h-4 bg-gradient-to-b from-background to-transparent z-10 pointer-events-none" />
        
        {/* Date headers and messages */}
        {messages.length === 0 ? (
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
                      console.log('Message clicked:', message.id);
                      handleMessageClick(message.id);
                    }}
                    onDoubleClick={() => {
                      console.log('Message double-clicked:', message.id);
                      handleMessageClick(message.id);
                    }}
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
                              className="max-w-full rounded-2xl max-h-64" 
                              controls 
                            />
                          )  : (
                            <img 
                              src={message.media_url} 
                              alt="Shared" 
                              className="max-w-full rounded-2xl max-h-64 object-cover cursor-pointer hover:opacity-90 transition-opacity"
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
                            (isSelected || isMultiSelected) && "ring-2 ring-primary"
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
                      
                      {/* Reactions badge */}
                      {message.reactions && message.reactions.length > 0 && (
                        <ReactionBadge reactions={message.reactions} className="mt-1" />
                      )}
                      
                      {/* Time and read receipts - only show when message is selected */}
                      {isSelected && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className={cn(
                            "flex items-center gap-1 mt-0.5",
                            isOwnMessage ? 'justify-end' : 'justify-start'
                          )}
                        >
                          <span className="text-[10px] text-muted-foreground/70">{formatTime(message.created_at)}</span>
                          {isOwnMessage && (
                            message.read_at ? (
                              <CheckCheck className="w-3 h-3 text-blue-400" />
                            ) : (
                              <Check className="w-3 h-3 text-muted-foreground/70" />
                            )
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

      {/* Instagram-like Popup - Combined Reactions + Options */}
      <AnimatePresence>
        {longPressPopup && (
          <>
            {/* Dimmed Background */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
              onClick={() => setLongPressPopup(null)}
            />
            
            {/* Popup Container - 80% Width */}
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
                {/* Quick Reactions Row - Compact */}
                <div className="flex items-center justify-around gap-1 px-2 py-3 bg-gradient-to-b from-gray-50 to-white border-b border-gray-100">
                  {/* Default reactions */}
                  {QUICK_REACTIONS.map((reaction, index) => (
                    <motion.button
                      key={`default-${reaction}`}
                      type="button"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: index * 0.05 }}
                      onPointerDown={(e) => handleQuickReaction(e, longPressPopup.messageId, reaction)}
                      className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-all hover:scale-125 active:scale-90 text-xl shadow-sm touch-action-manipulation"
                    >
                      {reaction}
                    </motion.button>
                  ))}
                </div>
                
                {/* Divider Line */}
                <div className="h-px bg-gray-200 mx-4" />
                
                {/* Action Buttons - Compact Vertical Layout */}
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
                  
                  {/* Delete for Me - shown for all messages */}
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

      {/* Reply Indicator - Sticky above input */}
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

      {/* Input Bar - Sticky at bottom */}
      <div className="flex-shrink-0 bg-background border-t border-border/30 sticky bottom-0" style={{ paddingBottom: keyboardHeight > 0 ? `${keyboardHeight}px` : undefined }}>
        <MessageInput
          value={newMessage}
          onChange={setNewMessage}
          onSend={() => sendMessage()}
          placeholder="Message..."
          disabled={sending}
          className="select-none"
        />
      </div>

      {/* Hidden Media Input */}
      <input 
        ref={mediaInputRef} 
        type="file" 
        accept="image/*,video/*,audio/*" 
        multiple
        className="hidden" 
        onChange={(e) => handleMediaSelect(e.target.files!)} 
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

