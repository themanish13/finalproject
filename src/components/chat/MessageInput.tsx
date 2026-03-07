import { useState, useRef, useEffect } from "react";
import { Send, Image, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MessageInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onMediaSelect?: (files: File[]) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

const MessageInput = ({
  value,
  onChange,
  onSend,
  onMediaSelect,
  placeholder = "Message...",
  disabled = false,
  className
}: MessageInputProps) => {
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (value.trim()) {
        onSend();
      }
    }
  };

  const handleMediaClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0 && onMediaSelect) {
      // Convert FileList to Array and pass
      const fileArray: File[] = Array.from(files);
      onMediaSelect(fileArray);
      // Reset input so same file can be selected again
      e.target.value = '';
    }
  };

  return (
    <div className={cn("flex items-end gap-2 px-4 py-3", className)}>
      {/* Media Button */}
      {onMediaSelect && (
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={handleMediaClick}
          disabled={disabled}
          className="rounded-full w-10 h-10 flex-shrink-0 hover:bg-secondary"
        >
          <Image className="w-5 h-5 text-muted-foreground" />
        </Button>
      )}
      
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Text Input */}
      <div className="flex-1">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          className={cn(
            "w-full bg-background/80 backdrop-blur-sm resize-none rounded-2xl px-4 py-3",
            "placeholder:text-muted-foreground/60",
            "focus:outline-none text-sm border border-border/50",
            "max-h-[120px] overflow-y-auto hide-scrollbar",
            isFocused && "bg-background border-primary/30"
          )}
        />
      </div>

      {/* Send Button */}
      {value.trim() && (
        <Button
          type="button"
          size="icon"
          onClick={onSend}
          disabled={disabled || !value.trim()}
          className="rounded-full w-10 h-10 flex-shrink-0 bg-primary hover:bg-primary/90"
        >
          <Send className="w-5 h-5" />
        </Button>
      )}
    </div>
  );
};

export default MessageInput;

