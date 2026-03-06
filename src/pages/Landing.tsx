import { motion } from "framer-motion";
import { Heart, Shield, Eye, EyeOff, Sparkles, Users, Lock, Zap, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/hooks/useAuth";
import { useEffect } from "react";

const Landing = () => {
  const navigate = useNavigate();
  const { user, initialized } = useAuthStore();
  
  // Redirect authenticated users to discover
  useEffect(() => {
    if (initialized && user) {
      navigate("/discover", { replace: true });
    }
  }, [user, initialized, navigate]);

  const features = [
    {
      icon: EyeOff,
      title: "100% Anonymous",
      description: "Your crushes stay secret until they're mutual. No one can see who liked them.",
    },
    {
      icon: Shield,
      title: "Privacy First",
      description: "Minimal data storage. Your secrets are safe with military-grade encryption.",
    },
    {
      icon: Heart,
      title: "Mutual Matches Only",
      description: "A match is revealed only when both users select each other. No stalking.",
    },
    {
      icon: Zap,
      title: "Instant Reveal",
      description: "The moment you match, you'll both know. Magic happens in real-time.",
    },
  ];

  const howItWorks = [
    { step: "01", title: "Sign Up", description: "Create your anonymous profile in seconds" },
    { step: "02", title: "Discover", description: "Browse people from your community" },
    { step: "03", title: "Select Crush", description: "Tap to secretly mark your crush" },
    { step: "04", title: "Match!", description: "Both select each other? It's a match!" },
  ];

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Header */}
      <header className="relative z-10">
        <nav className="container mx-auto px-4 md:px-6 py-4 md:py-6 flex items-center justify-between">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            <div className="relative w-10 h-10 md:w-12 md:h-12 rounded-lg overflow-hidden">
              <img 
                src="/sp.jpg" 
                alt="CrushRadar Logo" 
                className="w-full h-full object-contain"
              />
            </div>
            <span className="text-xl font-bold">CrushRadar</span>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2 md:gap-3 pr-2"
          >
            <Button 
              variant="ghost" 
              onClick={() => navigate("/auth")}
              className="text-muted-foreground hover:text-foreground hover:bg-white/5 text-sm px-2 md:px-3"
            >
              Login
            </Button>
            <Button 
              variant="glow" 
              onClick={() => navigate("/auth")}
              className="btn-gradient text-sm md:text-base"
              style={{ 
                width: '140px', 
                padding: '8px 12px', 
                fontSize: '14px', 
                textAlign: 'center',
                borderRadius: '20px' 
              }}
            >
              Get Started
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </motion.div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 container mx-auto px-4 md:px-6 pt-12 md:pt-20 pb-24 md:pb-32">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-6 md:mb-8">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm text-primary font-medium">Discover mutual connections secretly</span>
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl md:text-6xl lg:text-7xl font-bold mb-4 md:mb-6 leading-tight"
          >
            Your crush might
            <br />
            <span className="text-foreground">like you too</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg md:text-xl text-muted-foreground mb-8 md:mb-10 max-w-2xl mx-auto"
          >
            The privacy-first mutual crush detection app. Select your crushes anonymously. 
            Only reveal when it's mutual.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3 md:gap-4"
          >
            <Button 
              variant="glow" 
              size="xl" 
              onClick={() => navigate("/auth")} 
              className="w-full sm:w-auto btn-gradient text-base md:text-lg px-6 md:px-8"
            >
              <Heart className="w-5 h-5 mr-2" />
              Start Finding Matches
            </Button>

            <Button 
              variant="glass" 
              size="xl" 
              className="w-full sm:w-auto text-base md:text-lg px-6 md:px-8"
              onClick={() => {
                const howItWorksSection = document.getElementById('how-it-works');
                if (howItWorksSection) {
                  howItWorksSection.scrollIntoView({ behavior: 'smooth' });
                }
              }}
            >
              <Eye className="w-5 h-5 mr-2" />
              How It Works
            </Button>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex items-center justify-center gap-6 md:gap-12 mt-12 md:mt-16"
          >
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-primary">100%</div>
              <div className="text-sm text-muted-foreground">Anonymous</div>
            </div>
            <div className="w-px h-10 bg-white/10" />
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-primary">0</div>
              <div className="text-sm text-muted-foreground">Data Leaks</div>
            </div>
            <div className="w-px h-10 bg-white/10 hidden sm:block" />
            <div className="text-center hidden sm:block">
              <div className="text-3xl md:text-4xl font-bold text-primary">∞</div>
              <div className="text-sm text-muted-foreground">Possibilities</div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative z-10 container mx-auto px-4 md:px-6 py-16 md:py-24">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mb-12 md:mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Built for Privacy</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            We take your privacy seriously. Here's how we keep your crushes secret.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              <Card variant="glass" className="p-5 md:p-6 h-full">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>


      {/* How It Works Section */}
      <section id="how-it-works" className="relative z-10 container mx-auto px-4 md:px-6 py-16 md:py-24">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mb-12 md:mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">How It Works</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Four simple steps to find your match. No complications, just connections.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
          {howItWorks.map((item, index) => (
            <motion.div
              key={item.step}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.15 }}
              className="relative text-center"
            >
              <div className="text-6xl md:text-7xl font-bold text-primary/10 mb-2">{item.step}</div>
              <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
              <p className="text-sm text-muted-foreground">{item.description}</p>
              {index < howItWorks.length - 1 && (
                <div className="hidden md:block absolute top-8 -right-4 w-8 h-0.5 bg-gradient-to-r from-primary/50 to-transparent" />
              )}
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 container mx-auto px-4 md:px-6 py-16 md:py-24">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
        >
          <Card className="p-8 md:p-12 text-center relative overflow-hidden">
            <div className="relative z-10">
              <Lock className="w-10 h-10 md:w-12 md:h-12 text-primary mx-auto mb-4 md:mb-6" />
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Ready to Find Your Match?
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto mb-6 md:mb-8">
                Join thousands of users who've found their mutual crushes without the awkwardness.
              </p>
              <Button 
                size="xl" 
                onClick={() => navigate("/auth")}
                className="text-base md:text-lg px-8"
              >
                <Heart className="w-5 h-5 mr-2" />
                Get Started Free
              </Button>
            </div>
          </Card>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10">
        <div className="container mx-auto px-4 md:px-6 py-6 md:py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img 
                src="/sp.jpg" 
                alt="CrushRadar Logo" 
                className="w-6 h-6 object-contain"
              />
              <span className="font-semibold">CrushRadar</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2025 CrushRadar. successfully developed by Manish Mainali and Anoj Dangi. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;

