import type { ReactNode } from "react";

import { companies } from "@/lib/platform/mock-data";

export function generateStaticParams() {
  return companies.map((company) => ({
    company: company.slug,
  }));
}

type CompanyLayoutProps = {
  children: ReactNode;
};

export default function CompanyLayout({ children }: CompanyLayoutProps) {
  return children;
}
