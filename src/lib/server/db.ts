import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const dataDir = path.join(process.cwd(), ".data");

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, "dispatch.db");
const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY,
    createdAt TEXT NOT NULL,
    updatedAt TEXT,
    status TEXT NOT NULL,
    companySlug TEXT,
    name TEXT,
    phone TEXT,
    service TEXT,
    address TEXT,
    details TEXT,
    driverId TEXT,
    etaMinutes INTEGER,
    statusHistory TEXT,
    verificationToken TEXT,
    handoffVerifiedAt TEXT
  );
`);

const columns = db.prepare("PRAGMA table_info(jobs)").all() as Array<{ name: string }>;
const hasColumn = (name: string) => columns.some((column) => column.name === name);

if (!hasColumn("updatedAt")) {
  db.exec("ALTER TABLE jobs ADD COLUMN updatedAt TEXT;");
}
if (!hasColumn("statusHistory")) {
  db.exec("ALTER TABLE jobs ADD COLUMN statusHistory TEXT;");
}
if (!hasColumn("verificationToken")) {
  db.exec("ALTER TABLE jobs ADD COLUMN verificationToken TEXT;");
}
if (!hasColumn("handoffVerifiedAt")) {
  db.exec("ALTER TABLE jobs ADD COLUMN handoffVerifiedAt TEXT;");
}

const seedCount = db.prepare("SELECT COUNT(*) as count FROM jobs").get() as { count: number };

if (seedCount.count === 0) {
  const insert = db.prepare(`
    INSERT INTO jobs (
      id, createdAt, updatedAt, status, companySlug, name, phone, service, address, details, driverId, etaMinutes, statusHistory, verificationToken, handoffVerifiedAt
    ) VALUES (
      @id, @createdAt, @updatedAt, @status, @companySlug, @name, @phone, @service, @address, @details, @driverId, @etaMinutes, @statusHistory, @verificationToken, @handoffVerifiedAt
    )
  `);

  const now = new Date().toISOString();

  insert.run({
    id: "JOB-1042",
    createdAt: now,
    updatedAt: now,
    status: "Awaiting Dispatch",
    companySlug: "build-electric",
    name: "Metro Mobile Tech Client",
    phone: "(301) 555-0102",
    service: "Emergency Service",
    address: "Silver Spring, MD",
    details: "Customer needs immediate service.",
    driverId: null,
    etaMinutes: null,
    statusHistory: JSON.stringify([
      {
        type: "status",
        label: "Request created",
        detail: "Customer request entered dispatch queue",
        at: now,
        status: "Awaiting Dispatch",
      },
    ]),
    verificationToken: "BE-1042",
    handoffVerifiedAt: null,
  });

  insert.run({
    id: "JOB-1043",
    createdAt: now,
    updatedAt: now,
    status: "En Route",
    companySlug: "build-electric",
    name: "Metro Mobile Tech Client",
    phone: "(301) 555-0102",
    service: "Scheduled Service",
    address: "Rockville, MD",
    details: "Customer scheduled ahead of time.",
    driverId: "drv_002",
    etaMinutes: 12,
    statusHistory: JSON.stringify([
      {
        type: "status",
        label: "Request created",
        detail: "Customer request entered dispatch queue",
        at: now,
        status: "Awaiting Dispatch",
      },
      {
        type: "status",
        label: "Assigned",
        detail: "Driver assigned by dispatch",
        at: now,
        status: "Assigned",
      },
      {
        type: "status",
        label: "En route",
        detail: "Driver started route",
        at: now,
        status: "En Route",
      },
    ]),
    verificationToken: "BE-1043",
    handoffVerifiedAt: null,
  });
}

export default db;
