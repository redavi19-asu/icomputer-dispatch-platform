import type { RevenueDatabase } from "./api-revenue";
export function apiRevenueDatabase(db: D1Database): RevenueDatabase {
  return {
    async all<T>(sql: string, ...values: (string | number | null)[]) {
      return (
        await db
          .prepare(sql)
          .bind(...values)
          .all<T>()
      ).results;
    },
    async run(sql, ...values) {
      return (
        await db
          .prepare(sql)
          .bind(...values)
          .run()
      ).meta.changes;
    },
    async batch(statements) {
      return (
        await db.batch<Record<string, unknown>>(
          statements.map((s) => db.prepare(s.sql).bind(...s.values)),
        )
      ).map((r) => ({ changes: r.meta.changes, rows: r.results }));
    },
  };
}
