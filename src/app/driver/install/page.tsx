import { InstallAppPanel } from "@/components/platform/install-app-panel";

export default function DriverInstallPage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,#061a33,#0a4a91)] px-6 py-12 text-white md:py-20">
      <InstallAppPanel
        title="Urban Carrier OS Driver"
        description="Install the driver experience on a phone or tablet for assigned jobs, mission status, navigation, and field updates without living inside a normal browser tab."
        launchHref="/driver"
        device="mobile"
      />
    </main>
  );
}
