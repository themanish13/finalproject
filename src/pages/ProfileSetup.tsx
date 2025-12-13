

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Heart, User, Camera, GraduationCap, Users, ArrowRight, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import AvatarUpload from "@/components/AvatarUpload";

const ProfileSetup = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const [name, setName] = useState("");
  const [gender, setGender] = useState("");
  const [className, setClassName] = useState("");

  const [batch, setBatch] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [existingProfile, setExistingProfile] = useState<any>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>("");

  useEffect(() => {
    loadExistingProfile();
  }, []);

  const loadExistingProfile = async () => {
    try {
      setIsLoading(true);
      

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.log("No authenticated user found, redirecting to auth");
        setAuthError("You need to be logged in to set up your profile");
        toast({
          title: "Authentication Required",
          description: "Please log in to continue.",
          variant: "destructive",
        });
        navigate("/auth");
        return;
      }

      console.log("User authenticated:", user.id);
      setCurrentUserId(user.id);

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();


      if (profile && !error) {
        // Pre-fill existing data
        setExistingProfile(profile);
        setName(profile.name || "");
        setGender(profile.gender || "");
        setClassName(profile.class || "");
        setBatch(profile.batch || "");
        setAvatarUrl(profile.avatar_url || "");
        console.log("Loaded existing profile:", profile);
      } else {
        console.log("No existing profile found");
      }
    } catch (error) {
      console.error("Error loading profile:", error);
      setAuthError("Failed to load profile data");
    } finally {
      setIsLoading(false);
    }
  };




  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter your name to continue.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error("No authenticated user found");
      }

      console.log("Saving profile for user:", user.id);

      // Check if profile already exists
      const { data: existingProfile, error: checkError } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .single();

      let error: any;

      if (existingProfile && !checkError) {
        console.log("Updating existing profile");
        // Update existing profile
        const { error: updateError } = await supabase
          .from("profiles")
          .update({
            name: name.trim(),
            gender: gender,
            class: className.trim(),
            batch: batch.trim(),
          })
          .eq("id", user.id);
        
        error = updateError;
      } else {
        console.log("Creating new profile");
        // Create new profile
        const { error: insertError } = await supabase
          .from("profiles")
          .insert({
            id: user.id,
            email: user.email!,
            name: name.trim(),
            gender: gender,
            class: className.trim(),
            batch: batch.trim(),
            hints_remaining: 3, // Default hints
          });
        
        error = insertError;
      }

      if (error) {
        console.error("Database error:", error);
        throw error;
      }

      console.log("Profile saved successfully");
      toast({
        title: existingProfile ? "Profile Updated!" : "Profile Created!",
        description: existingProfile ? "Your profile has been updated!" : "Welcome to CrushRadar! Ready to discover your matches.",
      });

      navigate("/discover");
    } catch (error: any) {
      console.error("Profile setup error:", error);
      toast({
        title: "Profile Setup Failed",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading state briefly
  if (isLoading && !name && !gender && !className && !batch) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <h3 className="text-lg font-semibold mb-2">Loading Profile...</h3>
          <p className="text-muted-foreground">Checking your account</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6 relative overflow-hidden">
      {/* Animated background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4"
          >
            <User className="w-8 h-8 text-primary" />
          </motion.div>

          <h1 className="text-2xl font-bold">
            {existingProfile ? "Edit Your Profile" : "Complete Your Profile"}
          </h1>
          <p className="text-muted-foreground mt-2">
            {existingProfile 
              ? "Update your information" 
              : "This helps others recognize you (only when mutual!)"
            }
          </p>
        </div>

        {/* Error Alert */}
        {authError && (
          <div className="mb-6 p-4 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-destructive" />
            <p className="text-sm text-destructive">{authError}</p>
          </div>
        )}

        {/* Profile Card */}
        <Card variant="glass" className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">



            {/* Avatar Upload */}
            <div className="flex justify-center">
              <AvatarUpload
                currentAvatarUrl={avatarUrl}
                onAvatarUpdate={setAvatarUrl}
                userId={currentUserId || existingProfile?.id || 'temp-user-id'}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Display Name *</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="name"
                  type="text"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-10 bg-secondary/50 border-border focus:border-primary"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="gender">Gender</Label>
              <Select value={gender} onValueChange={setGender}>
                <SelectTrigger className="bg-secondary/50 border-border">
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                  <SelectItem value="prefer-not">Prefer not to say</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="class">Class</Label>
                <div className="relative">
                  <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="class"
                    type="text"
                    placeholder="e.g. CS-A"
                    value={className}
                    onChange={(e) => setClassName(e.target.value)}
                    className="pl-10 bg-secondary/50 border-border focus:border-primary"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="batch">Batch</Label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="batch"
                    type="text"
                    placeholder="e.g. 2024"
                    value={batch}
                    onChange={(e) => setBatch(e.target.value)}
                    className="pl-10 bg-secondary/50 border-border focus:border-primary"
                  />
                </div>
              </div>
            </div>

            <Button
              type="submit"
              variant="glow"
              size="lg"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {existingProfile ? "Update Profile" : "Complete Setup"}
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </Button>
          </form>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Your profile is only visible to mutual matches
        </p>
      </motion.div>
    </div>
  );
};

export default ProfileSetup;
