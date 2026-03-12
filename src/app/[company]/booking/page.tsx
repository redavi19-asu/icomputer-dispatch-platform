import { notFound } from "next/navigation";
import { ArrowRight, Building2, Clock3, MapPin, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BookingRequestForm } from "@/components/platform/booking-request-form";
import { companies } from "@/lib/platform/mock-data";
import { getBookingPageConfigByCompany, getCompanyBySlug } from "@/lib/platform/selectors";

export function generateStaticParams() {
  return companies.map((company) => ({
    company: company.slug,
  }));
}

type CompanyBookingPageProps = {
  params: Promise<{
    company: string;
  }>;
};

export default async function CompanyBookingPage({ params }: CompanyBookingPageProps) {
  const { company: companySlug } = await params;
  const company = getCompanyBySlug(companySlug);

  if (!company) {
    notFound();
  }

  const bookingConfig = getBookingPageConfigByCompany(company.id);

  if (!bookingConfig) {
    notFound();
  }

  const companyColor = company.primaryColor ?? "#06b6d4";

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="relative overflow-hidden border-b border-white/10">
        <div
          className="absolute inset-0 opacity-20"
          style={{
            background: `radial-gradient(circle at top, ${companyColor}, transparent 45%)`,
          }}
        />
        <div className="mx-auto max-w-7xl px-6 py-16 md:py-24">
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80">
              <Building2 className="h-4 w-4" />
              {company.name} Booking Page
            </div>

            <h1 className="mt-6 text-4xl font-semibold tracking-tight md:text-6xl">
              {bookingConfig.headline}
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-7 text-white/70 md:text-lg">
              {bookingConfig.subheadline}
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button
                className="rounded-xl px-6 py-6 text-base font-semibold text-slate-950 hover:opacity-90"
                style={{ backgroundColor: companyColor }}
              >
                {bookingConfig.ctaLabel}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>

              <Button
                variant="secondary"
                className="rounded-xl border border-white/15 bg-white/5 px-6 py-6 text-base font-semibold text-white hover:bg-white/10"
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

      <section className="mx-auto max-w-7xl px-6 py-16 md:py-24">
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
                      {company.name}
                    </div>

                    <h3 className="mt-4 text-xl font-semibold">{service.name}</h3>
                    <p className="mt-3 text-sm leading-6 text-white/65">{service.description}</p>

                    <Button
                      className="mt-6 rounded-xl px-5 py-5 text-sm font-semibold text-slate-950 hover:opacity-90"
                      style={{ backgroundColor: companyColor }}
                    >
                      Request {service.name}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div>
            <Card
              className="rounded-2xl border border-white/10 text-white shadow-none"
              style={{ backgroundColor: "rgba(15, 23, 42, 0.96)" }}
            >
              <CardContent className="p-6">
                <h2 className="text-2xl font-semibold">Request form preview</h2>
                <p className="mt-3 text-sm leading-6 text-white/65">
                  This is the customer-facing intake area. Later we can connect this to your real
                  request workflow, payment flow, and dispatch creation.
                </p>

                <BookingRequestForm
                  companySlug={company.slug}
                  services={bookingConfig.services}
                  companyColor={companyColor}
                  ctaLabel={bookingConfig.ctaLabel}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </main>
  );
}