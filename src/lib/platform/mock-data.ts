import type { BookingPageConfig, Company, Customer, Driver, Job } from "./types";

export const companies: Company[] = [
  {
    id: "co_001",
    name: "ChargeNext",
    slug: "chargenext",
    driverAcceptanceMode: "manual",
    primaryColor: "#06b6d4",
    supportPhone: "(240) 555-0101",
    supportEmail: "support@chargenext.example",
    plan: "starter",
  },
  {
    id: "co_002",
    name: "Build & Electric",
    slug: "build-electric",
    driverAcceptanceMode: "auto",
    primaryColor: "#22c55e",
    supportPhone: "(240) 555-0144",
    supportEmail: "ops@buildelectric.example",
    plan: "starter",
  },
  {
    id: "co_003",
    name: "Roadside Hero",
    slug: "roadside-hero",
    driverAcceptanceMode: "manual",
    primaryColor: "#f59e0b",
    supportPhone: "(240) 555-0199",
    supportEmail: "hello@roadsidehero.example",
    plan: "growth",
  },
];

export const customers: Customer[] = [
  {
    id: "cust_001",
    companyId: "co_001",
    name: "Ryan Davis",
    phone: "(240) 555-0100",
    email: "ryan@example.com",
    address: "Washington, DC",
  },
  {
    id: "cust_002",
    companyId: "co_002",
    name: "Metro Mobile Tech Client",
    phone: "(301) 555-0102",
    email: "client2@example.com",
    address: "Silver Spring, MD",
  },
  {
    id: "cust_003",
    companyId: "co_003",
    name: "Priority Fleet Customer",
    phone: "(703) 555-0103",
    email: "fleet@example.com",
    address: "Arlington, VA",
  },
];

export const drivers: Driver[] = [
  {
    id: "drv_001",
    companyId: "co_001",
    name: "A. Johnson",
    phone: "(240) 555-1001",
    status: "available",
    zone: "North Zone",
  },
  {
    id: "drv_002",
    companyId: "co_002",
    name: "S. Davis",
    phone: "(240) 555-1002",
    status: "en-route",
    zone: "Central Zone",
  },
  {
    id: "drv_003",
    companyId: "co_003",
    name: "R. Brooks",
    phone: "(240) 555-1003",
    status: "busy",
    zone: "South Zone",
  },
];

export const jobs: Job[] = [
  {
    id: "JOB-1042",
    companyId: "co_002",
    customerId: "cust_002",
    title: "Emergency Service Request",
    serviceType: "Emergency Service",
    status: "awaiting-dispatch",
    etaMinutes: null,
    driverId: null,
    address: "Silver Spring, MD",
    notes: "Customer needs immediate service.",
  },
  {
    id: "JOB-1043",
    companyId: "co_002",
    customerId: "cust_002",
    title: "Scheduled Service",
    serviceType: "Scheduled Service",
    status: "en-route",
    etaMinutes: 12,
    driverId: "drv_002",
    address: "Rockville, MD",
    notes: "Customer scheduled ahead of time.",
  },
  {
    id: "JOB-1044",
    companyId: "co_003",
    customerId: "cust_003",
    title: "Priority Request",
    serviceType: "Priority Request",
    status: "in-progress",
    etaMinutes: 6,
    driverId: "drv_003",
    address: "Arlington, VA",
    notes: "Priority fleet support request.",
  },
];

export const bookingPageConfigs: BookingPageConfig[] = [
  {
    companyId: "co_001",
    headline: "Fast mobile EV charging when you need it most",
    subheadline: "Request service, get dispatched quickly, and track your technician in real time.",
    ctaLabel: "Request Service",
    services: [
      { id: "svc_001", name: "Emergency Charge", description: "Fast dispatch for urgent charging situations." },
      { id: "svc_002", name: "Scheduled Charge", description: "Book service for home, work, or planned stops." },
    ],
  },
  {
    companyId: "co_002",
    headline: "Build & Electric field service dispatch",
    subheadline: "Professional branded booking page for customers and dispatch-ready operations.",
    ctaLabel: "Book Now",
    services: [
      { id: "svc_003", name: "Emergency Service", description: "Immediate response service requests." },
      { id: "svc_004", name: "Routine Service", description: "Scheduled service and standard support." },
    ],
  },
];
