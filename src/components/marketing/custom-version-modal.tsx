"use client";

import { FormEvent, useState } from "react";
import { X } from "lucide-react";

type CustomVersionModalProps = {
  open: boolean;
  onClose: () => void;
};

export default function CustomVersionModal({ open, onClose }: CustomVersionModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    const form = new FormData(event.currentTarget);
    const params = new URLSearchParams();
    params.append("name", String(form.get("name") || ""));
    params.append("email", String(form.get("email") || ""));
    params.append("phone", String(form.get("phone") || ""));
    params.append("service", "DispatchOS Custom Version");
    params.append(
      "message",
      [
        `Company: ${String(form.get("company") || "Not provided")}`,
        `DispatchOS custom request: ${String(form.get("message") || "")}`,
        `Preferred contact: ${String(form.get("contactMethod") || "Email")}`,
      ].join("\n")
    );

    try {
      await fetch(
        "https://script.google.com/macros/s/AKfycbwrQT9Z54IEEtk4PIMmA5fR52dFFdZoXt1cyVna5xj2lf9nfgu8lP9Ry22k9YDrnwKs/exec",
        {
          method: "POST",
          body: params.toString(),
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        }
      );
      setSent(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function closeModal() {
    setSent(false);
    setError("");
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-md"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) closeModal();
      }}
    >
      <div className="relative max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-cyan-400/25 bg-slate-950 p-7 shadow-2xl md:p-10">
        <button
          type="button"
          onClick={closeModal}
          className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-white/70 transition hover:bg-white/[0.1] hover:text-white"
          aria-label="Close custom request form"
        >
          <X className="h-5 w-5" />
        </button>

        {!sent ? (
          <>
            <p className="text-xs uppercase tracking-[0.25em] text-cyan-300">I Computer Anything</p>
            <h2 className="mt-3 text-3xl font-semibold">Request a Custom DispatchOS Version</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-white/60">
              Tell us what your company needs changed, branded, connected, or automated.
            </p>

            <form onSubmit={handleSubmit} className="mt-8 grid gap-5 sm:grid-cols-2">
              <label className="text-sm text-white/75">
                Full Name *
                <input name="name" required className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3 text-white outline-none focus:border-cyan-400/50" />
              </label>
              <label className="text-sm text-white/75">
                Company
                <input name="company" className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3 text-white outline-none focus:border-cyan-400/50" />
              </label>
              <label className="text-sm text-white/75">
                Email *
                <input type="email" name="email" required className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3 text-white outline-none focus:border-cyan-400/50" />
              </label>
              <label className="text-sm text-white/75">
                Phone *
                <input type="tel" name="phone" required className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3 text-white outline-none focus:border-cyan-400/50" />
              </label>
              <label className="text-sm text-white/75 sm:col-span-2">
                What do you need DispatchOS to do? *
                <textarea name="message" required rows={5} className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3 text-white outline-none focus:border-cyan-400/50" />
              </label>
              <label className="text-sm text-white/75 sm:col-span-2">
                Preferred Contact
                <select name="contactMethod" className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none focus:border-cyan-400/50">
                  <option>Email</option>
                  <option>Phone</option>
                  <option>Text</option>
                </select>
              </label>

              {error && <p className="sm:col-span-2 text-sm text-rose-300">{error}</p>}

              <button
                type="submit"
                disabled={submitting}
                className="sm:col-span-2 rounded-xl bg-cyan-400 px-6 py-4 font-bold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Sending..." : "Send Custom Request"}
              </button>
            </form>
          </>
        ) : (
          <div className="py-12 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-emerald-400/30 bg-emerald-500/10 text-2xl text-emerald-300">✓</div>
            <h2 className="mt-6 text-3xl font-semibold">Request Sent</h2>
            <p className="mt-3 text-white/60">We received your DispatchOS custom-version request.</p>
            <button onClick={closeModal} className="mt-7 rounded-xl border border-white/15 px-6 py-3 font-semibold text-white hover:bg-white/[0.06]">Close</button>
          </div>
        )}
      </div>
    </div>
  );
}
