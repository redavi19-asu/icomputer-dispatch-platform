import type { ReactNode } from "react";
import ProtectedRoute from "@/components/auth/protected-route";

export default function BillingLayout({ children }: { children: ReactNode }) {
  // Billing must remain reachable for signed-in companies that need payment
  // recovery, so it requires authentication but not an active subscription.
  return <ProtectedRoute>{children}</ProtectedRoute>;
}
