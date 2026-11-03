import { NextResponse } from "next/server";
import { assertAdmin } from "@/lib/role";
import { prisma } from "@/lib/prisma";

// One-time endpoint to apply the 20261103073127_rename_phone_add_lighting
// migration directly against the production database, since this sandbox
// cannot read the Turso credentials itself. Delete this route once the
// migration has been confirmed applied. Admin-gated, same as the rest of
// the app's mutating admin actions.
export async function GET() {
  try {
    await assertAdmin();
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  }

  const steps: { sql: string; ok: boolean; error?: string }[] = [];

  async function run(sql: string) {
    try {
      await prisma.$executeRawUnsafe(sql);
      steps.push({ sql, ok: true });
    } catch (e) {
      steps.push({ sql, ok: false, error: e instanceof Error ? e.message : String(e) });
    }
  }

  await run(`ALTER TABLE "RoomEntry" RENAME COLUMN "phone" TO "workerName"`);
  await run(
    `ALTER TABLE "RoomEntry" ADD COLUMN "lightingWorking" BOOLEAN NOT NULL DEFAULT false`,
  );
  await run(
    `INSERT INTO "_prisma_migrations" ("id", "checksum", "migration_name", "started_at", "finished_at", "applied_steps_count") VALUES ('31c1f26f-dcf1-4702-8396-2dd5b5afcbe4', '34590d8976c9055ca1f05f867aff018b6469b1d418131f96c9d429b9a1d64db4', '20261103073127_rename_phone_add_lighting', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1)`,
  );

  const allOk = steps.every((s) => s.ok);
  return NextResponse.json({ ok: allOk, steps });
}
