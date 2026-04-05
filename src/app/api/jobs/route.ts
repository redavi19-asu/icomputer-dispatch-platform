import { NextResponse } from "next/server";
import db from "@/lib/server/db";
import {
  appendStatusEvent,
  appendVerificationEvent,
  createInitialStatusHistory,
  normalizeTimeline,
} from "@/lib/platform/job-lifecycle";

type JobRecord = {
  id: string;
  createdAt: string;
  updatedAt?: string | null;
  status: string;
  companySlug?: string | null;
  name?: string | null;
  phone?: string | null;
  service?: string | null;
  address?: string | null;
  details?: string | null;
  driverId?: string | null;
  etaMinutes?: number | null;
  statusHistory?: string | null;
  verificationToken?: string | null;
  handoffVerifiedAt?: string | null;
};

const toApiJob = (job: JobRecord) => {
  let parsedHistory: unknown = null;
  if (job.statusHistory) {
    try {
      parsedHistory = JSON.parse(job.statusHistory);
    } catch {
      parsedHistory = null;
    }
  }

  return {
    ...job,
    updatedAt: job.updatedAt ?? job.createdAt,
    statusHistory: normalizeTimeline(parsedHistory, job.createdAt),
    verificationToken: job.verificationToken ?? null,
    handoffVerifiedAt: job.handoffVerifiedAt ?? null,
  };
};

const createVerificationToken = (id: string) => {
  const compact = id.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  return compact.slice(-8);
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const companySlug = searchParams.get("company");
  const jobId = searchParams.get("id");

  if (jobId) {
    const job = db
      .prepare(
        `
        SELECT id, createdAt, updatedAt, status, companySlug, name, phone, service, address, details, driverId, etaMinutes, statusHistory, verificationToken, handoffVerifiedAt
        FROM jobs
        WHERE id = ?
      `
      )
      .get(jobId) as JobRecord | undefined;

    if (!job) {
      return NextResponse.json(
        {
          success: false,
          message: "Job not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      job: toApiJob(job),
    });
  }

  const jobs = companySlug
    ? db
        .prepare(
          `
          SELECT id, createdAt, updatedAt, status, companySlug, name, phone, service, address, details, driverId, etaMinutes, statusHistory, verificationToken, handoffVerifiedAt
          FROM jobs
          WHERE companySlug = ?
          ORDER BY datetime(createdAt) DESC
        `
        )
        .all(companySlug)
    : db
        .prepare(
          `
          SELECT id, createdAt, updatedAt, status, companySlug, name, phone, service, address, details, driverId, etaMinutes, statusHistory, verificationToken, handoffVerifiedAt
          FROM jobs
          ORDER BY datetime(createdAt) DESC
        `
        )
        .all();

  return NextResponse.json({
    success: true,
    jobs: (jobs as JobRecord[]).map(toApiJob),
  });
}

export async function POST(req: Request) {
  const data = await req.json();

  const job: JobRecord = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: "Awaiting Dispatch",
    companySlug: data.companySlug ?? null,
    name: data.name ?? null,
    phone: data.phone ?? null,
    service: data.service ?? null,
    address: data.address ?? null,
    details: data.details ?? null,
    driverId: null,
    etaMinutes: null,
    statusHistory: JSON.stringify(createInitialStatusHistory(new Date().toISOString())),
    verificationToken: createVerificationToken(crypto.randomUUID()),
    handoffVerifiedAt: null,
  };

  job.verificationToken = createVerificationToken(job.id);
  job.statusHistory = JSON.stringify(createInitialStatusHistory(job.createdAt));

  db.prepare(
    `
    INSERT INTO jobs (
      id, createdAt, updatedAt, status, companySlug, name, phone, service, address, details, driverId, etaMinutes, statusHistory, verificationToken, handoffVerifiedAt
    ) VALUES (
      @id, @createdAt, @updatedAt, @status, @companySlug, @name, @phone, @service, @address, @details, @driverId, @etaMinutes, @statusHistory, @verificationToken, @handoffVerifiedAt
    )
  `
  ).run(job);

  return NextResponse.json({
    success: true,
    job: toApiJob(job),
  });
}

export async function PATCH(req: Request) {
  const data = await req.json();

  const existingJob = db
    .prepare(
      `
      SELECT id, createdAt, status, companySlug, name, phone, service, address, details, driverId, etaMinutes
              ,updatedAt, statusHistory, verificationToken, handoffVerifiedAt
      FROM jobs
      WHERE id = ?
    `
    )
    .get(data.id) as JobRecord | undefined;

  if (!existingJob) {
    return NextResponse.json(
      {
        success: false,
        message: "Job not found",
      },
      { status: 404 }
    );
  }

  let history: unknown = null;
  if (existingJob.statusHistory) {
    try {
      history = JSON.parse(existingJob.statusHistory);
    } catch {
      history = null;
    }
  }

  let timeline = normalizeTimeline(history, existingJob.createdAt);
  const now = new Date().toISOString();
  const statusChanged = data.status && data.status !== existingJob.status;

  if (statusChanged) {
    timeline = appendStatusEvent(
      timeline,
      data.status,
      now,
      data.note ?? "Status updated by operations"
    );
  }

  let handoffVerifiedAt = existingJob.handoffVerifiedAt ?? null;
  if (
    data.verificationAction === "confirm-handoff" &&
    data.verificationToken &&
    data.verificationToken === existingJob.verificationToken
  ) {
    handoffVerifiedAt = now;
    timeline = appendVerificationEvent(
      timeline,
      now,
      "Verification token confirmed"
    );
  }

  const updatedJob: JobRecord = {
    ...existingJob,
    status: data.status ?? existingJob.status,
    driverId: data.driverId ?? existingJob.driverId ?? null,
    etaMinutes:
      data.etaMinutes !== undefined ? data.etaMinutes : existingJob.etaMinutes ?? null,
    updatedAt: now,
    statusHistory: JSON.stringify(timeline),
    handoffVerifiedAt,
  };

  db.prepare(
    `
    UPDATE jobs
    SET status = @status,
        driverId = @driverId,
        etaMinutes = @etaMinutes,
        updatedAt = @updatedAt,
        statusHistory = @statusHistory,
        handoffVerifiedAt = @handoffVerifiedAt
    WHERE id = @id
  `
  ).run({
    id: updatedJob.id,
    status: updatedJob.status,
    driverId: updatedJob.driverId,
    etaMinutes: updatedJob.etaMinutes,
    updatedAt: updatedJob.updatedAt,
    statusHistory: updatedJob.statusHistory,
    handoffVerifiedAt: updatedJob.handoffVerifiedAt,
  });

  return NextResponse.json({
    success: true,
    job: toApiJob(updatedJob),
  });
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const jobId = searchParams.get("id");
  const companySlug = searchParams.get("company");
  const clearCompleted = searchParams.get("clearCompleted") === "1";

  if (jobId) {
    const existingJob = db
      .prepare(
        `
        SELECT id
        FROM jobs
        WHERE id = ?
      `
      )
      .get(jobId) as { id: string } | undefined;

    if (!existingJob) {
      return NextResponse.json(
        {
          success: false,
          message: "Job not found",
        },
        { status: 404 }
      );
    }

    db.prepare(
      `
      DELETE FROM jobs
      WHERE id = ?
    `
    ).run(jobId);

    return NextResponse.json({
      success: true,
      cleared: 1,
    });
  }

  if (clearCompleted && companySlug) {
    const result = db
      .prepare(
        `
        DELETE FROM jobs
        WHERE companySlug = ?
          AND status IN ('Completed', 'Cancelled')
      `
      )
      .run(companySlug);

    return NextResponse.json({
      success: true,
      cleared: result.changes,
    });
  }

  return NextResponse.json(
    {
      success: false,
      message: "Provide id or company + clearCompleted=1",
    },
    { status: 400 }
  );
}
