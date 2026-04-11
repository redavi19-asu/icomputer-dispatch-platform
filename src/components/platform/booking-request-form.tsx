"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { WorkspaceSettingsState } from "@/lib/platform/workspace-preferences";
import { getBookingSurfaceConfig } from "@/lib/platform/surface-preferences";

type BookingRequestFormProps = {
  companySlug: string;
  companyColor: string;
  ctaLabel: string;
  selectedService?: string;
  onCancel?: () => void;
  onSuccess?: () => void;
  workspaceSettings: WorkspaceSettingsState;
  services: Array<{
    id: string;
    name: string;
    description: string;
  }>;
};

export function BookingRequestForm({
  companySlug,
  companyColor,
  ctaLabel,
  selectedService,
  onCancel,
  onSuccess,
  workspaceSettings,
  services,
}: BookingRequestFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifyingAddress, setIsVerifyingAddress] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"success" | "error" | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [serviceValue, setServiceValue] = useState(selectedService ?? "");
  const [addressValue, setAddressValue] = useState("");
  const [verifiedAddress, setVerifiedAddress] = useState<string | null>(null);
  const [addressError, setAddressError] = useState<string | null>(null);
  const [pickupAddressValue, setPickupAddressValue] = useState("");
  const [dropoffAddressValue, setDropoffAddressValue] = useState("");
  const [submittedJobId, setSubmittedJobId] = useState<string | null>(null);

  const bookingSurface = getBookingSurfaceConfig(workspaceSettings);
  const requiresServiceAddress = bookingSurface.intakeFields.some(
    (field) => field.key === "serviceAddress"
  );
  const requiresPickupAddress = bookingSurface.intakeFields.some(
    (field) => field.key === "pickupAddress"
  );
  const requiresDropoffAddress = bookingSurface.intakeFields.some(
    (field) => field.key === "dropoffAddress"
  );
  const allowsIntermediateStops = bookingSurface.intakeFields.some(
    (field) => field.key === "intermediateStops"
  );

  const REGION_VIEWBOX = "-79.8,40.2,-75.0,36.5";
  const DEFAULT_LOCAL_REGION_SUFFIX = "Silver Spring, MD";

  const isVagueAddress = (value: string) => {
    const trimmed = value.trim();
    const hasStateHint = /\b(MD|DC|VA|Maryland|Virginia|District of Columbia|Washington,?\s*DC)\b/i.test(
      trimmed
    );
    const hasZip = /\b\d{5}(?:-\d{4})?\b/.test(trimmed);
    const tokenCount = trimmed.split(/\s+/).filter(Boolean).length;

    return !hasStateHint && !hasZip && tokenCount <= 4;
  };

  const verifyAddress = async (rawAddress: string) => {
    const trimmed = rawAddress.trim();
    if (!trimmed) {
      setAddressError("Please enter a service address.");
      setVerifiedAddress(null);
      return false;
    }

    setIsVerifyingAddress(true);
    setAddressError(null);

    try {
      const queryCandidates = [trimmed];
      if (isVagueAddress(trimmed)) {
        queryCandidates.push(`${trimmed}, ${DEFAULT_LOCAL_REGION_SUFFIX}`);
      }

      let verified = false;

      for (const candidate of queryCandidates) {
        const controller = new AbortController();
        const timeoutId = window.setTimeout(() => controller.abort(), 8000);
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=us&bounded=1&viewbox=${encodeURIComponent(
            REGION_VIEWBOX
          )}&q=${encodeURIComponent(candidate)}`,
          {
            headers: {
              Accept: "application/json",
            },
            signal: controller.signal,
          }
        );
        window.clearTimeout(timeoutId);

        if (!response.ok) continue;

        const results = await response.json();
        const topResult = results?.[0];
        if (topResult?.lat && topResult?.lon) {
          verified = true;
          break;
        }
      }

      if (!verified) {
        setVerifiedAddress(null);
        setAddressError("Please enter a more complete address.");
        return false;
      }

      setVerifiedAddress(trimmed);
      setAddressError(null);
      return true;
    } catch {
      setVerifiedAddress(trimmed);
      setAddressError(null);
      return true;
    } finally {
      setIsVerifyingAddress(false);
    }
  };

  useEffect(() => {
    setServiceValue(selectedService ?? "");
  }, [selectedService]);

  const fieldClassName =
    "w-full rounded-xl border border-white/10 bg-slate-950/80 px-4 py-3 text-white outline-none placeholder:text-white/35 focus:border-white/25 focus:ring-2 focus:ring-white/10";

  return (
    <>
      <form
        className="mt-8 space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setSubmitStatus(null);
          setFormError(null);

          const form = e.currentTarget;
          const formData = new FormData(form);

          const name = String(formData.get("name") ?? "").trim();
          const phone = String(formData.get("phone") ?? "").trim();
          const service = String(formData.get("service") ?? "").trim();
          const details = String(formData.get("details") ?? "").trim();
          const submittedServiceAddress = String(formData.get("address") ?? "").trim();
          const submittedPickupAddress = String(formData.get("pickupAddress") ?? "").trim();
          const submittedDropoffAddress = String(formData.get("dropoffAddress") ?? "").trim();

          const primaryAddress = requiresServiceAddress
            ? submittedServiceAddress
            : submittedPickupAddress;
          const secondaryAddress = submittedDropoffAddress;

          if (!name || !phone || !service) {
            setFormError("Please complete name, phone number, and service type.");
            return;
          }

          if (requiresServiceAddress && !primaryAddress) {
            setAddressError("Please enter a service address.");
            setFormError("Please enter the required address fields.");
            return;
          }

          if (requiresPickupAddress && !primaryAddress) {
            setFormError("Please enter a pickup address.");
            return;
          }

          if (requiresDropoffAddress && !secondaryAddress) {
            setFormError("Please enter a dropoff address.");
            return;
          }

          const isAddressVerified = verifiedAddress === primaryAddress;

          if (!isAddressVerified) {
            const verified = await verifyAddress(primaryAddress);
            if (!verified) return;
          }

          if (requiresDropoffAddress) {
            const dropoffVerified = await verifyAddress(secondaryAddress);
            if (!dropoffVerified) return;
          }

          setIsSubmitting(true);

          try {
            const payload = {
              companySlug,
              name,
              phone,
              service,
              address: requiresServiceAddress
                ? primaryAddress
                : [primaryAddress, secondaryAddress].filter(Boolean).join(" -> "),
              details,
            };

            let data: { job?: { id: string } } | null = null;

            try {
              const res = await fetch("/api/jobs", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
              });

              if (!res.ok) {
                throw new Error("Failed to submit request");
              }

              data = await res.json();
            } catch {
              const localJob = {
                id: crypto.randomUUID(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                status: "Awaiting Dispatch",
                companySlug,
                name,
                phone,
                service,
                address: requiresServiceAddress
                  ? primaryAddress
                  : [primaryAddress, secondaryAddress].filter(Boolean).join(" -> "),
                details,
                driverId: null,
                etaMinutes: null,
                statusHistory: [
                  {
                    at: new Date().toISOString(),
                    label: "Request submitted",
                    status: "Awaiting Dispatch",
                    detail: "Customer booking created from booking page",
                  },
                ],
              };

              const existing = JSON.parse(localStorage.getItem("dispatch_jobs") ?? "[]");
              localStorage.setItem("dispatch_jobs", JSON.stringify([localJob, ...existing]));
              data = { job: { id: localJob.id } };
            }

            form.reset();
            setServiceValue(selectedService ?? "");
            setAddressValue("");
            setPickupAddressValue("");
            setDropoffAddressValue("");
            setVerifiedAddress(null);
            setAddressError(null);
            setSubmittedJobId(data?.job?.id ?? null);
            setSubmitStatus("success");
            onSuccess?.();
          } catch (error) {
            console.error(error);
            setSubmitStatus("error");
          } finally {
            setIsSubmitting(false);
          }
        }}
      >
        <div>
          <label className="mb-2 block text-sm text-white/75">Full Name</label>
          <input
            name="name"
            type="text"
            placeholder="Customer full name"
            className={fieldClassName}
            style={{ colorScheme: "dark" }}
            required
          />
        </div>

        <div>
          <label className="mb-2 block text-sm text-white/75">Phone Number</label>
          <input
            name="phone"
            type="tel"
            placeholder="(555) 555-5555"
            className={fieldClassName}
            style={{ colorScheme: "dark" }}
            required
          />
        </div>

        <div>
          <label className="mb-2 block text-sm text-white/75">Service Type</label>
          <select
            name="service"
            value={serviceValue}
            onChange={(event) => setServiceValue(event.target.value)}
            className={`${fieldClassName} appearance-none`}
            style={{ colorScheme: "dark" }}
            required
          >
            <option value="" className="bg-slate-900 text-white">
              Select a service
            </option>
            {services.map((service) => (
              <option
                key={service.id}
                value={service.name}
                className="bg-slate-900 text-white"
              >
                {service.name}
              </option>
            ))}
          </select>
        </div>

        {requiresServiceAddress ? (
          <div>
            <label className="mb-2 block text-sm text-white/75">Service Address</label>
            <div className="space-y-2">
              <input
                name="address"
                type="text"
                autoComplete="street-address"
                placeholder="Street address or landmark"
                value={addressValue}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  setAddressValue(nextValue);

                  if (verifiedAddress && verifiedAddress !== nextValue.trim()) {
                    setVerifiedAddress(null);
                  }

                  if (addressError) {
                    setAddressError(null);
                  }
                }}
                className={fieldClassName}
                style={{ colorScheme: "dark" }}
                required
              />

              <div className="flex items-center justify-between gap-3">
                <p
                  className={`text-xs ${
                    verifiedAddress === addressValue.trim() && addressValue.trim()
                      ? "text-emerald-300"
                      : addressError
                      ? "text-rose-300"
                      : "text-white/50"
                  }`}
                >
                  {verifiedAddress === addressValue.trim() && addressValue.trim()
                    ? "Address verified"
                    : addressError ?? "Verify address before submitting"}
                </p>

                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => void verifyAddress(addressValue)}
                  disabled={isVerifyingAddress || !addressValue.trim()}
                  className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs text-white hover:bg-white/10 disabled:opacity-50"
                >
                  {isVerifyingAddress ? "Verifying..." : "Verify Address"}
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        {requiresPickupAddress ? (
          <div>
            <label className="mb-2 block text-sm text-white/75">Pickup Address</label>
            <input
              name="pickupAddress"
              type="text"
              autoComplete="street-address"
              placeholder="Pickup location"
              value={pickupAddressValue}
              onChange={(event) => setPickupAddressValue(event.target.value)}
              className={fieldClassName}
              style={{ colorScheme: "dark" }}
              required
            />
          </div>
        ) : null}

        {requiresDropoffAddress ? (
          <div>
            <label className="mb-2 block text-sm text-white/75">Dropoff Address</label>
            <input
              name="dropoffAddress"
              type="text"
              autoComplete="street-address"
              placeholder="Dropoff location"
              value={dropoffAddressValue}
              onChange={(event) => setDropoffAddressValue(event.target.value)}
              className={fieldClassName}
              style={{ colorScheme: "dark" }}
              required
            />
          </div>
        ) : null}

        {allowsIntermediateStops ? (
          <div>
            <label className="mb-2 block text-sm text-white/75">Intermediate Stops</label>
            <textarea
              name="intermediateStops"
              rows={3}
              placeholder="Optional stop list, one per line"
              className={`${fieldClassName} min-h-[110px] resize-none`}
              style={{ colorScheme: "dark" }}
            />
          </div>
        ) : null}

        {bookingSurface.verificationLanguage ? (
          <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100">
            {bookingSurface.verificationLanguage}
          </div>
        ) : null}

        {formError ? (
          <div className="rounded-xl border border-rose-500/35 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {formError}
          </div>
        ) : null}

        <div>
          <label className="mb-2 block text-sm text-white/75">Details</label>
          <textarea
            name="details"
            rows={5}
            placeholder="Describe what the customer needs"
            className={`${fieldClassName} min-h-[140px] resize-none`}
            style={{ colorScheme: "dark" }}
          />
        </div>

        <Button
          type="submit"
          disabled={isSubmitting || isVerifyingAddress}
          className="w-full rounded-xl py-6 text-base font-semibold text-slate-950 hover:opacity-90 disabled:opacity-60"
          style={{ backgroundColor: companyColor }}
        >
          {isSubmitting ? "Submitting..." : ctaLabel}
        </Button>

        {submitStatus === "success" ? (
          <div className="rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            Request submitted successfully.
            {submittedJobId ? (
              <span className="ml-1">
                Track status at{" "}
                <Link href={`/track/${submittedJobId}`} className="font-semibold underline">
                  /track/{submittedJobId}
                </Link>
                .
              </span>
            ) : null}
          </div>
        ) : null}

        {submitStatus === "error" ? (
          <div className="rounded-xl border border-rose-500/35 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            We could not submit your request right now. Please try again.
          </div>
        ) : null}

        {onCancel ? (
          <Button
            type="button"
            onClick={onCancel}
            variant="secondary"
            className="w-full rounded-xl border border-white/15 bg-white/5 py-6 text-base font-semibold text-white hover:bg-white/10"
          >
            Close
          </Button>
        ) : null}
      </form>
    </>
  );
}
