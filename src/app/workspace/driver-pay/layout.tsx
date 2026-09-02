import type { ReactNode } from "react";

import { DriverPayCloudSync } from "@/components/platform/driver-pay-cloud-sync";

export default function DriverPayLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <DriverPayCloudSync />
      {children}
    </>
  );
}
