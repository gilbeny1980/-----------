import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { filterOpenElectricalFaults, type ServiceCall } from "@/lib/openFaults";

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization") ?? "";
  const secret = authHeader.replace(/^Bearer\s+/i, "");

  if (!process.env.OPEN_FAULTS_SYNC_SECRET || secret !== process.env.OPEN_FAULTS_SYNC_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!Array.isArray(body)) {
    return NextResponse.json({ error: "Expected an array" }, { status: 400 });
  }

  const openFaults = filterOpenElectricalFaults(body as ServiceCall[]);

  await prisma.openFaultsSnapshot.upsert({
    where: { id: "singleton" },
    create: {
      id: "singleton",
      count: openFaults.length,
      faults: JSON.stringify(openFaults),
    },
    update: {
      count: openFaults.length,
      faults: JSON.stringify(openFaults),
    },
  });

  return NextResponse.json({ ok: true, count: openFaults.length });
}
