import type { ContextEvent } from "../context/types.ts";

export type MemoryRecord = {
  id: string;
  eventId: string;
  summary: string;
  createdAt: string;
};

export class MemoryStore {
  private records: MemoryRecord[] = [];

  remember(event: ContextEvent, summary: string): MemoryRecord {
    const record: MemoryRecord = {
      id: `mem_${this.records.length + 1}`,
      eventId: event.id,
      summary,
      createdAt: new Date().toISOString(),
    };

    this.records.push(record);
    return record;
  }

  list(): MemoryRecord[] {
    return [...this.records];
  }

  clear(): void {
    this.records = [];
  }
}
