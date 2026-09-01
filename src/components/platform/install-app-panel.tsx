"use client";

import { useEffect, useState } from "react";
import { Download, ExternalLink, Smartphone, MonitorDown } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

type InstallAppPanelProps = {
  title: string;
  description: string;
  launchHref: string;
  device: "mobile" | "desktop";
};

export function InstallAppPanel({ title, description, launchHref, device }: InstallAppPanelProps) {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches;
    setInstalled(standalone);
    setIsIos(/iphone|ipad|ipod/i.test(navigator.userAgent));

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };

    const onInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") setInstalled(true);
    setInstallPrompt(null);
  };

  const Icon = device === "mobile" ? Smartphone : MonitorDown;

  return (
    <section className="mx-auto w-full max-w-2xl rounded-3xl border border-white/10 bg-white/5 p-6 text-white shadow-2xl backdrop-blur md:p-8">
      <div className="flex items-start gap-4">
        <div className="rounded-2xl border border-cyan-400/30 bg-cyan-500/10 p-3 text-cyan-200">
          <Icon className="h-7 w-7" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300">Install DispatchOS</p>
          <h1 className="mt-2 text-3xl font-semibold">{title}</h1>
          <p className="mt-3 leading-7 text-white/70">{description}</p>
        </div>
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {installPrompt && !installed ? (
          <button
            type="button"
            onClick={install}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300"
          >
            <Download className="h-4 w-4" />
            Install App
          </button>
        ) : (
          <a
            href={launchHref}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300"
          >
            <ExternalLink className="h-4 w-4" />
            {installed ? "Open Installed App" : "Open App"}
          </a>
        )}
        <a
          href="/workspace"
          className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/5 px-5 py-3 font-semibold text-white/80 transition hover:bg-white/10"
        >
          Back to Workspace
        </a>
      </div>

      {!installPrompt && !installed ? (
        <div className="mt-6 rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-sm leading-6 text-white/65">
          {isIos
            ? "On iPhone or iPad: tap Share, then Add to Home Screen. DispatchOS will launch like a standalone app."
            : "If your browser does not show the install button, open its menu and choose Install app or Add to Home screen. Chrome and Edge usually show the install option in the address bar or browser menu."}
        </div>
      ) : null}
    </section>
  );
}
