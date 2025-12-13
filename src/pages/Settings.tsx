
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { User, Camera, GraduationCap, Users, Save, LogOut, Trash2, Loader2, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import AvatarUpload from "@/components/AvatarUpload";
import { supabase } from "@/lib/supabase";

const Settings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const [name, setName] = useState("");
  const [gender, setGender] = useState("");
  const [className, setClassName] = useState("");
  const [batch, setBatch] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [hintsRemaining, setHintsRemaining] = useState(3);
  const [currentUserId, setCurrentUserId] = useState<string>("");

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      

      if (userError || !user) {
        throw new Error("No authenticated user found");
      }

      setCurrentUserId(user.id);

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profile && !error) {
        setName(profile.name || "");
        setGender(profile.gender || "");
        setClassName(profile.class || "");
        setBatch(profile.batch || "");
        setAvatarUrl(profile.avatar_url || "");
        setHintsRemaining(profile.hints_remaining || 3);
      }
    } catch (error) {
      console.error("Error loading profile:", error);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error("No authenticated user found");
      }

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          name: name,
          gender: gender,
          class: className,
          batch: batch,
        })
        .eq("id", user.id);

      if (updateError) {
        throw updateError;
      }

      setIsLoading(false);
      toast({
        title: "Profile Updated",
        description: "Your changes have been saved to the database.",
      });
    } catch (error: any) {
      console.error("Error updating profile:", error);
      setIsLoading(false);
      toast({
        title: "Update Failed",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: "Logged Out",
        description: "You have been signed out.",
      });
      navigate("/");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };



  const handleAvatarUpdate = (newAvatarUrl: string) => {
    setAvatarUrl(newAvatarUrl);
    // Avatar URL is already updated in the database by AvatarUpload component
  };

  const handleDeleteAccount = () => {
    toast({
      title: "Account Deletion",
      description: "This feature requires backend integration.",
      variant: "destructive",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Animated background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <main className="relative z-10 container mx-auto px-6 py-8 max-w-2xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <User className="w-6 h-6 text-primary" />
            <h1 className="text-3xl font-bold">Settings</h1>
          </div>
          <p className="text-muted-foreground">
            Manage your profile and account preferences.
          </p>
        </motion.div>

        {/* Edit Profile Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card variant="glass" className="p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              Edit Profile
            </h2>

            <form onSubmit={handleSaveProfile} className="space-y-6">

              {/* Avatar Upload */}
              <div className="flex justify-center">

                <AvatarUpload
                  currentAvatarUrl={avatarUrl}
                  onAvatarUpdate={handleAvatarUpdate}
                  userId={currentUserId}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Display Name</Label>
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
                    <Save className="w-5 h-5" />
                    Save Changes
                  </>
                )}
              </Button>
            </form>
          </Card>
        </motion.div>

        {/* Privacy Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card variant="glass" className="p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Privacy & Security
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Your crushes are 100% anonymous. No one can see who you've selected unless it's mutual.
            </p>
            <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/50">
              <div>
                <p className="font-medium">Hints Remaining</p>
                <p className="text-sm text-muted-foreground">Use hints to get clues about potential matches</p>
              </div>
              <div className="text-2xl font-bold text-primary">{hintsRemaining}</div>
            </div>
          </Card>
        </motion.div>

        {/* Account Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card variant="glass" className="p-6">
            <h2 className="text-lg font-semibold mb-4">Account Actions</h2>
            
            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={handleLogout}
              >
                <LogOut className="w-5 h-5 mr-2" />
                Sign Out
              </Button>

              <Separator />

              <Button
                variant="outline"
                className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={handleDeleteAccount}
              >
                <Trash2 className="w-5 h-5 mr-2" />
                Delete Account
              </Button>
              <p className="text-xs text-muted-foreground">
                This will permanently delete your account, all crushes, and matches.
              </p>
            </div>
          </Card>
        </motion.div>
      </main>
    </div>
  );
};

export default Settings;
