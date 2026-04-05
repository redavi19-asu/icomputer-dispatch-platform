"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, CreditCard, ReceiptText } from "lucide-react";

import { AppShellNav } from "@/components/platform/app-shell-nav";
import { Card, CardContent } from "@/components/ui/card";
import {
	readWorkspaceSettings,
	type WorkspaceSettingsState,
} from "@/lib/platform/workspace-preferences";

const WORKSPACE_SETTINGS_UPDATED_EVENT = "dispatch:workspace-settings-updated";

const invoices = [
	{ id: "INV-2026-001", amount: "$299", status: "Paid", date: "Apr 1, 2026" },
	{ id: "INV-2026-000", amount: "$299", status: "Paid", date: "Mar 1, 2026" },
	{ id: "INV-2026-099", amount: "$299", status: "Paid", date: "Feb 1, 2026" },
];

export default function BillingPage() {
	const [workspaceSettings, setWorkspaceSettings] = useState<WorkspaceSettingsState>(() =>
		readWorkspaceSettings("build-electric")
	);

	useEffect(() => {
		const syncSettings = () => {
			setWorkspaceSettings(readWorkspaceSettings("build-electric"));
		};

		syncSettings();
		window.addEventListener("storage", syncSettings);
		window.addEventListener(WORKSPACE_SETTINGS_UPDATED_EVENT, syncSettings as EventListener);

		return () => {
			window.removeEventListener("storage", syncSettings);
			window.removeEventListener(WORKSPACE_SETTINGS_UPDATED_EVENT, syncSettings as EventListener);
		};
	}, []);

	return (
		<main className="min-h-screen bg-slate-950 text-white">
			<AppShellNav />
			<section className="mx-auto max-w-6xl px-6 py-12 md:py-16">
				<div className="mb-8 flex flex-wrap items-center justify-between gap-4">
					<div>
						<p className="text-xs uppercase tracking-[0.22em] text-cyan-300">
							{workspaceSettings.companyName} Billing
						</p>
						<h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">Billing overview</h1>
						<p className="mt-3 text-sm text-white/70">
							Subscription status, payment method, and invoice history for your company workspace.
						</p>
					</div>
					<Link
						href="/workspace"
						className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white/85 hover:bg-white/10"
					>
						<ArrowLeft className="h-4 w-4" />
						Back to Workspace
					</Link>
				</div>

				<div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
					<Card className="rounded-3xl border border-white/10 bg-white/5 text-white shadow-none">
						<CardContent className="p-6 md:p-8">
							<div className="flex items-center gap-3 text-cyan-300">
								<ReceiptText className="h-5 w-5" />
								<h2 className="text-lg font-semibold">Recent invoices</h2>
							</div>

							<div className="mt-5 space-y-3">
								{invoices.map((invoice) => (
									<div
										key={invoice.id}
										className="grid gap-2 rounded-2xl border border-white/10 bg-slate-900/70 p-4 md:grid-cols-4 md:items-center"
									>
										<p className="font-medium">{invoice.id}</p>
										<p className="text-sm text-white/75">{invoice.date}</p>
										<p className="text-sm text-white/85">{invoice.amount}</p>
										<span className="inline-flex w-fit items-center gap-1 rounded-full border border-emerald-400/35 bg-emerald-500/10 px-2 py-1 text-xs text-emerald-200">
											<CheckCircle2 className="h-3.5 w-3.5" />
											{invoice.status}
										</span>
									</div>
								))}
							</div>
						</CardContent>
					</Card>

					<div className="space-y-6">
						<Card className="rounded-3xl border border-white/10 bg-white/5 text-white shadow-none">
							<CardContent className="p-6">
								<div className="flex items-center gap-3 text-cyan-300">
									<CreditCard className="h-5 w-5" />
									<h2 className="text-lg font-semibold">Current plan</h2>
								</div>
								<p className="mt-4 text-2xl font-semibold">Starter Plan</p>
								<p className="mt-2 text-sm text-white/70">$299 / month, billed monthly</p>
								<p className="mt-4 text-sm text-white/65">
									Includes booking intake, dispatch dashboard, driver workflow, and company controls.
								</p>
							</CardContent>
						</Card>

						<Card className="rounded-3xl border border-white/10 bg-white/5 text-white shadow-none">
							<CardContent className="p-6">
								<p className="text-sm uppercase tracking-[0.2em] text-white/55">Payment method</p>
								<p className="mt-3 text-base font-semibold">Visa ending in 4242</p>
								<p className="mt-2 text-sm text-white/65">Next billing date: May 1, 2026</p>
							</CardContent>
						</Card>
					</div>
				</div>
			</section>
		</main>
	);
}
