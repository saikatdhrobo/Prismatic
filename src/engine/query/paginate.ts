import type { CommerceRecord } from "../contracts/types";
export function paginate(records: CommerceRecord[], offset: number, limit: number): CommerceRecord[] {
  return records.slice(offset, offset+limit);
}
