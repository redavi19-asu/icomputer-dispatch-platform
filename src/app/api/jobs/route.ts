import { NextResponse } from "next/server";

type JobRecord = {
  id: string;
  createdAt: string;
  status: string;
  companySlug?: string | null;
  name?: FormDataEntryValue | null;
  phone?: FormDataEntryValue | null;
  service?: FormDataEntryValue | null;
  address?: FormDataEntryValue | null;
  details?: FormDataEntryValue | null;
};

const globalForJobs = globalThis as typeof globalThis & {
  __dispatchJobs?: JobRecord[];
};

const jobsStore = globalForJobs.__dispatchJobs ?? [
  {
    id: "JOB-1042",
    createdAt: new Date().toISOString(),
    status: "Awaiting Dispatch",
    companySlug: "build-electric",
    name: "Metro Mobile Tech Client",
    phone: "(301) 555-0102",
    service: "Emergency Service",
    address: "Silver Spring, MD",
    details: "Customer needs immediate service.",
  },
  {
    id: "JOB-1043",
    createdAt: new Date().toISOString(),
    status: "En Route",
    companySlug: "build-electric",
    name: "Metro Mobile Tech Client",
    phone: "(301) 555-0102",
    service: "Scheduled Service",
    address: "Rockville, MD",
    details: "Customer scheduled ahead of time.",
  },
];

globalForJobs.__dispatchJobs = jobsStore;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const companySlug = searchParams.get("company");

  const filteredJobs = companySlug
    ? jobsStore.filter((job) => job.companySlug === companySlug)
    : jobsStore;

  return NextResponse.json({
    success: true,
    jobs: filteredJobs,
  });
}

export async function POST(req: Request) {
  const data = await req.json();

  const job: JobRecord = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    status: "Awaiting Dispatch",
    companySlug: data.companySlug ?? null,
    name: data.name ?? null,
    phone: data.phone ?? null,
    service: data.service ?? null,
    address: data.address ?? null,
    details: data.details ?? null,
  };

  jobsStore.unshift(job);

  console.log("NEW JOB CREATED:", job);

  return NextResponse.json({
    success: true,
    job,
    jobs: jobsStore,
  });
}
