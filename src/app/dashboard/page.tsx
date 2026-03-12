"use client";

import { Bell, Filter, LayoutDashboard, MapPinned, Search, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getCompanyBySlug, getDriversByCompany, getJobsByCompany } from "@/lib/platform/selectors";

export default function DashboardPage() {
	const company = getCompanyBySlug("build-electric");
	const companyDrivers = company ? getDriversByCompany(company.id) : [];
	const companyJobs = company ? getJobsByCompany(company.id) : [];

	return (
		<main className="min-h-screen bg-slate-950 text-white">
			<div className="border-b border-white/10 bg-slate-950/90 backdrop-blur">
				<div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
					<div>
						<p className="text-xs uppercase tracking-[0.25em] text-cyan-300">Dispatch Platform</p>
						<h1 className="mt-1 text-2xl font-semibold">{company?.name} Dispatch Dashboard</h1>
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
									<div key={driver.name} className="rounded-xl border border-white/10 bg-slate-900/70 p-4">
										<div className="flex items-center justify-between">
											<p className="font-medium">{driver.name}</p>
											<span className="text-xs text-cyan-300">{driver.status}</span>
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

							<div className="relative h-[620px] bg-[radial-gradient(circle_at_top,rgba(14,165,233,0.18),transparent_35%),linear-gradient(180deg,#0f172a_0%,#020617_100%)]">
								<div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:44px_44px]" />

								<div className="absolute left-[18%] top-[28%] rounded-full bg-cyan-400 px-3 py-2 text-xs font-semibold text-slate-950 shadow-lg shadow-cyan-400/20">
									Driver A
								</div>
								<div className="absolute left-[55%] top-[36%] rounded-full bg-emerald-400 px-3 py-2 text-xs font-semibold text-slate-950 shadow-lg shadow-emerald-400/20">
									Driver B
								</div>
								<div className="absolute left-[42%] top-[54%] rounded-full bg-amber-300 px-3 py-2 text-xs font-semibold text-slate-950 shadow-lg shadow-amber-300/20">
									Job 1043
								</div>
								<div className="absolute left-[68%] top-[24%] rounded-full bg-rose-300 px-3 py-2 text-xs font-semibold text-slate-950 shadow-lg shadow-rose-300/20">
									Priority
								</div>

								<div className="absolute bottom-6 left-6 rounded-2xl border border-white/10 bg-slate-900/80 p-4 backdrop-blur">
									<div className="flex items-center gap-2 text-cyan-300">
										<MapPinned className="h-4 w-4" />
										<span className="text-sm font-medium">Map Layer</span>
									</div>
									<p className="mt-2 text-xs text-white/60">Placeholder canvas for the future production map</p>
								</div>
							</div>
						</CardContent>
					</Card>
				</section>

				<aside>
					<Card className="rounded-2xl border border-white/10 bg-white/5 text-white shadow-none">
						<CardContent className="p-5">
							<h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-300">Open Jobs</h2>

							<div className="mt-4 space-y-3">
								{companyJobs.map((job) => (
									<div key={job.id} className="rounded-xl border border-white/10 bg-slate-900/70 p-4">
										<div className="flex items-start justify-between gap-3">
											<div>
												<p className="font-semibold">{job.id}</p>
												<p className="mt-1 text-sm text-white/65">{job.title}</p>
											</div>
											<span className="rounded-full bg-cyan-400/10 px-2 py-1 text-[11px] text-cyan-300">
												{job.status}
											</span>
										</div>

										<div className="mt-4 space-y-1 text-sm text-white/70">
											<p>Type: {job.serviceType}</p>
											<p>ETA: {job.etaMinutes ?? "—"}</p>
										</div>

										<div className="mt-4 flex gap-2">
											<Button className="flex-1 bg-cyan-500 text-slate-950 hover:bg-cyan-400">Assign</Button>
											<Button variant="secondary" className="flex-1 border border-white/10 bg-white/5 text-white hover:bg-white/10">
												Open
											</Button>
										</div>
									</div>
								))}
							</div>
						</CardContent>
					</Card>
				</aside>
			</div>
		</main>
	);
}
