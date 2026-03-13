import { NextResponse } from "next/server";
import db from "@/lib/server/db";

type JobRecord = {
  id: string;
  createdAt: string;
  status: string;
  companySlug?: string | null;
  name?: string | null;
  phone?: string | null;
  service?: string | null;
  address?: string | null;
  details?: string | null;
  driverId?: string | null;
  etaMinutes?: number | null;
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const companySlug = searchParams.get("company");

  const jobs = companySlug
    ? db
        .prepare(
          `
          SELECT id, createdAt, status, companySlug, name, phone, service, address, details, driverId, etaMinutes
          FROM jobs
          WHERE companySlug = ?
          ORDER BY datetime(createdAt) DESC
        `
        )
        .all(companySlug)
    : db
        .prepare(
          `
          SELECT id, createdAt, status, companySlug, name, phone, service, address, details, driverId, etaMinutes
          FROM jobs
          ORDER BY datetime(createdAt) DESC
        `
        )
        .all();

  return NextResponse.json({
    success: true,
    jobs,
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
    driverId: null,
    etaMinutes: null,
  };

  db.prepare(
    `
    INSERT INTO jobs (
      id, createdAt, status, companySlug, name, phone, service, address, details, driverId, etaMinutes
    ) VALUES (
      @id, @createdAt, @status, @companySlug, @name, @phone, @service, @address, @details, @driverId, @etaMinutes
    )
  `
  ).run(job);

  return NextResponse.json({
    success: true,
    job,
  });
}

export async function PATCH(req: Request) {
  const data = await req.json();

  const existingJob = db
    .prepare(
      `
      SELECT id, createdAt, status, companySlug, name, phone, service, address, details, driverId, etaMinutes
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

  const updatedJob: JobRecord = {
    ...existingJob,
    status: data.status ?? existingJob.status,
    driverId: data.driverId ?? existingJob.driverId ?? null,
    etaMinutes:
      data.etaMinutes !== undefined ? data.etaMinutes : existingJob.etaMinutes ?? null,
  };

  db.prepare(
    `
    UPDATE jobs
    SET status = @status,
        driverId = @driverId,
        etaMinutes = @etaMinutes
    WHERE id = @id
  `
  ).run({
    id: updatedJob.id,
    status: updatedJob.status,
    driverId: updatedJob.driverId,
    etaMinutes: updatedJob.etaMinutes,
  });

  return NextResponse.json({
    success: true,
    job: updatedJob,
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
