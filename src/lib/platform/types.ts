export type Company = {
  id: string;
  name: string;
  slug: string;
  primaryColor?: string;
  logoUrl?: string;
  supportPhone?: string;
  supportEmail?: string;
  plan: "starter" | "growth" | "pro";
};

export type DriverStatus = "available" | "en-route" | "busy" | "offline";

export type Driver = {
  id: string;
  companyId: string;
  name: string;
  phone?: string;
  status: DriverStatus;
  zone?: string;
};

export type JobStatus =
  | "awaiting-dispatch"
  | "assigned"
  | "en-route"
  | "arrived"
  | "in-progress"
  | "completed"
  | "cancelled";

export type Job = {
  id: string;
  companyId: string;
  customerId: string;
  title: string;
  serviceType: string;
  status: JobStatus;
  etaMinutes?: number | null;
  driverId?: string | null;
  address?: string;
  notes?: string;
};

export type Customer = {
  id: string;
  companyId: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
};

export type BookingPageConfig = {
  companyId: string;
  headline: string;
  subheadline: string;
  ctaLabel: string;
  heroImageUrl?: string;
  services: Array<{
    id: string;
    name: string;
    description: string;
  }>;
};
