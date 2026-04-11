"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowRight, Building2, Clock3, MapPin, ShieldCheck } from "lucide-react";

import { AppShellNav } from "@/components/platform/app-shell-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BookingRequestForm } from "@/components/platform/booking-request-form";
import { Modal } from "@/components/ui/modal";
import { getBookingPageConfigByCompany, getCompanyBySlug } from "@/lib/platform/selectors";
import {
  defaultWorkspaceSettings,
  readWorkspaceSettings,
  type WorkspaceSettingsState,
} from "@/lib/platform/workspace-preferences";
import { getBookingSurfaceConfig } from "@/lib/platform/surface-preferences";

const WORKSPACE_SETTINGS_UPDATED_EVENT = "dispatch:workspace-settings-updated";

export default function CompanyBookingPage() {
  const params = useParams<{ company: string }>();
  const companySlug = Array.isArray(params.company) ? params.company[0] : params.company;
  const company = getCompanyBySlug(companySlug);

  const bookingConfig = useMemo(() => {
    if (!company) return null;
    return getBookingPageConfigByCompany(company.id);
  }, [company]);

  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [modalSelectedService, setModalSelectedService] = useState("");
  const [workspaceSettings, setWorkspaceSettings] = useState<WorkspaceSettingsState>(() => ({
    ...defaultWorkspaceSettings,
    companySlug: companySlug || "build-electric",
    companyName: company?.name ?? defaultWorkspaceSettings.companyName,
  }));
  const bookingSurface = getBookingSurfaceConfig(workspaceSettings);

  useEffect(() => {
    const syncSettings = () => {
      setWorkspaceSettings(readWorkspaceSettings(companySlug || "build-electric"));
    };

    syncSettings();
    window.addEventListener("storage", syncSettings);
    window.addEventListener(WORKSPACE_SETTINGS_UPDATED_EVENT, syncSettings as EventListener);

    return () => {
      window.removeEventListener("storage", syncSettings);
      window.removeEventListener(WORKSPACE_SETTINGS_UPDATED_EVENT, syncSettings as EventListener);
    };
  }, [companySlug]);

  const openBookingModal = (serviceName?: string) => {
    setModalSelectedService(serviceName ?? "");
    setIsServiceModalOpen(true);
  };

  const scrollToServiceOptions = () => {
    document.getElementById("service-options-section")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  if (!company || !bookingConfig) {
    return (
      <main className="min-h-screen bg-slate-950 text-white">
        <section className="mx-auto max-w-7xl px-6 py-16 md:py-24">
          <p className="text-white/70">Booking page not found.</p>
        </section>
      </main>
    );
  }

  const companyColor = company.primaryColor ?? "#06b6d4";

  if (!bookingSurface.enabled) {
    return (
      <main className="min-h-screen bg-slate-950 text-white">
        <AppShellNav />
        <section className="mx-auto max-w-4xl px-6 py-16 md:py-24">
          <Card className="rounded-2xl border border-white/10 bg-white/5 text-white shadow-none">
            <CardContent className="p-6">
              <h1 className="text-2xl font-semibold">Booking is disabled</h1>
              <p className="mt-3 text-white/70">
                This company is currently using DispatchOS as an operations layer behind an
                existing website. Intake can still be routed through dashboard or external forms.
              </p>
            </CardContent>
          </Card>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen scroll-smooth bg-slate-950 text-white">
      <AppShellNav />
      <section className="relative overflow-hidden border-b border-white/10">
        <div
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            background: `radial-gradient(circle at top, ${companyColor}, transparent 45%)`,
          }}
        />
        <div className="relative z-10 mx-auto max-w-7xl px-6 py-16 md:py-24">
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80">
              <Building2 className="h-4 w-4" />
              {workspaceSettings.companyName} Booking Page
            </div>

            <h1 className="mt-6 text-4xl font-semibold tracking-tight md:text-6xl">
              {bookingConfig.headline}
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-7 text-white/70 md:text-lg">
              {bookingConfig.subheadline}
            </p>

            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-cyan-100">
                Mode: {bookingSurface.modeLabel}
              </span>
              <span className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-cyan-100">
                Route template: {bookingSurface.routeTemplateLabel}
              </span>
              <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-white/75">
                Flow: {bookingSurface.flowLabel}
              </span>
            </div>

            {bookingSurface.verificationLanguage ? (
              <p className="mt-4 max-w-2xl rounded-xl border border-cyan-500/35 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100">
                {bookingSurface.verificationLanguage}
              </p>
            ) : null}

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button
                  onClick={() => openBookingModal()}
                  className="h-9 rounded-lg border border-cyan-500/35 bg-cyan-500/15 px-3 text-xs font-semibold text-cyan-100 hover:bg-cyan-500/25"
                  style={{ backgroundColor: companyColor }}
                >
                  {bookingConfig.ctaLabel}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>

                <Button
                  onClick={scrollToServiceOptions}
                  variant="secondary"
                  className="h-9 rounded-lg border border-white/15 bg-white/5 px-3 text-xs font-semibold text-white hover:bg-white/10"
                >
                  View Service Options
                </Button>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center gap-2 text-white/80">
                  <MapPin className="h-4 w-4" />
                  Coverage
                </div>
                <p className="mt-2 text-sm text-white/65">Company-defined service area</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center gap-2 text-white/80">
                  <Clock3 className="h-4 w-4" />
                  Response
                </div>
                <p className="mt-2 text-sm text-white/65">Fast dispatch and live updates</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center gap-2 text-white/80">
                  <ShieldCheck className="h-4 w-4" />
                  Confidence
                </div>
                <p className="mt-2 text-sm text-white/65">Professional branded customer experience</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="service-options-section" className="mx-auto max-w-7xl px-6 py-16 md:py-24">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
              Service options
            </h2>
            <p className="mt-3 max-w-2xl text-white/65">
              This branded page is what a company can send to customers so they can learn about
              services and start a request from a professional-looking booking experience.
            </p>

            <div className="mt-10 grid gap-6 md:grid-cols-2">
              {bookingConfig.services.map((service) => (
                <Card
                  key={service.id}
                  className="rounded-2xl border border-white/10 bg-white/5 text-white shadow-none"
                >
                  <CardContent className="p-6">
                    <div
                      className="inline-flex rounded-full px-3 py-1 text-xs font-semibold text-slate-950"
                      style={{ backgroundColor: companyColor }}
                    >
                      {workspaceSettings.companyName}
                    </div>

                    <h3 className="mt-4 text-xl font-semibold">{service.name}</h3>
                    <p className="mt-3 text-sm leading-6 text-white/65">{service.description}</p>

                    <Button
                        onClick={() => openBookingModal(service.name)}
                        className="mt-6 h-9 rounded-lg border border-cyan-500/35 bg-cyan-500/15 px-3 text-xs font-semibold text-cyan-100 hover:bg-cyan-500/25"
                        style={{ backgroundColor: companyColor }}
                      >
                        Request {service.name}
                      </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div id="request-section">
            <Card
              className="rounded-2xl border border-white/10 text-white shadow-none"
              style={{ backgroundColor: "rgba(15, 23, 42, 0.96)" }}
            >
              <CardContent className="p-6">
                <h2 className="text-2xl font-semibold">Start your request</h2>
                <p className="mt-3 text-sm leading-6 text-white/65">
                  Use one guided booking flow to submit your service request and dispatch details.
                </p>

                <div className="mt-6 space-y-3">
                  <Button
                    onClick={() => openBookingModal()}
                    className="w-full rounded-xl px-5 py-5 text-sm font-semibold text-slate-950 hover:opacity-90"
                    style={{ backgroundColor: companyColor }}
                  >
                    {bookingConfig.ctaLabel}
                  </Button>

                  <Button
                    onClick={() => openBookingModal(bookingConfig.services[0]?.name)}
                    variant="secondary"
                    className="w-full rounded-xl border border-white/15 bg-white/5 px-5 py-5 text-sm font-semibold text-white hover:bg-white/10"
                  >
                    {bookingConfig.services[0]?.name
                      ? `Request ${bookingConfig.services[0].name}`
                      : "Request Service"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <Modal
        isOpen={isServiceModalOpen}
        onClose={() => setIsServiceModalOpen(false)}
        title={modalSelectedService ? `Request ${modalSelectedService}` : "Request Service"}
      >
        <BookingRequestForm
          companySlug={company.slug}
          services={bookingConfig.services}
          companyColor={companyColor}
          ctaLabel={bookingConfig.ctaLabel}
          selectedService={modalSelectedService}
          onCancel={() => setIsServiceModalOpen(false)}
          onSuccess={() => {
            setTimeout(() => setIsServiceModalOpen(false), 1200);
          }}
          workspaceSettings={workspaceSettings}
        />
      </Modal>
    </main>
  );
}