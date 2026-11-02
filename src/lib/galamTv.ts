const GALAM_TV_DATA_URL = "https://project-4lc5n.vercel.app/dashboard-data.js";

type GalamRecord = {
  id: string;
  workerId: string | null;
  workerName: string | null;
  finishedAt: string | null;
  status: string | null;
};

type GalamSample = {
  at: string;
  records: GalamRecord[];
};

type GalamDay = {
  date: string;
  samples: GalamSample[];
};

type GalamData = {
  days: GalamDay[];
};

export type WorkerAssignmentRow = {
  id: string;
  name: string;
  initial: number;
  done: number;
  remaining: number;
};

export type CurrentAssignmentsSummary = {
  rows: WorkerAssignmentRow[];
  initial: number;
  done: number;
  remaining: number;
  lastSampleAt: string;
};

function isRecordDone(record: GalamRecord): boolean {
  return (
    Boolean((record.finishedAt ?? "").trim()) &&
    (record.status ?? "").trim() === "טופל בשטח"
  );
}

function summarizeCurrentDay(day: GalamDay): CurrentAssignmentsSummary | null {
  if (!day.samples.length) return null;

  const first = day.samples[0];
  const last = day.samples[day.samples.length - 1];
  const latest = new Map(last.records.map((r) => [r.id, r]));

  const known = new Map<string, GalamRecord>();
  for (const sample of day.samples) {
    for (const record of sample.records) {
      known.set(record.id, record);
    }
  }

  const originallyClosed = new Set(
    first.records.filter(isRecordDone).map((r) => r.id),
  );

  const workers = new Map<string, WorkerAssignmentRow>();

  for (const [id, previous] of known) {
    const observed = latest.get(id);
    const record = observed ?? previous;

    if (originallyClosed.has(id) && observed && isRecordDone(observed)) {
      continue;
    }
    if (!record.workerId || !record.workerName) {
      continue;
    }

    if (!workers.has(record.workerId)) {
      workers.set(record.workerId, {
        id: record.workerId,
        name: record.workerName,
        initial: 0,
        done: 0,
        remaining: 0,
      });
    }

    const worker = workers.get(record.workerId)!;
    worker.initial += 1;
    if (!observed) {
      worker.remaining += 1;
    } else if (isRecordDone(observed)) {
      worker.done += 1;
    } else {
      worker.remaining += 1;
    }
  }

  const rows = [...workers.values()].sort(
    (a, b) => b.remaining - a.remaining || a.name.localeCompare(b.name, "he"),
  );

  const initial = rows.reduce((n, w) => n + w.initial, 0);
  const done = rows.reduce((n, w) => n + w.done, 0);

  return {
    rows,
    initial,
    done,
    remaining: initial - done,
    lastSampleAt: last.at,
  };
}

export async function fetchCurrentAssignments(): Promise<CurrentAssignmentsSummary | null> {
  try {
    const res = await fetch(GALAM_TV_DATA_URL, { cache: "no-store" });
    if (!res.ok) return null;

    const text = await res.text();
    const match = text.match(/window\.GALAM_DATA\s*=\s*({[\s\S]*})\s*;?\s*$/);
    if (!match) return null;

    const data = JSON.parse(match[1]) as GalamData;
    if (!data.days?.length) return null;

    return summarizeCurrentDay(data.days[data.days.length - 1]);
  } catch {
    return null;
  }
}
