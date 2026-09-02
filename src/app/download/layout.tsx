import type { ReactNode } from "react";
import ProtectedRoute from "@/components/auth/protected-route";

export default function DownloadLayout({ children }: { children: ReactNode }) {
  return <ProtectedRoute requireActiveSubscription>{children}</ProtectedRoute>;
}
