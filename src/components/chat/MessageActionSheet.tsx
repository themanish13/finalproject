import { motion, AnimatePresence } from "framer-motion";
import { 
  MessageCircle, 
  Sticker, 
  Forward, 
  Copy, 
  Languages, 
  Trash2
} from "lucide-react";

interface MessageActionSheetProps {
  isVisible: boolean;
  onClose: () => void;
  onReply: () => void;
  onAddSticker: () => void;
  onForward: () => void;
  onCopy: () => void;
  onTranslate: () => void;
  onUnsend: () => void;
  messageContent?: string;
  isOwnMessage?: boolean;
}

const MessageActionSheet = ({
  isVisible,
  onClose,
  onReply,
  onAddSticker,
  onForward,
  onCopy,
  onTranslate,
  onUnsend,
  isOwnMessage = false,
}: MessageActionSheetProps) => {

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
            {/* Vertical Dropdown Menu */}
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

export default MessageActionSheet;

