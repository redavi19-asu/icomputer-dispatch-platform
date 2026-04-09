import type { ReactNode } from "react";

export function generateStaticParams() {
  return [
    {
      jobId: "sample-job",
    },
  ];
}

type TrackJobLayoutProps = {
  children: ReactNode;
};

export default function TrackJobLayout({ children }: TrackJobLayoutProps) {
  return children;
}
