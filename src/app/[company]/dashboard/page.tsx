import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { Bell, Filter, LayoutDashboard, MapPinned, Search, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DispatchMap } from "@/components/platform/dispatch-map";
import { companies } from "@/lib/platform/mock-data";
import { getCompanyBySlug, getDriversByCompany } from "@/lib/platform/selectors";

export function generateStaticParams() {
  return companies.map((company) => ({
    company: company.slug,
  }));
}

type CompanyDashboardPageProps = {
  params: Promise<{
    company: string;
  }>;
};

type ApiJob = {
  id: string;
  createdAt: string;
  status: string;
  companySlug?: string | null;
  name?: string | null;
  phone?: string | null;
  service?: string | null;
  address?: string | null;
  details?: string | null;
};

export default async function CompanyDashboardPage({ params }: CompanyDashboardPageProps) {
  const { company: companySlug } = await params;
  const company = getCompanyBySlug(companySlug);

  if (!company) {
    notFound();
  }

  const companyDrivers = getDriversByCompany(company.id);

  if (process.env.NEXT_OUTPUT_EXPORT === "true") {
    return (
      <main className="min-h-screen bg-slate-950 text-white">
        <div className="border-b border-white/10 bg-slate-950/90 backdrop-blur">
          <div className="mx-auto max-w-7xl px-6 py-6">
            <p className="text-xs uppercase tracking-[0.25em] text-cyan-300">Dispatch Platform</p>
            <h1 className="mt-1 text-2xl font-semibold">{company.name} Dispatch Dashboard</h1>
            <p className="mt-3 max-w-2xl text-sm text-white/65">
              Live dashboard data is available in the full application runtime.
            </p>
          </div>
        </div>
      </main>
    );
  }

  const headerList = await headers();
  const host = headerList.get("host") ?? "localhost:3000";
  const protocol = host.includes("localhost") ? "http" : "https";
  const baseUrl = `${protocol}://${host}`;

  const res = await fetch(`${baseUrl}/api/jobs?company=${companySlug}`, {
    cache: "no-store",
  });

  const data = await res.json();
  const companyJobs: ApiJob[] = data.jobs ?? [];

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="border-b border-white/10 bg-slate-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-cyan-300">Dispatch Platform</p>
            <h1 className="mt-1 text-2xl font-semibold">{company.name} Dispatch Dashboard</h1>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="secondary" className="border border-white/10 bg-white/5 text-white hover:bg-white/10">
              <Bell className="mr-2 h-4 w-4" />
              Alerts
            </Button>
            <Button className="bg-cyan-500 text-slate-950 hover:bg-cyan-400">New Job</Button>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-6 px-6 py-6 lg:grid-cols-[280px_minmax(0,1fr)_340px]">
        <aside className="space-y-6">
          <Card className="rounded-2xl border border-white/10 bg-white/5 text-white shadow-none">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 text-cyan-300">
                <LayoutDashboard className="h-5 w-5" />
                <h2 className="text-sm font-semibold uppercase tracking-[0.2em]">Views</h2>
              </div>

              <div className="mt-4 space-y-3 text-sm">
                <div className="rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-3">Map View</div>
                <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">Table View</div>
                <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">Driver View</div>
                <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">Analytics</div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border border-white/10 bg-white/5 text-white shadow-none">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 text-cyan-300">
                <Users className="h-5 w-5" />
                <h2 className="text-sm font-semibold uppercase tracking-[0.2em]">Drivers</h2>
              </div>

              <div className="mt-4 space-y-3">
                {companyDrivers.map((driver) => (
                  <div key={driver.id} className="rounded-xl border border-white/10 bg-slate-900/70 p-4">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{driver.name}</p>
                      <span className="text-xs capitalize text-cyan-300">{driver.status}</span>
                    </div>
                    <p className="mt-2 text-sm text-white/60">{driver.zone}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </aside>

        <section>
          <Card className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 text-white shadow-none">
            <CardContent className="p-0">
              <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                <div>
                  <h2 className="text-lg font-semibold">Live Dispatch Map</h2>
                  <p className="text-sm text-white/60">Main operational map for jobs, routes, and drivers</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="secondary" className="border border-white/10 bg-white/5 text-white hover:bg-white/10">
                    <Search className="mr-2 h-4 w-4" />
                    Search
                  </Button>
                  <Button variant="secondary" className="border border-white/10 bg-white/5 text-white hover:bg-white/10">
                    <Filter className="mr-2 h-4 w-4" />
                    Filters
                  </Button>
                </div>
              </div>

              <DispatchMap companyName={company.name} />
            </CardContent>
          </Card>
        </section>

        <aside>
          <Card className="rounded-2xl border border-white/10 bg-white/5 text-white shadow-none">
            <CardContent className="p-5">
              <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-300">Open Jobs</h2>

              <div className="mt-4 space-y-3">
                {companyJobs.length === 0 ? (
                  <div className="rounded-xl border border-white/10 bg-slate-900/70 p-4 text-sm text-white/60">
                    No jobs yet for this company.
                  </div>
                ) : (
                  companyJobs.map((job) => (
                    <div key={job.id} className="rounded-xl border border-white/10 bg-slate-900/70 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">{job.id}</p>
                          <p className="mt-1 text-sm text-white/65">{job.name ?? "New Customer Request"}</p>
                        </div>
                        <span className="rounded-full bg-cyan-400/10 px-2 py-1 text-[11px] capitalize text-cyan-300">
                          {job.status}
                        </span>
                      </div>

                      <div className="mt-4 space-y-1 text-sm text-white/70">
                        <p>Service: {job.service ?? "—"}</p>
                        <p>Phone: {job.phone ?? "—"}</p>
                        <p>Address: {job.address ?? "—"}</p>
                        {job.details ? <p>Details: {job.details}</p> : null}
                      </div>

                      <div className="mt-4 flex gap-2">
                        <Button className="flex-1 bg-cyan-500 text-slate-950 hover:bg-cyan-400">Assign</Button>
                        <Button variant="secondary" className="flex-1 border border-white/10 bg-white/5 text-white hover:bg-white/10">
                          Open
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>
    </main>
  );
}
