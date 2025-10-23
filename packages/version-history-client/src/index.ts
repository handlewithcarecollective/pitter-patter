import { NodeJSON } from "@pitter-patter/collab-client";

export interface Snapshot {
  snapshotId: string;
  snapshotJSON: NodeJSON;
  version: number;
  createdAt: number;
}

export interface VersionHistoryClientConfig {
  getSnapshots: (version?: number) => Promise<Snapshot[]>;
  receiveSnapshots: (snapshots: Snapshot[]) => void;
  pollDuration?: number;
}

export class VersionHistoryClient {
  private version: number | undefined = undefined;
  private getSnapshots: VersionHistoryClientConfig["getSnapshots"];
  private receiveSnapshots: VersionHistoryClientConfig["receiveSnapshots"];
  private pollDuration: number;

  constructor(config: VersionHistoryClientConfig) {
    this.getSnapshots = config.getSnapshots;
    this.receiveSnapshots = config.receiveSnapshots;
    this.pollDuration = config.pollDuration ?? 60 * 1_000;
  }

  async poll(signal: AbortSignal) {
    while (!signal.aborted) {
      try {
        const snapshots = await this.getSnapshots(this.version);
        if (snapshots.length) {
          const last = snapshots[snapshots.length - 1]!;
          this.version = last.version;
          this.receiveSnapshots(snapshots);
        }
      } catch (e) {
        console.error(e);
      } finally {
        await new Promise<void>((resolve) => {
          setTimeout(() => resolve(), this.pollDuration);
        });
      }
    }
  }
}
