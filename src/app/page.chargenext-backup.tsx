"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import { useRef, useState, useEffect } from "react";
import { motion, useScroll, useSpring, useTransform } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { Zap, Plug, Car, MapPin, Smartphone, ShieldCheck, Menu, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { BatteryMeter } from "@/components/ui/battery-meter";
import { FloatingEmergencyButton } from "@/components/ui/floating-button";
import { StepOneMap } from "@/components/step-one-map";
import { CHARGENEXT_URLS } from "@/lib/constants";
import { startEmergencyCharge } from "@/lib/checkout";

const googleMapsEmbedUrl =
  "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3105.001839478255!2d-77.0368703!3d38.9071923!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x89b7b7bcdf572b1f%3A0xefbdfd5714d0c857!2sWashington%2C%20DC!5e0!3m2!1sen!2sus!4v1730590800000!5m2!1sen!2sus";

type SectionProps = {
  children: ReactNode;
  className?: string;
  id?: string;
};

const Section = ({ children, className = "", id }: SectionProps) => (
  <section id={id} className={`relative w-full ${className}`}>{children}</section>
);

type StickyProps = {
  children: ReactNode;
  className?: string;
  innerClass?: string;
};

const Sticky = ({ children, className = "", innerClass = "" }: StickyProps) => (
  <div
    className={`relative lg:sticky lg:top-0 min-h-[100dvh] lg:h-[100vh] flex items-start lg:items-center pt-[calc(env(safe-area-inset-top)+7rem)] lg:pt-0 pb-8 lg:pb-0 ${className}`}
  >
    <div className={`w-full ${innerClass}`}>{children}</div>
  </div>
);

function ProgressBar() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 25,
    mass: 0.4,
  });

  return (
    <motion.div
      className="fixed left-0 top-0 z-50 h-1 w-full origin-left"
      style={{ scaleX }}
    >
      <div className="h-full w-full bg-gradient-to-r from-cyan-400 via-sky-500 to-blue-600" />
    </motion.div>
  );
}

function Hero() {
  const ref = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [0, -150]);
  const opacity = useTransform(scrollYProgress, [0, 0.6, 1], [1, 1, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 0.95]);

  return (
    <Section className="bg-black text-white overflow-hidden">
      <div ref={ref} className="relative h-[160vh]" style={{ position: "relative" }}>
        <Sticky className="bg-[radial-gradient(ellipse_80%_60%_at_50%_40%,rgba(34,211,238,0.08),rgba(0,0,0,0)_70%)]">
          <motion.div
            style={{ y, opacity, scale }}
            className="mx-auto max-w-6xl px-6 text-center"
          >
            {/* ===== CINEMATIC HERO COLLISION SEQUENCE ===== */}
            <div className="mb-8 sm:mb-12 md:mb-16 flex items-center justify-center relative h-52 sm:h-64 md:h-72 lg:h-96 overflow-visible lg:overflow-hidden pt-2 sm:pt-3 pointer-events-none">
              
              {/* ===== CENTER ENERGY CORE - Pre-impact pulse ===== */}
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20"
              >
                <motion.div
                  animate={{ scale: [1, 1.08, 1] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  className="core-pulse relative"
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "50%",
                    background: "radial-gradient(circle, rgba(34, 211, 238, 0.9) 0%, rgba(56, 189, 248, 0.4) 100%)",
                    backdropFilter: "blur(2px)",
                  }}
                />
              </motion.div>

              {/* ===== LIGHTNING ARC LINES - Strike on collision ===== */}
              <motion.svg
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 0.6, 0] }}
                transition={{ duration: 0.7, delay: 1.3, ease: "easeOut" }}
                className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 pointer-events-none z-15"
                viewBox="0 0 400 400"
              >
                {/* Vertical lightning strike */}
                <motion.line
                  x1="200"
                  y1="50"
                  x2="200"
                  y2="350"
                  stroke="rgba(34, 211, 238, 0.8)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  filter="drop-shadow(0 0 10px rgba(34, 211, 238, 0.6))"
                  animate={{ strokeDashoffset: [1000, 0, 0] }}
                  transition={{ duration: 0.5, delay: 1.3 }}
                  strokeDasharray="1000"
                />
                {/* Diagonal arc left */}
                <motion.path
                  d="M 200 200 Q 100 150, 80 100"
                  stroke="rgba(56, 189, 248, 0.7)"
                  strokeWidth="2"
                  fill="none"
                  strokeLinecap="round"
                  filter="drop-shadow(0 0 8px rgba(56, 189, 248, 0.5))"
                  animate={{ strokeDashoffset: [800, 0] }}
                  transition={{ duration: 0.5, delay: 1.35 }}
                  strokeDasharray="800"
                />
                {/* Diagonal arc right */}
                <motion.path
                  d="M 200 200 Q 300 150, 320 100"
                  stroke="rgba(56, 189, 248, 0.7)"
                  strokeWidth="2"
                  fill="none"
                  strokeLinecap="round"
                  filter="drop-shadow(0 0 8px rgba(56, 189, 248, 0.5))"
                  animate={{ strokeDashoffset: [800, 0] }}
                  transition={{ duration: 0.5, delay: 1.35 }}
                  strokeDasharray="800"
                />
              </motion.svg>

              {/* ===== SCREEN FLASH OVERLAY - Blinding impact ===== */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 0.5, 0] }}
                transition={{ duration: 0.6, delay: 1.35, ease: "easeOut" }}
                className="absolute inset-0 bg-white/70 pointer-events-none z-40"
              />

              {/* ===== SHOCKWAVE RING - Expanding circle ===== */}
              <motion.div
                initial={{ scale: 0.1, opacity: 1 }}
                animate={{ scale: [0.1, 2.8, 3.5], opacity: [1, 0.5, 0] }}
                transition={{ duration: 0.9, delay: 1.3, ease: "easeOut" }}
                className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-18"
              >
                <div
                  className="rounded-full border-2 border-cyan-400"
                  style={{
                    width: "120px",
                    height: "120px",
                    boxShadow: "0 0 30px rgba(34, 211, 238, 0.6)",
                  }}
                />
              </motion.div>

              {/* ===== ELECTRIC BURST GLOW - Radiant energy ===== */}
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: [0.5, 2, 3], opacity: [0, 1, 0] }}
                transition={{ duration: 0.8, delay: 1.32, ease: "easeOut" }}
                className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-17"
              >
                <div
                  className="rounded-full blur-3xl"
                  style={{
                    width: "300px",
                    height: "300px",
                    background: "radial-gradient(circle, rgba(34, 211, 238, 0.6) 0%, rgba(56, 189, 248, 0.3) 50%, transparent 100%)",
                  }}
                />
              </motion.div>

              {/* ===== PARTICLE BURST - Sparks scatter ===== */}
              {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
                const angle = (i / 8) * Math.PI * 2;
                const distance = 280;
                const tx = Math.cos(angle) * distance;
                const ty = Math.sin(angle) * distance;
                return (
                  <motion.div
                    key={`particle-${i}`}
                    initial={{ x: 0, y: 0, opacity: 0, scale: 1 }}
                    animate={{ x: tx, y: ty, opacity: [1, 0], scale: [1, 0] }}
                    transition={{ duration: 1, delay: 1.35, ease: "easeOut" }}
                    className="absolute top-1/2 left-1/2 w-3 h-3 rounded-full pointer-events-none z-25"
                    style={{
                      background: "radial-gradient(circle, rgba(34, 211, 238, 1) 0%, rgba(56, 189, 248, 0.5) 100%)",
                      boxShadow: "0 0 12px rgba(34, 211, 238, 0.8)",
                      marginLeft: "-6px",
                      marginTop: "-6px",
                    }}
                  />
                );
              })}

              {/* ===== RESIDUAL GLOW AURA - Lingers after impact ===== */}
              <motion.div
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: [0, 1, 0.2], scale: [0.6, 1.5, 2] }}
                transition={{ duration: 2, delay: 1.35, ease: "easeOut" }}
                className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none z-14"
              >
                <div
                  className="rounded-full blur-3xl"
                  style={{
                    width: "500px",
                    height: "500px",
                    background: "radial-gradient(circle, rgba(34, 211, 238, 0.25) 0%, rgba(56, 189, 248, 0.1) 40%, transparent 100%)",
                  }}
                />
              </motion.div>

              {/* ===== LEFT TEXT - "Charge" ===== */}
              <motion.div
                initial={{ x: -800, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{
                  duration: 1.3,
                  ease: "easeIn",
                  type: "tween",
                }}
                className="relative flex-shrink-0 z-30"
              >
                <h1 className="font-orbitron text-5xl sm:text-6xl md:text-8xl lg:text-[10rem] font-black tracking-tighter sm:tracking-tight text-white drop-shadow-2xl"
                  style={{
                    textShadow: "0 0 30px rgba(34, 211, 238, 0.3), 0 0 60px rgba(56, 189, 248, 0.1)",
                    lineHeight: "1.1",
                  }}
                >
                  Charge
                </h1>
              </motion.div>

              {/* ===== RIGHT TEXT - "Next" ===== */}
              <motion.div
                initial={{ x: 800, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{
                  duration: 1.3,
                  ease: "easeIn",
                  type: "tween",
                }}
                className="relative flex-shrink-0 z-30"
              >
                <motion.h1
                  className="font-orbitron text-5xl sm:text-6xl md:text-8xl lg:text-[10rem] font-black tracking-tighter sm:tracking-tight bg-gradient-to-r from-cyan-200 via-cyan-300 to-sky-400 bg-clip-text text-transparent drop-shadow-2xl text-electric-shimmer idle-glow"
                  animate={{ scale: [0.95, 1] }}
                  transition={{ duration: 0.2, delay: 1.3 }}
                  style={{
                    lineHeight: "1.1",
                  }}
                >
                  Next
                </motion.h1>
              </motion.div>

              {/* ===== POST-COLLISION GLOW AROUND LOGO ===== */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: [0, 0.6, 0.2], scale: [0.8, 1.2, 1.1] }}
                transition={{ duration: 1.5, delay: 1.5, ease: "easeOut" }}
                className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10 post-collision-pulse"
                style={{
                  width: "600px",
                  height: "200px",
                }}
              >
                <div
                  className="w-full h-full rounded-full blur-2xl"
                  style={{
                    background: "radial-gradient(ellipse, rgba(34, 211, 238, 0.3) 0%, transparent 70%)",
                  }}
                />
              </motion.div>
            </div>

            {/* ===== CTA AND DESCRIPTION SECTION ===== */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 2.2 }}
              className="mt-10"
            >
              <div className="wa-alert-banner mx-auto mb-5 w-full max-w-[760px] rounded-2xl border border-amber-300/60 bg-gradient-to-r from-amber-100 to-yellow-100 px-4 py-3 text-center shadow-lg">
                <h3 className="text-sm font-semibold text-amber-900 sm:text-base">
                  ⚠️ Emergency Requests Use WhatsApp
                </h3>
                <p className="mt-1 text-xs text-amber-900/90 sm:text-[13px]">
                  Fastest way to share your exact location so we can navigate to you.
                </p>

                <div className="mt-3 flex flex-col items-center justify-center gap-2 sm:flex-row">
                  <a
                    href="https://apps.apple.com/app/whatsapp-messenger/id310633997"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-8 w-full items-center justify-center rounded-lg border border-amber-400 bg-white/80 px-3 text-xs font-semibold text-amber-900 transition hover:bg-white sm:w-auto"
                  >
                    Get WhatsApp (iPhone)
                  </a>
                  <a
                    href="https://play.google.com/store/apps/details?id=com.whatsapp"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-8 w-full items-center justify-center rounded-lg border border-amber-400 bg-white/80 px-3 text-xs font-semibold text-amber-900 transition hover:bg-white sm:w-auto"
                  >
                    Get WhatsApp (Android)
                  </a>
                </div>

                <p className="mt-2 text-xs text-amber-900/80">
                  Already have WhatsApp? Tap Emergency Charge Now.
                </p>
                <p className="mt-0.5 text-xs font-medium text-amber-900">
                  No WhatsApp? Call/Text: (###) ###-####
                </p>
              </div>

              <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm backdrop-blur-sm border border-cyan-500/20">
                <Zap className="h-4 w-4 text-cyan-300 animate-pulse" />
                <span className="text-white/90">Emergency EV Charging • On Demand</span>
              </div>
              
              <p className="mx-auto max-w-3xl text-2xl md:text-3xl font-orbitron font-bold text-white drop-shadow-lg mb-4">
                <span className="bg-gradient-to-r from-cyan-200 to-sky-400 bg-clip-text text-transparent">
                  Power When You Need It Most
                </span>
              </p>
              
              <p className="mx-auto max-w-2xl text-lg text-white/80 md:text-xl mb-6">
                Mobile EV charging that comes to you — anywhere in the DMV region
              </p>
              <p className="mx-auto max-w-2xl text-base text-white/70 md:text-lg">
                Real-time dispatch • Secure payment • Live tracking • Minutes, not hours
              </p>

              {/* ===== HERO CTA BUTTONS ===== */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 2.5 }}
                className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row flex-wrap"
              >
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    className="rounded-xl px-8 py-6 text-base font-semibold bg-gradient-to-r from-cyan-500 to-sky-600 hover:from-cyan-400 hover:to-sky-500 shadow-lg shadow-cyan-500/50 transition-all"
                    onClick={startEmergencyCharge}
                  >
                    🚨 Emergency Charge Now
                  </Button>
                </motion.div>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    variant="secondary"
                    className="rounded-xl px-8 py-6 text-base font-semibold bg-white/15 text-white border border-cyan-400/40 hover:bg-white/25 hover:border-cyan-400/60 transition-all backdrop-blur-sm"
                    onClick={() => window.dispatchEvent(new CustomEvent("openChargeModal"))}
                  >
                    📅 Schedule a Charge
                  </Button>
                </motion.div>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    variant="secondary"
                    className="rounded-xl px-8 py-6 text-base font-semibold bg-white/15 text-white border border-cyan-400/40 hover:bg-white/25 hover:border-cyan-400/60 transition-all backdrop-blur-sm"
                    onClick={() => {
                      const pricingElement = document.getElementById("pricing");
                      pricingElement?.scrollIntoView({ behavior: "smooth" });
                    }}
                  >
                    💰 View Service Tiers
                  </Button>
                </motion.div>
              </motion.div>
            </motion.div>
          </motion.div>
        </Sticky>
      </div>
    </Section>
  );
}

type StoryPanelProps = {
  id?: string;
  step: number;
  title: string;
  subtitle: string;
  icon?: LucideIcon;
  image?: string;
  media?: ReactNode;
  invert?: boolean;
};

function StoryPanel({ id, step, title, subtitle, icon: Icon, image, media, invert }: StoryPanelProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const yImg = useTransform(scrollYProgress, [0, 1], [60, -60]);
  const yTxt = useTransform(scrollYProgress, [0, 1], [-20, 20]);
  const opacity = useTransform(scrollYProgress, [0, 0.25, 0.75, 1], [0, 1, 1, 0]);

  return (
    <Section id={id} className="bg-white">
      <div ref={ref} className="relative mx-auto max-w-6xl px-6 py-24 md:py-36">
        <div className={`grid items-center gap-10 md:grid-cols-2 ${invert ? "md:[&>*:first-child]:order-2" : ""}`}>
          <motion.div style={{ y: yTxt, opacity }}>
            <div className="mb-4 inline-flex items-center gap-2 text-sm text-sky-700">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-sky-100 font-semibold text-sky-700">
                {step}
              </span>
              <span className="uppercase tracking-wide">Step {step}</span>
            </div>
            <h2 className="flex items-center gap-3 text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
              {Icon ? <Icon className="h-8 w-8 text-sky-500" /> : null} {title}
            </h2>
            <p className="mt-4 text-lg text-slate-600">{subtitle}</p>
          </motion.div>

          <motion.div style={{ y: yImg, opacity }} className="relative">
            <div className="absolute inset-0 -z-10 rounded-3xl bg-gradient-to-br from-sky-100 to-transparent opacity-70 blur-2xl" />
            <div className="relative w-full overflow-hidden rounded-3xl shadow-2xl ring-1 ring-black/5">
              {media ??
                (image ? (
                  <Image
                    src={image}
                    alt={title}
                    width={1280}
                    height={960}
                    className="h-auto w-full object-cover"
                    loading="lazy"
                    sizes="(min-width: 1024px) 600px, (min-width: 768px) 80vw, 100vw"
                  />
                ) : null)}
            </div>
          </motion.div>
        </div>
      </div>
    </Section>
  );
}

function Features() {
  const features = [
    { icon: MapPin, title: "DMV Coverage", text: "We come to you — DC, Maryland, Virginia." },
    { icon: Smartphone, title: "Live ETA & Updates", text: "Track arrival, contact driver, update location." },
    { icon: ShieldCheck, title: "Safe & Insured", text: "Vetted techs. Secure payments. Serious about safety." },
    { icon: Plug, title: "Multiple Connectors", text: "Adapters for popular EVs and charging standards." },
  ];

  return (
    <Section id="features" className="bg-slate-50">
      <div className="mx-auto max-w-6xl px-6 py-24 md:py-32">
        <div className="mx-auto max-w-2xl text-center">
          <h3 className="text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">Built for reliability</h3>
          <p className="mt-3 text-slate-600">No drama. Just power when you need it most.</p>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ y: 20, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true, amount: 0.6 }}
              transition={{ duration: 0.5, delay: index * 0.08 }}
            >
              <Card className="rounded-2xl shadow-sm transition-shadow hover:shadow-md">
                <CardContent className="p-6">
                  <feature.icon className="h-8 w-8 text-sky-600" />
                  <h4 className="mt-4 font-semibold text-slate-900">{feature.title}</h4>
                  <p className="mt-2 text-sm text-slate-600">{feature.text}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </Section>
  );
}

function Pricing() {
  const pricingTiers = [
    {
      id: "emergency-boost",
      name: "Emergency Boost",
      price: "$59",
      priceNote: "per session",
      description: "For immediate assistance",
      bullets: [
        "Dispatch within standard hours",
        "Live ETA and updates",
        "Adapter included",
      ],
      caution: null,
      isEmergency: true,
      bgColor: "bg-red-50",
      borderColor: "border-red-200",
      accentColor: "text-red-600",
    },
    {
      id: "extended-boost",
      name: "Extended Boost",
      price: "$89",
      priceNote: "per session",
      description: "Extra range for longer drives",
      bullets: [
        "Up to 60 minutes charging",
        "Live tracking included",
        "Ideal for continuing your trip",
        "All connectors available",
      ],
      caution: null,
      isEmergency: false,
      bgColor: "bg-orange-50",
      borderColor: "border-orange-200",
      accentColor: "text-orange-600",
    },
    {
      id: "full-charge-session",
      name: "Full Charge Session",
      price: "$129",
      priceNote: "per session",
      description: "Scheduled charging service",
      bullets: [
        "Up to 2–3 hours charging",
        "Best for home or work",
        "Scheduled convenience",
        "Real-time monitoring",
      ],
      caution: "⚠ Charging time depends on vehicle battery size.",
      isEmergency: false,
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200",
      accentColor: "text-blue-600",
    },
    {
      id: "pull-up-boost",
      name: "Pull-Up Boost",
      price: "Starting at $25",
      priceNote: "per session",
      description: "Quick boost while you wait",
      bullets: [
        "10–20 mile quick boost",
        "15–20 minute session",
        "Perfect for top-ups",
        "Available when our truck is nearby",
      ],
      caution: null,
      isEmergency: false,
      bgColor: "bg-green-50",
      borderColor: "border-green-200",
      accentColor: "text-green-600",
    },
    {
      id: "fleet-services",
      name: "Fleet Services",
      price: "Custom Quote",
      priceNote: "Contact for details",
      description: "For multiple vehicles",
      bullets: [
        "Bulk service discounts",
        "Dedicated support",
        "Flexible scheduling",
        "Invoice billing available",
      ],
      caution: null,
      isEmergency: false,
      bgColor: "bg-purple-50",
      borderColor: "border-purple-200",
      accentColor: "text-purple-600",
    },
  ];

  return (
    <Section id="pricing" className="bg-white">
      <div className="mx-auto max-w-7xl px-6 py-24 md:py-36">
        <div className="mb-16 text-center">
          <h3 className="text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
            Simple, transparent pricing
          </h3>
          <p className="mt-3 text-slate-600">Pay once dispatch is confirmed — no hidden fees.</p>
        </div>
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:gap-8">
          {pricingTiers.map((tier, index) => (
            <motion.div
              key={tier.id}
              initial={{ y: 20, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true, amount: 0.6 }}
              transition={{ duration: 0.5, delay: index * 0.08 }}
            >
              <Card className={`rounded-2xl h-full shadow-md transition-all hover:shadow-lg border-2 ${tier.borderColor} ${tier.bgColor}`}>
                <CardContent className="p-6 flex flex-col h-full">
                  <div className="flex-1">
                    <div className={`inline-block rounded-lg px-3 py-1 text-xs font-semibold ${tier.accentColor} bg-white/60`}>
                      {tier.description}
                    </div>
                    <h4 className="mt-4 text-2xl font-bold text-slate-900">{tier.name}</h4>
                    
                    <div className="mt-4 flex items-baseline gap-2">
                      <span className="text-3xl font-bold tracking-tight text-slate-900">
                        {tier.price}
                      </span>
                      {tier.priceNote && (
                        <span className="text-sm text-slate-600">{tier.priceNote}</span>
                      )}
                    </div>
                    
                    <ul className="mt-6 space-y-3">
                      {tier.bullets.map((bullet, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <div className={`mt-1 rounded-full ${tier.accentColor} bg-white/70 flex-shrink-0`}>
                            <svg className="h-4 w-4 p-0.5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <span className="text-sm text-slate-700">{bullet}</span>
                        </li>
                      ))}
                    </ul>

                    {tier.caution && (
                      <p className="mt-4 text-xs text-slate-600 italic">{tier.caution}</p>
                    )}
                  </div>
                  
                  <div className="mt-8 pt-6 border-t border-slate-200">
                    {tier.isEmergency ? (
                      <>
                        <Button
                          onClick={startEmergencyCharge}
                          className="cta-btn cta-btn--danger"
                        >
                          Emergency Charge Now
                        </Button>
                        <p className="mt-2 text-xs text-slate-600">
                          Instant checkout and driver dispatch
                        </p>
                      </>
                    ) : tier.id === "pull-up-boost" ? (
                      <Button
                        variant="secondary"
                        className="cta-btn cta-btn--blue"
                        onClick={() => window.dispatchEvent(new CustomEvent("openPullUpCheckIn"))}
                      >
                        I&apos;m Here Now
                      </Button>
                    ) : (
                      <Button 
                        variant="secondary"
                        className="cta-btn cta-btn--blue"
                        onClick={() => window.dispatchEvent(new CustomEvent('openChargeModal', { detail: { tier: tier.id, tierName: tier.name } }))}
                      >
                        Request {tier.name}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-sm text-slate-500">
            Pricing may vary depending on distance, vehicle type, battery size, and service time.
          </p>
        </div>
      </div>
    </Section>
  );
}

function FinalCTA() {
  return (
    <Section className="bg-slate-900 text-white">
      <div className="mx-auto max-w-4xl px-6 py-24 text-center md:py-32">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-4xl font-bold tracking-tight md:text-5xl">
            Ready when you need power
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-300">
            Get emergency EV charging fast through WhatsApp, or schedule a non-emergency charge using our request form.
          </p>
          
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button
              onClick={startEmergencyCharge}
              className="rounded-2xl px-8 py-6 text-base font-semibold"
            >
              Emergency Request
            </Button>
            <Button
              variant="secondary"
              className="rounded-2xl px-8 py-6 text-base font-semibold bg-white/10 text-white transition hover:bg-white/20"
              onClick={() => window.dispatchEvent(new CustomEvent('openChargeModal'))}
            >
              Schedule a Charge
            </Button>
          </div>
        </motion.div>
      </div>
    </Section>
  );
}

function CTA() {
  return (
    <Section className="bg-black text-white">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-24 md:grid-cols-2 md:py-36">
        <div>
          <h3 className="text-3xl font-semibold tracking-tight md:text-4xl">Ready when you are.</h3>
          <p className="mt-3 max-w-xl text-white/80">
            Book a mobile charge in under a minute. We&apos;ll meet you where you are — parking lot, roadside, or driveway.
          </p>
          <div className="mt-6 flex gap-3">
            <Button className="rounded-2xl px-6 py-6 text-base">Book a Charge</Button>
            <Button
              variant="secondary"
              className="rounded-2xl px-6 py-6 text-base bg-white/10 text-white transition hover:bg-white/20"
            >
              See coverage
            </Button>
          </div>
        </div>
        <div className="relative w-full overflow-hidden rounded-3xl shadow-2xl ring-1 ring-white/10">
          <Image
            src="https://images.unsplash.com/photo-1593941707882-a5bba14938c7?auto=format&fit=crop&w=1600&q=80"
            alt="EV charging at night"
            width={1280}
            height={960}
            className="h-auto w-full object-cover"
            loading="lazy"
            sizes="(min-width: 1024px) 600px, (min-width: 768px) 80vw, 100vw"
          />
        </div>
      </div>
    </Section>
  );
}

type MobileMenuProps = {
  onSchedule: () => void;
};

function MobileMenu({ onSchedule }: MobileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  const closeMenu = () => setIsOpen(false);

  return (
    <div className="fixed right-4 top-4 z-[60] lg:hidden">
      <button
        type="button"
        aria-label={isOpen ? "Close menu" : "Open menu"}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
        className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-cyan-300/40 bg-black/65 text-white backdrop-blur-md"
      >
        {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {isOpen ? (
        <div className="mt-3 w-[260px] rounded-2xl border border-cyan-300/30 bg-slate-950/95 p-4 text-white shadow-2xl backdrop-blur-xl">
          <nav className="space-y-2 text-sm">
            <a href="#top" onClick={closeMenu} className="block rounded-lg px-3 py-2 transition hover:bg-white/10">Home</a>
            <a href="#how-it-works" onClick={closeMenu} className="block rounded-lg px-3 py-2 transition hover:bg-white/10">How it works</a>
            <a href="#features" onClick={closeMenu} className="block rounded-lg px-3 py-2 transition hover:bg-white/10">Features</a>
            <a href="#pricing" onClick={closeMenu} className="block rounded-lg px-3 py-2 transition hover:bg-white/10">Pricing</a>
          </nav>

          <div className="mt-4 space-y-2 border-t border-white/15 pt-4">
            <Button
              onClick={() => {
                startEmergencyCharge();
                closeMenu();
              }}
              className="inline-flex w-full items-center justify-center rounded-lg bg-gradient-to-r from-cyan-500 to-sky-600 px-4 py-2 text-sm font-semibold text-white"
            >
              Emergency
            </Button>
            <Button
              variant="secondary"
              className="w-full rounded-lg border border-cyan-300/40 bg-white/10 text-sm font-semibold text-white transition hover:bg-white/20"
              onClick={() => {
                onSchedule();
                closeMenu();
              }}
            >
              Schedule
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function Home() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPullUpModalOpen, setIsPullUpModalOpen] = useState(false);
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [gpsLatitude, setGpsLatitude] = useState("");
  const [gpsLongitude, setGpsLongitude] = useState("");
  const [gpsAccuracy, setGpsAccuracy] = useState("");
  const [gpsMapsLink, setGpsMapsLink] = useState("");
  const [gpsDetected, setGpsDetected] = useState(false);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get('paid') === '1') {
      alert('Payment received. We are now dispatching a driver.');
    }
  }, []);

  useEffect(() => {
    const handleOpenModal = (event: Event) => {
      const customEvent = event as CustomEvent;
      setSelectedTier(customEvent.detail?.tier || null);
      setIsPullUpModalOpen(false);
      setIsModalOpen(true);

      setGpsDetected(false);
      setGpsLatitude("");
      setGpsLongitude("");
      setGpsAccuracy("");
      setGpsMapsLink("");

      if (!navigator.geolocation) {
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude.toFixed(6);
          const lng = position.coords.longitude.toFixed(6);
          const accuracy = Math.round(position.coords.accuracy).toString();

          setGpsLatitude(lat);
          setGpsLongitude(lng);
          setGpsAccuracy(accuracy);
          setGpsMapsLink(`https://www.google.com/maps?q=${lat},${lng}`);
          setGpsDetected(true);
        },
        () => {
          setGpsDetected(false);
          setGpsLatitude("");
          setGpsLongitude("");
          setGpsAccuracy("");
          setGpsMapsLink("");
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    };

    const handleOpenPullUpCheckIn = () => {
      setSelectedTier("pull-up-boost");
      setIsModalOpen(false);
      setIsPullUpModalOpen(true);
    };

    window.addEventListener('openChargeModal', handleOpenModal);
    window.addEventListener("openPullUpCheckIn", handleOpenPullUpCheckIn);
    return () => {
      window.removeEventListener('openChargeModal', handleOpenModal);
      window.removeEventListener("openPullUpCheckIn", handleOpenPullUpCheckIn);
    };
  }, []);

  return (
    <div id="top" className="relative bg-white text-slate-900">
      <ProgressBar />
      <MobileMenu onSchedule={() => window.dispatchEvent(new CustomEvent("openChargeModal"))} />
      <FloatingEmergencyButton />
      
      <Hero />
      <StoryPanel
        id="how-it-works"
        step={1}
        title="We find you fast"
        subtitle="Need help right now? Use WhatsApp to share your live location and message us for emergency charging. Just planning ahead? Use the request form for non-emergency service. Once we confirm the request, we'll send you a secure payment link for your deposit or service confirmation, and then we dispatch a tech."
        icon={MapPin}
        media={
          <StepOneMap defaultEmbedUrl={googleMapsEmbedUrl} />
        }
      />
      <StoryPanel
        step={2}
        title="We connect the charge"
        subtitle="The tech arrives with professional equipment, verifies safety protocols, and connects the right adapter for your EV."
        icon={Plug}
        image="https://images.unsplash.com/photo-1593941707882-a5bba14938c7?auto=format&fit=crop&w=1600&q=80"
        invert
      />
      <StoryPanel
        step={3}
        title="Power up and go"
        subtitle="Watch your battery come back to life. Get enough charge to reach your destination or the nearest charging station."
        icon={Car}
        media={<BatteryMeter />}
      />
      <Features />
      <Pricing />
      <FinalCTA />
      <CTA />

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => {
          setIsModalOpen(false);
          setSelectedTier(null);
        }}
        title="Request a Charge"
        selectedTier={selectedTier}
      >
        <form 
          action={CHARGENEXT_URLS.formspreeEndpoint} 
          method="POST"
          className="space-y-4"
        >
          {selectedTier && (
            <div className="mb-4 rounded-lg bg-sky-50 border border-sky-200 p-4">
              <p className="text-sm font-medium text-sky-900">
                Selected Service: <span className="font-bold capitalize">{selectedTier.replace(/-/g, ' ')}</span>
              </p>
            </div>
          )}
          
          <input type="hidden" name="service_tier" value={selectedTier || ''} />
          <input type="hidden" name="latitude" value={gpsLatitude} />
          <input type="hidden" name="longitude" value={gpsLongitude} />
          <input type="hidden" name="accuracy" value={gpsAccuracy} />
          <input type="hidden" name="maps_link" value={gpsMapsLink} />

          <div>
            <label htmlFor="form-name" className="block text-sm font-medium text-slate-700">
              Full Name
            </label>
            <input
              type="text"
              id="form-name"
              name="name"
              required
              className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
            />
          </div>

          <div>
            <label htmlFor="form-email" className="block text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              type="email"
              id="form-email"
              name="email"
              required
              className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
            />
          </div>

          <div>
            <label htmlFor="form-phone" className="block text-sm font-medium text-slate-700">
              Phone Number
            </label>
            <input
              type="tel"
              id="form-phone"
              name="phone"
              required
              className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
            />
          </div>

          <div>
            <label htmlFor="form-location" className="block text-sm font-medium text-slate-700">
              Location
            </label>
            <input
              type="text"
              id="form-location"
              name="location"
              required
              placeholder="Street address or landmark"
              className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
            />
            {gpsDetected && (
              <p className="mt-2 text-xs text-emerald-700">
                Detected GPS saved with your request ✅ ({gpsLatitude}, {gpsLongitude})
              </p>
            )}
          </div>

          <div>
            <label htmlFor="form-vehicle" className="block text-sm font-medium text-slate-700">
              Vehicle Make & Model
            </label>
            <input
              type="text"
              id="form-vehicle"
              name="vehicle"
              required
              placeholder="e.g., Tesla Model 3, Nissan Leaf"
              className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
            />
          </div>

          <div>
            <label htmlFor="form-message" className="block text-sm font-medium text-slate-700">
              Additional Details
            </label>
            <textarea
              id="form-message"
              name="message"
              rows={3}
              className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
              placeholder="Any special requirements or information..."
            />
          </div>

          <Button type="submit" className="w-full rounded-xl py-6 text-base">
            Submit Request
          </Button>
        </form>
      </Modal>

      <Modal
        isOpen={isPullUpModalOpen}
        onClose={() => setIsPullUpModalOpen(false)}
        title="Pull-Up Boost Check-In"
      >
        <form
          action={CHARGENEXT_URLS.formspreeEndpoint}
          method="POST"
          className="space-y-4"
        >
          <input type="hidden" name="service_tier" value="pull-up-boost" />

          <p className="rounded-lg bg-sky-50 border border-sky-200 p-4 text-sm text-sky-900">
            You&apos;re at the ChargeNext truck. Fill this quick check-in so we can start your charging session.
          </p>

          <div>
            <label htmlFor="pullup-vehicle-type" className="block text-sm font-medium text-slate-700">
              Vehicle Type
            </label>
            <select
              id="pullup-vehicle-type"
              name="vehicle_type"
              required
              defaultValue=""
              className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
            >
              <option value="" disabled>
                Select vehicle type
              </option>
              <option value="Tesla">Tesla</option>
              <option value="Ford">Ford</option>
              <option value="Rivian">Rivian</option>
              <option value="Hyundai">Hyundai</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label htmlFor="pullup-license-plate" className="block text-sm font-medium text-slate-700">
              License Plate (optional)
            </label>
            <input
              type="text"
              id="pullup-license-plate"
              name="license_plate"
              className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
            />
          </div>

          <div>
            <label htmlFor="pullup-phone" className="block text-sm font-medium text-slate-700">
              Phone Number
            </label>
            <input
              type="tel"
              id="pullup-phone"
              name="phone"
              required
              className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
            />
          </div>

          <div>
            <label htmlFor="pullup-email" className="block text-sm font-medium text-slate-700">
              Email (for receipt)
            </label>
            <input
              type="email"
              id="pullup-email"
              name="email"
              className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
            />
          </div>

          <div>
            <label htmlFor="pullup-stall" className="block text-sm font-medium text-slate-700">
              Parking Spot or Stall Number (optional)
            </label>
            <input
              type="text"
              id="pullup-stall"
              name="parking_spot"
              className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
            />
          </div>

          <Button type="submit" className="w-full rounded-xl py-6 text-base">
            Start Charging Session
          </Button>
        </form>
      </Modal>
    </div>
  );
}
