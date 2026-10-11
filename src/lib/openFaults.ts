export type ServiceCall = {
  DOCNO?: string;
  CURDATE?: string;
  FINAL?: string;
  ROTL_FINAL?: string;
  CANCEL?: string;
  CallTypeCode?: string;
  PARTNAME?: string;
  PARTDES?: string;
  CODE?: string;
  ConvertedDate?: string;
};

function isElectricalCall(item: ServiceCall): boolean {
  const code = (item.CallTypeCode ?? "").trim();
  return code === "3-חשמל/מכשור";
}

function isOpenCall(item: ServiceCall): boolean {
  const final = (item.FINAL ?? "").trim();
  const cancel = (item.CANCEL ?? "").trim();
  const code = (item.CODE ?? "").trim();
  return final === "" && cancel === "" && code === "לביצוע";
}

// ConvertedDate's exact format isn't guaranteed, so try ISO first and fall
// back to DD/MM/YYYY (same layout as CURDATE) - plain `new Date()` would
// otherwise misread a DD/MM/YYYY string as MM/DD/YYYY.
function parseConvertedDate(value: string | undefined): number {
  if (!value) return 0;
  const iso = Date.parse(value);
  if (!Number.isNaN(iso)) return iso;
  const match = value.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (match) {
    const [, day, month, year] = match;
    return new Date(Number(year), Number(month) - 1, Number(day)).getTime();
  }
  return 0;
}

export function filterOpenElectricalFaults(items: ServiceCall[]): ServiceCall[] {
  return items
    .filter((item) => isElectricalCall(item) && isOpenCall(item))
    .sort(
      (a, b) =>
        parseConvertedDate(a.ConvertedDate) - parseConvertedDate(b.ConvertedDate),
    );
}

const STALE_AFTER_MS = 20 * 60 * 1000;

export function isSnapshotStale(updatedAt: Date): boolean {
  return Date.now() - updatedAt.getTime() > STALE_AFTER_MS;
}
