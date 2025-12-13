import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Camera, Upload, X, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

interface AvatarUploadProps {
  currentAvatarUrl?: string;
  onAvatarUpdate: (avatarUrl: string) => void;
  userId: string;
}

const AvatarUpload = ({ currentAvatarUrl, onAvatarUpdate, userId }: AvatarUploadProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Update preview URL when currentAvatarUrl prop changes
  useEffect(() => {
    if (currentAvatarUrl) {
      setPreviewUrl(currentAvatarUrl);
    }
  }, [currentAvatarUrl]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid File Type",
        description: "Please select an image file (JPG, PNG, GIF).",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please select an image smaller than 5MB.",
        variant: "destructive",
      });
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Upload to Supabase
    uploadAvatar(file);
  };

  const uploadAvatar = async (file: File) => {
    setIsUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/avatar.${fileExt}`;
      const filePath = fileName;

      // Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
        .eq('id', userId);

      if (updateError) {
        throw updateError;
      }

      // Force refresh by waiting a moment and then updating
      setTimeout(() => {
        onAvatarUpdate(publicUrl);
      }, 500);
      
      toast({
        title: "Avatar Updated!",
        description: "Your profile picture has been updated successfully.",
      });

    } catch (error: any) {
      console.error('Avatar upload error:', error);
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload avatar. Please try again.",
        variant: "destructive",
      });
      // Reset preview on error
      setPreviewUrl(currentAvatarUrl || null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveAvatar = async () => {
    try {
      setIsUploading(true);

      // Remove from database
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('id', userId);

      if (updateError) {
        throw updateError;
      }

      // Remove from storage
      const fileExt = currentAvatarUrl?.split('.').pop() || 'jpg';
      const fileName = `${userId}/avatar.${fileExt}`;
      
      await supabase.storage
        .from('avatars')
        .remove([fileName]);

      setPreviewUrl(null);
      onAvatarUpdate('');
      
      toast({
        title: "Avatar Removed",
        description: "Your profile picture has been removed.",
      });

    } catch (error: any) {
      console.error('Avatar removal error:', error);
      toast({
        title: "Removal Failed",
        description: "Failed to remove avatar. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleAvatarClick = () => {
    if (isUploading) return;
    fileInputRef.current?.click();
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Avatar Display */}
      <motion.div
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="relative"
      >
        <div
          className={`w-24 h-24 rounded-full bg-secondary border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:border-primary transition-colors overflow-hidden ${
            isUploading ? 'opacity-50 cursor-not-allowed' : ''
          }`}
          onClick={handleAvatarClick}
        >
          {isUploading ? (
            <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
          ) : previewUrl ? (
            <img
              src={previewUrl}
              alt="Avatar"
              className="w-full h-full object-cover"
            />
          ) : (
            <Camera className="w-8 h-8 text-muted-foreground" />
          )}
        </div>

        {/* Upload Icon Overlay */}
        {!isUploading && (
          <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-lg">
            <Upload className="w-4 h-4 text-primary-foreground" />
          </div>
        )}

        {/* Remove Button (only if avatar exists) */}
        {previewUrl && !isUploading && (
          <Button
            size="icon"
            variant="destructive"
            className="absolute -top-1 -right-1 w-6 h-6 rounded-full"
            onClick={handleRemoveAvatar}
          >
            <X className="w-3 h-3" />
          </Button>
        )}
      </motion.div>

      {/* Upload Instructions */}
      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          {previewUrl ? 'Click to change photo' : 'Click to upload photo'}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          JPG, PNG, GIF up to 5MB
        </p>
      </div>
    </div>
  );
};

export default AvatarUpload;
