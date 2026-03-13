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
    status TEXT NOT NULL,
    companySlug TEXT,
    name TEXT,
    phone TEXT,
    service TEXT,
    address TEXT,
    details TEXT,
    driverId TEXT,
    etaMinutes INTEGER
  );
`);

const seedCount = db.prepare("SELECT COUNT(*) as count FROM jobs").get() as { count: number };

if (seedCount.count === 0) {
  const insert = db.prepare(`
    INSERT INTO jobs (
      id, createdAt, status, companySlug, name, phone, service, address, details, driverId, etaMinutes
    ) VALUES (
      @id, @createdAt, @status, @companySlug, @name, @phone, @service, @address, @details, @driverId, @etaMinutes
    )
  `);

  insert.run({
    id: "JOB-1042",
    createdAt: new Date().toISOString(),
    status: "Awaiting Dispatch",
    companySlug: "build-electric",
    name: "Metro Mobile Tech Client",
    phone: "(301) 555-0102",
    service: "Emergency Service",
    address: "Silver Spring, MD",
    details: "Customer needs immediate service.",
    driverId: null,
    etaMinutes: null,
  });

  insert.run({
    id: "JOB-1043",
    createdAt: new Date().toISOString(),
    status: "En Route",
    companySlug: "build-electric",
    name: "Metro Mobile Tech Client",
    phone: "(301) 555-0102",
    service: "Scheduled Service",
    address: "Rockville, MD",
    details: "Customer scheduled ahead of time.",
    driverId: "drv_002",
    etaMinutes: 12,
  });
}

export default db;
