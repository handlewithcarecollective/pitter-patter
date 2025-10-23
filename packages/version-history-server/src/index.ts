import { CollabAuthorityConfig } from "@pitter-patter/collab-server";
import { NodeJSON } from "@stepwisehq/prosemirror-collab-commit/collab-commit";

export interface VersionHistoryConfig<Transaction> {
  getLatestSnapshot: (
    tr: Transaction | null,
    docId: string,
  ) => Promise<{ snapshotId: string; createdAt: number; version: number }>;
  createSnapshot: (
    tr: Transaction | null,
    docId: string,
    version: number,
    snapshotJSON: NodeJSON,
  ) => Promise<void>;
  shouldCreateSnapshot?: (
    currentTimestamp: number,
    lastUpdatedTimestamp: number,
    latestVersionCreatedTimestamp: number,
  ) => boolean;
}

export function defaultShouldCreateSnapshot(
  currentTimestamp: number,
  lastUpdatedTimestamp: number,
  latestVersionCreatedTimestamp: number,
): boolean {
  const fiveMinutesPause =
    currentTimestamp - lastUpdatedTimestamp > 5 * 60 * 1_000;
  const fifteenMinutesEditing =
    currentTimestamp - latestVersionCreatedTimestamp > 15 * 60 * 1_000;
  return fiveMinutesPause || fifteenMinutesEditing;
}

export function withVersionHistory<Transaction>(
  collabAuthorityConfig: CollabAuthorityConfig<Transaction>,
  versionHistoryConfig: VersionHistoryConfig<Transaction>,
): CollabAuthorityConfig<Transaction> {
  return {
    ...collabAuthorityConfig,
    async saveDoc(tr, docId, docJSON, version, lastUpdatedTimestamp) {
      await collabAuthorityConfig.saveDoc(
        tr,
        docId,
        docJSON,
        version,
        lastUpdatedTimestamp,
      );

      const latestVersion = await versionHistoryConfig.getLatestSnapshot(
        tr,
        docId,
      );

      const shouldCreateVersion =
        versionHistoryConfig.shouldCreateSnapshot ??
        defaultShouldCreateSnapshot;

      if (
        !shouldCreateVersion(
          Date.now(),
          lastUpdatedTimestamp,
          latestVersion.createdAt,
        )
      ) {
        return;
      }

      await versionHistoryConfig.createSnapshot(tr, docId, version, docJSON);
    },
  };
}
