"use client";

import { supabase } from "@/services/supabase";
import { motion } from "framer-motion";
import { Rocket } from "lucide-react";
import { useRouter } from "next/navigation";

export default function LandingPage() {
  const router = useRouter();
  const stars = Array.from({ length: 100 });

  const handleGetStarted = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session) {
      router.push("/transcribe");
    } else {
      router.push("/register");
    }
  };

  return (
    <div className="landing-page">
      <motion.h1
        className="title"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        Verba
      </motion.h1>

      <motion.p
        className="subtitle"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.6 }}
      >
        AI-powered live transcription for lectures, meetings & discussions.
      </motion.p>

      <motion.button
        type="button"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="cta-button"
        onClick={handleGetStarted}
      >
        <Rocket size={18} />
        <span style={{ marginLeft: "8px" }}>Get Started</span>
      </motion.button>
    </div>
  );
}
