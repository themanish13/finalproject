import { useState, useCallback, useEffect } from 'react';

export interface MediaItem {
  uri: string;
  type: 'image' | 'video';
  name?: string;
  size?: number;
  lastModified?: number;
}

export interface UseMediaPickerReturn {
  recentPhotos: MediaItem[];
  isLoading: boolean;
  error: string | null;
  openFullPicker: () => Promise<void>;
  selectFromRecent: (item: MediaItem) => void;
  clearError: () => void;
  hasPermission: boolean;
  requestPermission: () => Promise<boolean>;
}

// Check if Photo Picker API is supported
const isPhotoPickerSupported = (): boolean => {
  return 'showOpenFilePicker' in window || 'showSaveFilePicker' in window || 
         (typeof window !== 'undefined' && 'launchQueue' in window && 'LaunchParams' in window);
};

// Convert File to MediaItem
const fileToMediaItem = (file: File): MediaItem => ({
  uri: URL.createObjectURL(file),
  type: file.type.startsWith('video/') ? 'video' : 'image',
  name: file.name,
  size: file.size,
  lastModified: file.lastModified,
});

// Convert blob to base64 for network transmission
export const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      resolve(base64.split(',')[1]); // Remove data URL prefix
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

// Convert URI to Blob for network transmission
export const uriToBlob = async (uri: string): Promise<Blob | null> => {
  try {
    const response = await fetch(uri);
    return await response.blob();
  } catch (error) {
    console.error('Error converting URI to Blob:', error);
    return null;
  }
};

// Convert URI to base64 for network transmission
export const uriToBase64 = async (uri: string): Promise<string | null> => {
  try {
    const blob = await uriToBlob(uri);
    if (blob) {
      return await blobToBase64(blob);
    }
    return null;
  } catch (error) {
    console.error('Error converting URI to base64:', error);
    return null;
  }
};

// Create FormData from URI for HTTP upload
export const createFormDataFromUri = async (
  uri: string, 
  fieldName: string = 'file',
  fileName: string = 'image.jpg'
): Promise<FormData | null> => {
  try {
    const blob = await uriToBlob(uri);
    if (!blob) return null;
    
    const formData = new FormData();
    formData.append(fieldName, blob, fileName);
    return formData;
  } catch (error) {
    console.error('Error creating FormData from URI:', error);
    return null;
  }
};

// Custom hook for media picking
export const useMediaPicker = (
  onMediaSelect?: (items: MediaItem[]) => void,
  maxItems: number = 10
): UseMediaPickerReturn => {
  const [recentPhotos, setRecentPhotos] = useState<MediaItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState(true);

  // Check and request photo library permission (iOS)
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (typeof window === 'undefined') return false;
    
    // For iOS 14+ Photo Library access
    if ('Photos' in window) {
      try {
        // @ts-ignore - iOS Photo Library API
        const status = await window.Photos?.requestAuthorization?.();
        if (status === 'authorized' || status === 'limited') {
          setHasPermission(true);
          return true;
        }
      } catch (e) {
        console.log('Photo authorization not available');
      }
    }
    
    // For Android/Desktop - usually no permission needed for picker
    setHasPermission(true);
    return true;
  }, []);

  // Open full photo picker using modern PickVisualMedia API or fallback
  const openFullPicker = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Check for modern Photo Picker API (Android 13+ / iOS 14+ / Desktop)
      if ('showOpenFilePicker' in window || 'launchQueue' in window) {
        // Try using the modern photo picker if available
        // For Android: android.photoPicker
        // For iOS 14+: UIImagePickerController with PHPickerViewController
        // For Desktop: window.showOpenFilePicker with types filter
        
        // Use input element as universal fallback that works everywhere
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*,video/*';
        input.multiple = true;
        
        // For modern browsers, try to use the photo picker
        // @ts-ignore - experimental API
        if ('launchQueue' in window && 'LaunchParams' in window) {
          // Desktop: try File System Access API
          try {
            // @ts-ignore - File System Access API
            const fileHandles = await window.showOpenFilePicker({
              types: [{
                description: 'Images and Videos',
                accept: {
                  'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.heif'],
                  'video/*': ['.mp4', '.mov', '.avi', '.webm', '.mkv']
                }
              }],
              multiple: true,
              excludeAcceptAllOption: false,
            });
            
            const items: MediaItem[] = [];
            for (const handle of fileHandles) {
              const file = await handle.getFile();
              items.push(fileToMediaItem(file));
            }
            
            if (items.length > 0) {
              onMediaSelect?.(items.slice(0, maxItems));
            }
            setIsLoading(false);
            return;
          } catch (e) {
            // Fall back to input element
            console.log('File System Access not available, using input fallback');
          }
        }
        
        // Universal fallback: use hidden input element
        input.onchange = async (e) => {
          const files = (e.target as HTMLInputElement).files;
          if (files && files.length > 0) {
            const items = Array.from(files).slice(0, maxItems).map(fileToMediaItem);
            
            // Add to recent photos
            setRecentPhotos(prev => {
              const newItems = items.filter(
                item => !prev.some(p => p.uri === item.uri)
              );
              return [...newItems, ...prev].slice(0, 20);
            });
            
            onMediaSelect?.(items);
          }
          setIsLoading(false);
        };
        
        input.click();
        return;
      }
      
      // Fallback for older browsers
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*,video/*';
      input.multiple = true;
      
      input.onchange = async (e) => {
        const files = (e.target as HTMLInputElement).files;
        if (files && files.length > 0) {
          const items = Array.from(files).slice(0, maxItems).map(fileToMediaItem);
          setRecentPhotos(prev => {
            const newItems = items.filter(
              item => !prev.some(p => p.uri === item.uri)
            );
            return [...newItems, ...prev].slice(0, 20);
          });
          onMediaSelect?.(items);
        }
        setIsLoading(false);
      };
      
      input.click();
      
    } catch (err) {
      console.error('Error opening photo picker:', err);
      setError('Failed to open photo picker');
      setIsLoading(false);
    }
  }, [onMediaSelect, maxItems]);

  // Select from recent photos
  const selectFromRecent = useCallback((item: MediaItem) => {
    onMediaSelect?.([item]);
  }, [onMediaSelect]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      recentPhotos.forEach(photo => {
        if (photo.uri.startsWith('blob:')) {
          URL.revokeObjectURL(photo.uri);
        }
      });
    };
  }, []);

  return {
    recentPhotos,
    isLoading,
    error,
    openFullPicker,
    selectFromRecent,
    clearError,
    hasPermission,
    requestPermission,
  };
};

export default useMediaPicker;

