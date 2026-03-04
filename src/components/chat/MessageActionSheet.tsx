import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  MessageCircle, 
  Sticker, 
  Forward, 
  Copy, 
  Languages, 
  Trash2,
  Heart,
  ThumbsUp,
  CircleDot,
  Frown,
  Angry
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MessageActionSheetProps {
  isVisible: boolean;
  onClose: () => void;
  onReply: () => void;
  onAddSticker: () => void;
  onForward: () => void;
  onCopy: () => void;
  onTranslate: () => void;
  onUnsend: () => void;
  onReaction: (reaction: string) => void;
  messageContent?: string;
  isOwnMessage?: boolean;
}

// Super react emoji options
const SUPER_REACTIONS = [
  { emoji: "❤️", icon: Heart, label: "Love" },
  { emoji: "👍", icon: ThumbsUp, label: "Like" },
  { emoji: "😂", icon: CircleDot, label: "Laugh" },
  { emoji: "😮", icon: Frown, label: "Wow" },
  { emoji: "😢", icon: CircleDot, label: "Sad" },
  { emoji: "😡", icon: Angry, label: "Angry" },
];

const MessageActionSheet = ({
  isVisible,
  onClose,
  onReply,
  onAddSticker,
  onForward,
  onCopy,
  onTranslate,
  onUnsend,
  onReaction,
  isOwnMessage = false,
}: MessageActionSheetProps) => {
  const [selectedReaction, setSelectedReaction] = useState<string | null>(null);

  const handleAction = (action: string) => {
    switch (action) {
      case "reply":
        onReply();
        break;
      case "sticker":
        onAddSticker();
        break;
      case "forward":
        onForward();
        break;
      case "copy":
        onCopy();
        break;
      case "translate":
        onTranslate();
        break;
    }
    onClose();
  };

  const handleReaction = (emoji: string) => {
    setSelectedReaction(emoji);
    onReaction(emoji);
    // Haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }
    setTimeout(() => {
      setSelectedReaction(null);
      onClose();
    }, 300);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40"
            onClick={onClose}
          />
          
          {/* Action Sheet Container - Centered */}
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
            style={{ 
              maxWidth: '320px',
              width: '90%'
            }}
          >
            {/* Super React Bar - Horizontal white container at top */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="bg-white rounded-2xl shadow-xl border border-gray-100 p-2 mb-2"
            >
              <div className="flex items-center justify-around gap-1">
                {SUPER_REACTIONS.map(({ emoji, icon: Icon, label }) => (
                  <button
                    key={label}
                    onClick={() => handleReaction(emoji)}
                    className={cn(
                      "flex flex-col items-center justify-center w-12 h-12 rounded-xl",
                      "hover:bg-gray-100 transition-all duration-200",
                      "active:scale-90",
                      selectedReaction === emoji && "bg-red-50 scale-110"
                    )}
                  >
                    <span className="text-2xl">{emoji}</span>
                  </button>
                ))}
              </div>
            </motion.div>

            {/* Vertical Dropdown Menu - White with options */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden"
            >
              {/* Reply */}
              <button
                onClick={() => handleAction("reply")}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <MessageCircle className="w-4 h-4 text-blue-600" />
                </div>
                <span className="text-gray-700 font-medium">Reply</span>
              </button>

              {/* Add sticker */}
              <button
                onClick={() => handleAction("sticker")}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                  <Sticker className="w-4 h-4 text-purple-600" />
                </div>
                <span className="text-gray-700 font-medium">Add sticker</span>
              </button>

              {/* Forward */}
              <button
                onClick={() => handleAction("forward")}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                  <Forward className="w-4 h-4 text-green-600" />
                </div>
                <span className="text-gray-700 font-medium">Forward</span>
              </button>

              {/* Copy */}
              <button
                onClick={() => handleAction("copy")}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                  <Copy className="w-4 h-4 text-gray-600" />
                </div>
                <span className="text-gray-700 font-medium">Copy</span>
              </button>

              {/* Translate */}
              <button
                onClick={() => handleAction("translate")}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center">
                  <Languages className="w-4 h-4 text-yellow-600" />
                </div>
                <span className="text-gray-700 font-medium">Translate</span>
              </button>

              {/* Divider */}
              <div className="border-t border-gray-100" />

              {/* Unsend - Red distinct button */}
              <button
                onClick={() => {
                  onUnsend();
                  onClose();
                }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-50 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                  <Trash2 className="w-4 h-4 text-red-600" />
                </div>
                <span className="text-red-600 font-medium">Unsend</span>
              </button>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// Export both the component and demo
export default MessageActionSheet;

// Demo component with the pastel green background and avocado pattern
export const MessageActionSheetDemo = () => {
  const [isSheetVisible, setIsSheetVisible] = useState(true);

  // Pastel green background with avocado/subtle pattern
  const backgroundStyle = {
    backgroundColor: '#DCEDC8', // Pastel green (avocado green)
    backgroundImage: `
      radial-gradient(circle at 20px 20px, rgba(139, 195, 74, 0.15) 2%, transparent 0%),
      radial-gradient(circle at 60px 60px, rgba(139, 195, 74, 0.1) 2%, transparent 0%)
    `,
    backgroundSize: '80px 80px',
  };

  return (
    <div 
      className="min-h-screen w-full flex items-center justify-center p-4"
      style={backgroundStyle}
    >
      {/* Avocado pattern overlay - subtle leaf-like pattern */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-25"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M50 10 C30 30 20 50 30 70 C40 90 60 90 70 70 C80 50 70 30 50 10' fill='%238BC34A' fill-opacity='0.3'/%3E%3Ccircle cx='50' cy='60' r='8' fill='%23558B2F' fill-opacity='0.3'/%3E%3C/svg%3E")`,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Message bubble example */}
      <div className="relative z-10">
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-4 max-w-xs border border-white/50">
          <p className="text-gray-800">Long press on this message to see the action sheet!</p>
          <p className="text-gray-500 text-sm mt-2">Tap anywhere to toggle</p>
        </div>
      </div>

      {/* Action Sheet */}
      <MessageActionSheet
        isVisible={isSheetVisible}
        onClose={() => setIsSheetVisible(false)}
        onReply={() => console.log("Reply")}
        onAddSticker={() => console.log("Add sticker")}
        onForward={() => console.log("Forward")}
        onCopy={() => console.log("Copy")}
        onTranslate={() => console.log("Translate")}
        onUnsend={() => console.log("Unsend")}
        onReaction={(reaction) => console.log("Reaction:", reaction)}
        isOwnMessage={false}
      />
    </div>
  );
};

