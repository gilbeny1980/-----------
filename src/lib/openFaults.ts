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

export function filterOpenElectricalFaults(items: ServiceCall[]): ServiceCall[] {
  return items.filter((item) => isElectricalCall(item) && isOpenCall(item));
}

const STALE_AFTER_MS = 20 * 60 * 1000;

export function isSnapshotStale(updatedAt: Date): boolean {
  return Date.now() - updatedAt.getTime() > STALE_AFTER_MS;
}
