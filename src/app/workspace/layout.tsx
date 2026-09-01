"use client";

import { ReactNode } from "react";
import ProtectedRoute from "@/components/auth/protected-route";

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  return <ProtectedRoute requireActiveSubscription>{children}</ProtectedRoute>;
}
