"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

type BookingRequestFormProps = {
  companySlug: string;
  companyColor: string;
  ctaLabel: string;
  selectedService?: string;
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
  services,
}: BookingRequestFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifyingAddress, setIsVerifyingAddress] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [serviceValue, setServiceValue] = useState(selectedService ?? "");
  const [addressValue, setAddressValue] = useState("");
  const [verifiedAddress, setVerifiedAddress] = useState<string | null>(null);
  const [addressError, setAddressError] = useState<string | null>(null);
  const [submittedJobId, setSubmittedJobId] = useState<string | null>(null);

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
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=us&bounded=1&viewbox=${encodeURIComponent(
            REGION_VIEWBOX
          )}&q=${encodeURIComponent(candidate)}`,
          {
            headers: {
              Accept: "application/json",
            },
          }
        );

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
      setVerifiedAddress(null);
      setAddressError("Address could not be verified. Please try again.");
      return false;
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
          const trimmedAddress = addressValue.trim();
          const isAddressVerified = verifiedAddress === trimmedAddress;

          if (!isAddressVerified) {
            const verified = await verifyAddress(trimmedAddress);
            if (!verified) return;
          }

          setIsSubmitting(true);

          try {
            const form = e.currentTarget;
            const formData = new FormData(form);

            const payload = {
              companySlug,
              name: formData.get("name"),
              phone: formData.get("phone"),
              service: formData.get("service"),
              address: trimmedAddress,
              details: formData.get("details"),
            };

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

            const data = await res.json();
            form.reset();
            setServiceValue(selectedService ?? "");
            setAddressValue("");
            setVerifiedAddress(null);
            setAddressError(null);
            setSubmittedJobId(data?.job?.id ?? null);
            setShowSuccessModal(true);
          } catch (error) {
            console.error(error);
            setShowErrorModal(true);
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

        <div>
          <label className="mb-2 block text-sm text-white/75">Service Address</label>
          <div className="space-y-2">
            <input
              name="address"
              type="text"
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
              onBlur={() => {
                const trimmed = addressValue.trim();
                if (!trimmed || verifiedAddress === trimmed) return;
                void verifyAddress(trimmed);
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
          disabled={
            isSubmitting ||
            isVerifyingAddress ||
            verifiedAddress !== addressValue.trim() ||
            !addressValue.trim()
          }
          className="w-full rounded-xl py-6 text-base font-semibold text-slate-950 hover:opacity-90 disabled:opacity-60"
          style={{ backgroundColor: companyColor }}
        >
          {isSubmitting ? "Submitting..." : ctaLabel}
        </Button>
      </form>

      <Modal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        title="Request Submitted"
      >
        <div className="space-y-4 text-slate-800">
          <div className="flex justify-center">
            <div className="rounded-full bg-emerald-100 p-4">
              <CheckCircle2 className="h-10 w-10 text-emerald-600" />
            </div>
          </div>

          <div className="text-center">
            <p className="text-lg font-semibold">Your request was sent successfully.</p>
            <p className="mt-2 text-sm text-slate-600">
              Dispatch has been notified and your request is now in the queue.
            </p>
            {submittedJobId ? (
              <p className="mt-2 text-sm text-slate-600">
                Track status: <Link href={`/track/${submittedJobId}`} className="font-semibold text-cyan-700 underline">/track/{submittedJobId}</Link>
              </p>
            ) : null}
            <p className="mt-2 text-sm text-slate-600">
              You can close this window or submit another request if needed.
            </p>
          </div>

          <div className="pt-2">
            <Button
              onClick={() => setShowSuccessModal(false)}
              className="w-full rounded-xl bg-slate-900 py-6 text-base font-semibold text-white hover:bg-slate-800"
            >
              Close
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showErrorModal}
        onClose={() => setShowErrorModal(false)}
        title="Submission Failed"
      >
        <div className="space-y-4 text-slate-800">
          <div className="flex justify-center">
            <div className="rounded-full bg-rose-100 p-4">
              <AlertCircle className="h-10 w-10 text-rose-600" />
            </div>
          </div>

          <div className="text-center">
            <p className="text-lg font-semibold">Something went wrong.</p>
            <p className="mt-2 text-sm text-slate-600">
              We could not submit your request right now. Please try again.
            </p>
          </div>

          <div className="pt-2">
            <Button
              onClick={() => setShowErrorModal(false)}
              className="w-full rounded-xl bg-slate-900 py-6 text-base font-semibold text-white hover:bg-slate-800"
            >
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
