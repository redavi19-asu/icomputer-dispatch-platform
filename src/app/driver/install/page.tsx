import { InstallAppPanel } from "@/components/platform/install-app-panel";

export default function DriverInstallPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-white md:py-20">
      <InstallAppPanel
        title="DispatchOS Driver"
        description="Install the driver experience on a phone or tablet for assigned jobs, mission status, navigation, and field updates without living inside a normal browser tab."
        launchHref="/driver"
        device="mobile"
      />
    </main>
  );
}
