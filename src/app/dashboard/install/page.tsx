import { InstallAppPanel } from "@/components/platform/install-app-panel";

export default function DispatcherInstallPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-white md:py-20">
      <InstallAppPanel
        title="DispatchOS Dispatcher"
        description="Install the dispatcher dashboard on a desktop or laptop for a focused operations window with live jobs, assignments, queue management, and mapping."
        launchHref="/dashboard"
        device="desktop"
      />
    </main>
  );
}
