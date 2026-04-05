"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Mail, Pencil, Plus, Send } from "lucide-react";

import { AppShellNav } from "@/components/platform/app-shell-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { getCompanyBySlug } from "@/lib/platform/selectors";
import {
  readWorkspaceDrivers,
  writeWorkspaceDrivers,
  type WorkspaceDriver,
} from "@/lib/platform/workspace-drivers";

const company = getCompanyBySlug("build-electric");

type DriverDraft = {
  name: string;
  phone: string;
  zone: string;
  isActive: boolean;
  status: WorkspaceDriver["status"];
};

const emptyDraft: DriverDraft = {
  name: "",
  phone: "",
  zone: "",
  isActive: true,
  status: "available",
};

export default function WorkspaceDriversPage() {
  const [drivers, setDrivers] = useState<WorkspaceDriver[]>(() =>
    company ? readWorkspaceDrivers(company.id, company.slug) : []
  );
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingDriverId, setEditingDriverId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DriverDraft>(emptyDraft);

  useEffect(() => {
    if (!company) return;
    writeWorkspaceDrivers(company.slug, drivers);
  }, [drivers]);

  const activeDrivers = useMemo(() => drivers.filter((driver) => driver.isActive).length, [drivers]);

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
      isActive: driver.isActive,
      status: driver.status === "offline" ? "available" : driver.status,
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
                isActive: draft.isActive,
                status: draft.isActive ? draft.status : "offline",
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
          isActive: draft.isActive,
          inviteStatus: "pending",
          status: draft.isActive ? draft.status : "offline",
        },
        ...prev,
      ]);
    }

    setIsEditorOpen(false);
    setEditingDriverId(null);
    setDraft(emptyDraft);
  };

  const resendInvite = (driverId: string) => {
    setDrivers((prev) =>
      prev.map((driver) =>
        driver.id === driverId ? { ...driver, inviteStatus: "invited" } : driver
      )
    );
  };

  const toggleActive = (driverId: string) => {
    setDrivers((prev) =>
      prev.map((driver) =>
        driver.id === driverId
          ? {
              ...driver,
              isActive: !driver.isActive,
              status: !driver.isActive
                ? driver.status === "offline"
                  ? "available"
                  : driver.status
                : "offline",
            }
          : driver
      )
    );
  };

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
              {activeDrivers} active of {drivers.length} total drivers.
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
                      onClick={() => toggleActive(driver.id)}
                      className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                        driver.isActive
                          ? "border-emerald-400/45 bg-emerald-500/15 text-emerald-200"
                          : "border-white/20 bg-white/5 text-white/70"
                      }`}
                    >
                      {driver.isActive ? "Active" : "Inactive"}
                    </button>

                    <span className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-xs text-cyan-200">
                      {driver.inviteStatus}
                    </span>
                    <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs text-white/75">
                      {driver.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 md:justify-end">
                    <Button
                      variant="secondary"
                      onClick={() => resendInvite(driver.id)}
                      className="border border-white/10 bg-white/5 text-white hover:bg-white/10"
                    >
                      <Send className="h-4 w-4" />
                      Resend Invite
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

          <button
            onClick={() =>
              setDraft((prev) => ({
                ...prev,
                isActive: !prev.isActive,
                status: prev.isActive ? "available" : prev.status,
              }))
            }
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${
              draft.isActive
                ? "border-emerald-300 bg-emerald-100 text-emerald-700"
                : "border-slate-300 bg-slate-100 text-slate-600"
            }`}
          >
            {draft.isActive ? "Active" : "Inactive"}
          </button>

          <label className="block">
            <span className="mb-2 block text-sm text-slate-600">Dispatch Status</span>
            <select
              value={draft.isActive ? draft.status : "offline"}
              onChange={(event) =>
                setDraft((prev) => ({
                  ...prev,
                  status: event.target.value as WorkspaceDriver["status"],
                }))
              }
              disabled={!draft.isActive}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-slate-500 disabled:cursor-not-allowed disabled:bg-slate-100"
            >
              <option value="available">available</option>
              <option value="en-route">en-route</option>
              <option value="busy">busy</option>
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
    </main>
  );
}
