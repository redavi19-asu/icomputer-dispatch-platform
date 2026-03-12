"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Phone } from "lucide-react";
import { CHARGENEXT_URLS } from "@/lib/constants";

export function FloatingEmergencyButton() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      setIsVisible(scrollTop > 400);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={isVisible ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="fixed bottom-6 right-6 z-40 flex items-center gap-3 sm:bottom-8 sm:right-8"
    >
      {/* Pill-style label */}
      <motion.a
        href={CHARGENEXT_URLS.whatsappEmergency}
        target="_blank"
        rel="noopener noreferrer"
        className="hidden sm:flex items-center gap-2 px-4 py-3 rounded-full bg-gradient-to-r from-cyan-400 to-sky-500 text-white font-semibold text-sm shadow-xl transition hover:shadow-2xl hover:scale-105"
        aria-label="Customer Service"
      >
        <span>Customer Service</span>
      </motion.a>

      {/* Circular icon button */}
      <motion.a
        href={CHARGENEXT_URLS.whatsappEmergency}
        target="_blank"
        rel="noopener noreferrer"
        className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-cyan-400 to-sky-500 text-white shadow-xl transition hover:shadow-2xl hover:scale-110 sm:h-16 sm:w-16"
        aria-label="Customer Service"
        whileHover={{ scale: 1.15 }}
      >
        <Phone className="h-6 w-6 sm:h-7 sm:w-7" />
      </motion.a>
    </motion.div>
  );
}
