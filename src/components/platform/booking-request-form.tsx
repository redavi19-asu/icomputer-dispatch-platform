"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type BookingRequestFormProps = {
  companySlug: string;
  companyColor: string;
  ctaLabel: string;
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
  services,
}: BookingRequestFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fieldClassName =
    "w-full rounded-xl border border-white/10 bg-slate-950/80 px-4 py-3 text-white outline-none placeholder:text-white/35 focus:border-white/25 focus:ring-2 focus:ring-white/10";

  return (
    <form
      className="mt-8 space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
          const form = e.currentTarget;
          const formData = new FormData(form);

          const payload = {
            companySlug,
            name: formData.get("name"),
            phone: formData.get("phone"),
            service: formData.get("service"),
            address: formData.get("address"),
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

          await res.json();
          alert("Request submitted!");
          form.reset();
        } catch (error) {
          console.error(error);
          alert("Something went wrong. Please try again.");
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
          defaultValue=""
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
        <input
          name="address"
          type="text"
          placeholder="Street address or landmark"
          className={fieldClassName}
          style={{ colorScheme: "dark" }}
          required
        />
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
        disabled={isSubmitting}
        className="w-full rounded-xl py-6 text-base font-semibold text-slate-950 hover:opacity-90 disabled:opacity-60"
        style={{ backgroundColor: companyColor }}
      >
        {isSubmitting ? "Submitting..." : ctaLabel}
      </Button>
    </form>
  );
}
