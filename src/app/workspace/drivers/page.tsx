"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Copy, Mail, Pencil, Plus, Send, Smartphone } from "lucide-react";

import { AppShellNav } from "@/components/platform/app-shell-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { getCompanyBySlug } from "@/lib/platform/selectors";
import {
  getDriverInviteLabel,
  getDriverLiveWorkLabel,
  readWorkspaceDrivers,
  writeWorkspaceDrivers,
  type DriverAccountStatus,
  type DriverInviteStatus,
  type DriverLiveWorkStatus,
  type WorkspaceDriver,
} from "@/lib/platform/workspace-drivers";

const company = getCompanyBySlug("build-electric");

type DriverDraft = {
  name: string;
  phone: string;
  zone: string;
  accountStatus: DriverAccountStatus;
  liveWorkStatus: DriverLiveWorkStatus;
  inviteStatus: DriverInviteStatus;
};

const emptyDraft: DriverDraft = {
  name: "",
  phone: "",
  zone: "",
  accountStatus: "enabled",
  liveWorkStatus: "available",
  inviteStatus: "not-sent",
};

export default function WorkspaceDriversPage() {
  const [drivers, setDrivers] = useState<WorkspaceDriver[]>(() =>
    company ? readWorkspaceDrivers(company.id, company.slug) : []
  );
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingDriverId, setEditingDriverId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DriverDraft>(emptyDraft);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [isInstallGuideOpen, setIsInstallGuideOpen] = useState(false);

  useEffect(() => {
    if (!company) return;
    writeWorkspaceDrivers(company.slug, drivers);
  }, [drivers]);

  const enabledDrivers = useMemo(
    () => drivers.filter((driver) => driver.accountStatus === "enabled").length,
    [drivers]
  );

  const openAddDriver = () => {
    setEditingDriverId(null);
    setDraft(emptyDraft);
    setIsEditorOpen(true);
  };

  const openEditDriver = (driver: WorkspaceDriver) => {
    setEditingDriverId(driver.id);
    setDraft({
      name: driver.name,
      phone: driver.phone,
      zone: driver.zone,
      accountStatus: driver.accountStatus,
      liveWorkStatus:
        driver.accountStatus === "disabled" ? "offline" : driver.liveWorkStatus,
      inviteStatus: driver.inviteStatus,
    });
    setIsEditorOpen(true);
  };

  const saveDriver = () => {
    if (!draft.name.trim()) return;

    if (editingDriverId) {
      setDrivers((prev) =>
        prev.map((driver) =>
          driver.id === editingDriverId
            ? {
                ...driver,
                name: draft.name.trim(),
                phone: draft.phone.trim(),
                zone: draft.zone.trim() || "Unassigned",
                accountStatus: draft.accountStatus,
                inviteStatus: draft.inviteStatus,
                liveWorkStatus:
                  draft.accountStatus === "disabled" ? "offline" : draft.liveWorkStatus,
              }
            : driver
        )
      );
    } else {
      const id = `drv_${crypto.randomUUID().slice(0, 8)}`;
      setDrivers((prev) => [
        {
          id,
          name: draft.name.trim(),
          phone: draft.phone.trim(),
          zone: draft.zone.trim() || "Unassigned",
          accountStatus: draft.accountStatus,
          inviteStatus: draft.inviteStatus,
          liveWorkStatus:
            draft.accountStatus === "disabled" ? "offline" : draft.liveWorkStatus,
        },
        ...prev,
      ]);
    }

    setIsEditorOpen(false);
    setEditingDriverId(null);
    setDraft(emptyDraft);
  };

  const buildDriverInviteLink = (driver: WorkspaceDriver) => {
    const baseUrl =
      typeof window !== "undefined"
        ? window.location.origin
        : "https://dispatch.example.com";
    return `${baseUrl}/driver?company=build-electric&driver=${encodeURIComponent(
      driver.id
    )}&invite=1`;
  };

  const sendDriverInvite = (driverId: string) => {
    setDrivers((prev) =>
      prev.map((driver) =>
        driver.id === driverId ? { ...driver, inviteStatus: "invite-sent" } : driver
      )
    );
    setActionMessage("Driver invite sent.");
  };

  const resendInvite = (driverId: string) => {
    setDrivers((prev) =>
      prev.map((driver) =>
        driver.id === driverId
          ? {
              ...driver,
              inviteStatus: "invite-resent",
            }
          : driver
      )
    );
    setActionMessage("Invite resent to driver.");
  };

  const copyDriverLink = async (driver: WorkspaceDriver) => {
    const link = buildDriverInviteLink(driver);
    try {
      await navigator.clipboard.writeText(link);
      setActionMessage("Driver link copied.");
    } catch {
      setActionMessage(`Driver link: ${link}`);
    }
  };

  const toggleAccountStatus = (driverId: string) => {
    setDrivers((prev) =>
      prev.map((driver) => {
        if (driver.id !== driverId) return driver;
        const nextAccount = driver.accountStatus === "enabled" ? "disabled" : "enabled";
        return {
          ...driver,
          accountStatus: nextAccount,
          liveWorkStatus:
            nextAccount === "disabled"
              ? "offline"
              : driver.liveWorkStatus === "offline"
              ? "available"
              : driver.liveWorkStatus,
        };
      })
    );
  };

  useEffect(() => {
    if (!actionMessage) return;
    const timeout = window.setTimeout(() => setActionMessage(null), 2200);
    return () => window.clearTimeout(timeout);
  }, [actionMessage]);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <AppShellNav />
      <section className="mx-auto max-w-6xl px-6 py-12 md:py-16">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-cyan-300">Workspace Drivers</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
              Driver management
            </h1>
            <p className="mt-3 text-sm text-white/70">
              {enabledDrivers} enabled of {drivers.length} total drivers.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/workspace"
              className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white/85 hover:bg-white/10"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Workspace
            </Link>
            <Button
              variant="secondary"
              onClick={() => setIsInstallGuideOpen(true)}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/10"
            >
              <Smartphone className="h-4 w-4" />
              Install Guide
            </Button>
            <Button
              onClick={openAddDriver}
              className="rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-400"
            >
              <Plus className="h-4 w-4" />
              Add Driver
            </Button>
          </div>
        </div>

        <Card className="rounded-3xl border border-white/10 bg-white/5 text-white shadow-none">
          <CardContent className="p-0">
            <div className="grid gap-3 border-b border-white/10 bg-slate-900/70 px-5 py-3 text-[11px] uppercase tracking-[0.14em] text-white/50 md:grid-cols-[1.4fr_1fr_1fr_auto] md:items-center">
              <p>Driver</p>
              <p>Zone</p>
              <p>Status</p>
              <p className="md:text-right">Actions</p>
            </div>
            <div className="divide-y divide-white/10">
              {drivers.map((driver) => (
                <div key={driver.id} className="grid gap-4 p-5 md:grid-cols-[1.4fr_1fr_1fr_auto] md:items-center">
                  <div>
                    <p className="font-semibold">{driver.name}</p>
                    <p className="mt-1 text-sm text-white/65">{driver.phone || "No phone on file"}</p>
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-white/45">Zone</p>
                    <p className="mt-1 text-sm text-white/80">{driver.zone}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleAccountStatus(driver.id)}
                      className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                        driver.accountStatus === "enabled"
                          ? "border-emerald-400/45 bg-emerald-500/15 text-emerald-200"
                          : "border-white/20 bg-white/5 text-white/70"
                      }`}
                    >
                      {driver.accountStatus === "enabled" ? "Enabled" : "Disabled"}
                    </button>

                    <span className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-xs text-cyan-200">
                      {getDriverInviteLabel(driver.inviteStatus)}
                    </span>
                    <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs text-white/75">
                      {getDriverLiveWorkLabel(driver.liveWorkStatus)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 md:justify-end">
                    {driver.inviteStatus === "not-sent" ? (
                      <Button
                        variant="secondary"
                        onClick={() => sendDriverInvite(driver.id)}
                        className="border border-white/10 bg-white/5 text-white hover:bg-white/10"
                      >
                        <Send className="h-4 w-4" />
                        Send Driver Invite
                      </Button>
                    ) : (
                      <Button
                        variant="secondary"
                        onClick={() => resendInvite(driver.id)}
                        className="border border-white/10 bg-white/5 text-white hover:bg-white/10"
                      >
                        <Send className="h-4 w-4" />
                        Resend Invite
                      </Button>
                    )}

                    <Button
                      variant="secondary"
                      onClick={() => void copyDriverLink(driver)}
                      className="border border-white/10 bg-white/5 text-white hover:bg-white/10"
                    >
                      <Copy className="h-4 w-4" />
                      Copy Driver Link
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => openEditDriver(driver)}
                      className="border border-white/10 bg-white/5 text-white hover:bg-white/10"
                    >
                      <Pencil className="h-4 w-4" />
                      Edit
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {actionMessage ? (
          <p className="mt-4 text-sm text-cyan-200">{actionMessage}</p>
        ) : null}
      </section>

      <Modal
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        title={editingDriverId ? "Edit Driver" : "Add Driver"}
      >
        <div className="space-y-4 text-slate-800">
          <label className="block">
            <span className="mb-2 block text-sm text-slate-600">Driver Name</span>
            <input
              value={draft.name}
              onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-slate-500"
              placeholder="Full name"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm text-slate-600">Phone</span>
            <input
              value={draft.phone}
              onChange={(event) => setDraft((prev) => ({ ...prev, phone: event.target.value }))}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-slate-500"
              placeholder="(555) 555-5555"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm text-slate-600">Zone</span>
            <input
              value={draft.zone}
              onChange={(event) => setDraft((prev) => ({ ...prev, zone: event.target.value }))}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-slate-500"
              placeholder="Central Zone"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm text-slate-600">Account Status</span>
            <select
              value={draft.accountStatus}
              onChange={(event) =>
                setDraft((prev) => ({
                  ...prev,
                  accountStatus: event.target.value as DriverAccountStatus,
                  liveWorkStatus:
                    event.target.value === "disabled"
                      ? "offline"
                      : prev.liveWorkStatus === "offline"
                      ? "available"
                      : prev.liveWorkStatus,
                }))
              }
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-slate-500"
            >
              <option value="enabled">Enabled</option>
              <option value="disabled">Disabled</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm text-slate-600">Invite Status</span>
            <select
              value={draft.inviteStatus}
              onChange={(event) =>
                setDraft((prev) => ({
                  ...prev,
                  inviteStatus: event.target.value as DriverInviteStatus,
                }))
              }
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-slate-500"
            >
              <option value="not-sent">Not Sent</option>
              <option value="invite-sent">Invite Sent</option>
              <option value="invite-resent">Invite Resent</option>
              <option value="joined">Joined</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm text-slate-600">Live Work Status</span>
            <select
              value={draft.accountStatus === "disabled" ? "offline" : draft.liveWorkStatus}
              onChange={(event) =>
                setDraft((prev) => ({
                  ...prev,
                  liveWorkStatus: event.target.value as DriverLiveWorkStatus,
                }))
              }
              disabled={draft.accountStatus === "disabled"}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-slate-500 disabled:cursor-not-allowed disabled:bg-slate-100"
            >
              <option value="available">Available</option>
              <option value="assigned">Assigned</option>
              <option value="on-route">On Route</option>
              <option value="at-pickup">At Pickup</option>
              <option value="at-stop">At Stop</option>
              <option value="completed">Completed</option>
              <option value="offline">Offline</option>
            </select>
          </label>

          <div className="flex gap-3 pt-2">
            <Button onClick={() => setIsEditorOpen(false)} variant="secondary" className="flex-1">
              Cancel
            </Button>
            <Button onClick={saveDriver} className="flex-1 bg-slate-900 text-white hover:bg-slate-800">
              <Mail className="h-4 w-4" />
              Save Driver
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isInstallGuideOpen}
        onClose={() => setIsInstallGuideOpen(false)}
        title="Driver Mobile Install Guide"
      >
        <div className="space-y-4 text-slate-800">
          <p className="text-sm text-slate-700">
            DispatchOS driver access works today as a mobile web app with an invite link, and can
            later be added to the home screen for app-like use.
          </p>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Driver flow</p>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-700">
              <li>Dispatcher sends invite link from Driver Management.</li>
              <li>Driver opens link on mobile browser.</li>
              <li>Driver signs in or verifies identity.</li>
              <li>Driver uses the live mission screen in browser.</li>
              <li>Add to Home Screen for one-tap full-screen launch.</li>
            </ol>
          </div>

          <div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-4 text-sm text-cyan-900">
            This setup avoids app store distribution today and keeps onboarding simple:
            invite link {"->"} mobile browser {"->"} add to home screen.
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
            <p className="font-semibold text-slate-700">Mobile app readiness</p>
            <p className="mt-1">PWA install behavior and home-screen launch are enabled.</p>
            <p className="mt-1">Next rollout: push notifications, secure sign-in, and camera/QR mission verification.</p>
          </div>

          <Link
            href="/driver"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-400/35 bg-cyan-500/10 px-4 py-3 text-sm font-semibold text-cyan-900 hover:bg-cyan-500/20"
          >
            <Smartphone className="h-4 w-4" />
            Open Driver App
          </Link>

          <Button
            onClick={() => setIsInstallGuideOpen(false)}
            className="w-full bg-slate-900 text-white hover:bg-slate-800"
          >
            Close Guide
          </Button>
        </div>
      </Modal>
    </main>
  );
}
