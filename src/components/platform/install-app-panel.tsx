"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Download,
  ExternalLink,
  MonitorDown,
  Share2,
  Smartphone,
} from "lucide-react";

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
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches;
    const userAgent = navigator.userAgent;

    setInstalled(standalone);
    setIsIos(/iphone|ipad|ipod/i.test(userAgent));
    setIsAndroid(/android/i.test(userAgent));

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

  const installSteps = isIos
    ? [
        "Open this page in Safari.",
        "Tap the Share button at the bottom of Safari.",
        "Choose Add to Home Screen.",
        "Tap Add. The DispatchOS icon will appear on your Home Screen.",
        "Tap the new icon anytime to open DispatchOS like an app.",
      ]
    : isAndroid
      ? [
          "Open this page in Chrome.",
          "Tap Install App when the button is available.",
          "Approve the install. DispatchOS will be added to your apps and may also appear on your Home Screen.",
          "If no install button appears, open Chrome's menu and choose Install app or Add to Home screen.",
          "Tap the DispatchOS icon anytime to open the app.",
        ]
      : device === "desktop"
        ? [
            "Open this page in Chrome or Edge.",
            "Click Install App when the install option appears.",
            "Approve the install so DispatchOS can open in its own app window.",
            "Use the DispatchOS icon or shortcut to launch it later.",
          ]
        : [
            "Open this page in your browser.",
            "Use Install app or Add to Home screen from the browser menu.",
            "Confirm the install and look for the DispatchOS icon on your device.",
            "Tap the icon anytime to launch DispatchOS.",
          ];

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

      <div className="mt-7 rounded-2xl border border-cyan-400/15 bg-slate-950/70 p-5">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-cyan-500/10 p-2 text-cyan-300">
            {isIos ? <Share2 className="h-5 w-5" /> : <Download className="h-5 w-5" />}
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Put the DispatchOS icon on this device</p>
            <p className="mt-1 text-xs text-white/45">
              Follow these steps once. After that, open DispatchOS from the icon like any other app.
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {installSteps.map((step, index) => (
            <div key={step} className="flex items-start gap-3">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-cyan-400/25 bg-cyan-500/10 text-[11px] font-bold text-cyan-200">
                {index + 1}
              </div>
              <p className="pt-0.5 text-sm leading-6 text-white/68">{step}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 flex items-start gap-3 rounded-2xl border border-emerald-400/15 bg-emerald-500/[0.06] p-4">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
        <div>
          <p className="text-sm font-semibold text-emerald-100">
            {installed ? "DispatchOS is installed on this device." : "What happens after installation"}
          </p>
          <p className="mt-1 text-sm leading-6 text-emerald-100/65">
            {installed
              ? "Use Open Installed App above or launch DispatchOS from the icon on your device."
              : "You will see a DispatchOS icon on your phone, tablet, or computer. Tap or click that icon to launch the app without coming back through the website each time."}
          </p>
        </div>
      </div>
    </section>
  );
}
