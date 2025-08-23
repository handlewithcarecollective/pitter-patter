import {
  CommitJSON,
  NodeJSON,
} from "@stepwisehq/prosemirror-collab-commit/collab-commit";
import { applyCommitJSON } from "@stepwisehq/prosemirror-collab-commit/apply-commit";
import { Schema } from "prosemirror-model";
import { createClient, RedisClientType } from "redis";

interface CollabAuthorityConfig {
  schema: Schema;
  getDoc: (docId: string) => Promise<{ docJSON: NodeJSON; version: number }>;
  getCommit: (docId: string, commitRef: string) => Promise<CommitJSON | null>;
  getCommits: (docId: string, version: number) => Promise<CommitJSON[]>;
  saveDoc: (docId: string, docJSON: NodeJSON, version: number) => Promise<void>;
  saveCommit: (docId: string, commitJSON: CommitJSON) => Promise<void>;
  broadcastCommit: (docId: string, commit: CommitJSON) => Promise<void>;
}

export class CollabAuthority {
  private schema: CollabAuthorityConfig["schema"];
  private getDoc: CollabAuthorityConfig["getDoc"];
  private getCommits: CollabAuthorityConfig["getCommits"];
  private getCommit: CollabAuthorityConfig["getCommit"];
  private saveDoc: CollabAuthorityConfig["saveDoc"];
  private saveCommit: CollabAuthorityConfig["saveCommit"];
  private broadcastCommit: CollabAuthorityConfig["broadcastCommit"];

  constructor(config: CollabAuthorityConfig) {
    this.schema = config.schema;
    this.getDoc = config.getDoc;
    this.getCommit = config.getCommit;
    this.getCommits = config.getCommits;
    this.saveDoc = config.saveDoc;
    this.saveCommit = config.saveCommit;
    this.broadcastCommit = config.broadcastCommit;
  }

  async receiveCommit(docId: string, commitJSON: CommitJSON) {
    // If we've already received this commit, skip it
    if (await this.getCommit(docId, commitJSON.ref)) {
      return;
    }
    const { docJSON, version } = await this.getDoc(docId);
    const newCommits = await this.getCommits(docId, commitJSON.version);

    const { commitJSON: appliedCommitJSON, docJSON: appliedDocJSON } =
      applyCommitJSON(version, this.schema, docJSON, newCommits, commitJSON);

    await this.saveCommit(docId, appliedCommitJSON);
    await this.saveDoc(docId, appliedDocJSON, appliedCommitJSON.version);
    await this.broadcastCommit(docId, appliedCommitJSON);
  }
}

interface RedisBroadcastManagerConfig {
  redisUrl: string;
  timeout?: number;
}

export class RedisBroadcastManager {
  private unblockClient: RedisClientType;
  private readClient: RedisClientType;
  private readClientId: number | null = null;
  private writeClient: RedisClientType;
  private streamManager: RedisStreamManager;
  // private blocked = false;
  private timeout: number;

  constructor(config: RedisBroadcastManagerConfig) {
    this.unblockClient = createClient({
      url: config.redisUrl,
    });
    this.readClient = createClient({
      url: config.redisUrl,
    });
    this.writeClient = createClient({
      url: config.redisUrl,
    });
    this.timeout = config.timeout ?? 5_000;

    this.streamManager = new RedisStreamManager(async (streams) => {
      if (this.readClientId === null) {
        throw new Error(`Failed to unblock redis read client: not connected`);
      }

      await this.unblockClient.sendCommand([
        "CLIENT",
        "UNBLOCK",
        this.readClientId.toString(),
      ]);

      if (streams.length) {
        this.readClient
          .xRead(streams, { BLOCK: this.timeout })
          .then(this.streamManager.processMessages);
      }
    });

    this.broadcastCommit = this.broadcastCommit.bind(this);
  }

  async connect() {
    await Promise.all([
      this.unblockClient.connect(),
      this.readClient.connect().then(async (client) => {
        this.readClientId = await client.clientId();
      }),
      this.writeClient.connect(),
    ]);
  }

  async broadcastCommit(docId: string, commitJSON: CommitJSON) {
    await this.writeClient.xAdd(docId, commitJSON.version.toString() + "-1", {
      commitJSON: JSON.stringify(commitJSON),
    });
  }

  async listenForCommit(docId: string, version: number) {
    const { promise, resolve } = Promise.withResolvers<CommitJSON[]>();
    this.streamManager.listenForCommit(docId, version, resolve);

    return await Promise.race([
      promise,
      new Promise((resolve) => {
        setTimeout(resolve, this.timeout);
      }).then(async () => {
        await this.streamManager.clearListener(docId, version, resolve);
        return [] as CommitJSON[];
      }),
    ]);
  }
}

class RedisStreamManager {
  private map = new Map<
    string,
    Map<number, ((commits: CommitJSON[]) => void)[]>
  >();
  private streamCancellations = new Map<string, number>();

  constructor(
    private restartStreams: (streams: { key: string; id: string }[]) => void,
  ) {
    this.processMessages = this.processMessages.bind(this);
  }

  async restart() {
    const streams = this.map
      .entries()
      .map(
        ([stream, versionMap]) =>
          [
            stream,
            versionMap
              .keys()
              .reduce((acc, version) => (acc < version ? acc : version)),
          ] as const,
      )
      .map(([stream, id]) => ({ key: stream, id: id.toString() + "-1" }))
      .toArray();

    await this.restartStreams(streams);
  }

  async listenForCommit(
    streamKey: string,
    version: number,
    callback: (commits: CommitJSON[]) => void,
  ) {
    const existing = this.map.get(streamKey);
    if (!existing) {
      this.map.set(streamKey, new Map([[version, [callback]]]));

      await this.restart();
    } else {
      const alreadyListening = existing.keys().some((v) => v <= version);
      const existingResolvers = existing.get(version);

      if (existingResolvers) {
        existingResolvers.push(callback);
        const cancellation = this.streamCancellations.get(
          `${streamKey}:${version}`,
        );
        if (cancellation) {
          clearTimeout(cancellation);
          this.streamCancellations.delete(`${streamKey}:${version}`);
        }
      } else {
        existing.set(version, [callback]);
      }

      if (!alreadyListening) {
        await this.restart();
      }
    }
  }

  async processMessages(events: Awaited<ReturnType<RedisClientType["xRead"]>>) {
    if (!events) {
      await this.restart();
      return;
    }
    for (const { name: stream, messages } of events as {
      name: string;
      messages: { id: string; message: { commitJSON: string } }[];
    }[]) {
      const messageMap = new Map<
        (commitJSON: CommitJSON[]) => void,
        CommitJSON[]
      >();
      const versionMap = this.map.get(stream);
      if (!versionMap) continue;
      const versionsToDelete = new Set<number>();
      for (const { id, message } of messages) {
        const commitJSON = JSON.parse(message.commitJSON) as CommitJSON;
        for (const [version, resolvers] of versionMap.entries()) {
          const idVersion = id.split("-")[0]!;
          if (version >= parseInt(idVersion, 10)) {
            continue;
          }

          for (const resolve of resolvers) {
            const foundMessages = messageMap.get(resolve);
            if (foundMessages) {
              foundMessages.push(commitJSON);
            } else {
              messageMap.set(resolve, [commitJSON]);
            }
          }
          versionsToDelete.add(version);
        }
      }

      for (const version of versionsToDelete) {
        versionMap.delete(version);

        if (versionMap.size === 0) {
          this.map.delete(stream);
        }
      }
      for (const [resolve, foundMessages] of messageMap.entries()) {
        resolve(foundMessages);
      }
    }
    await this.restart();
  }

  async clearListener(
    streamKey: string,
    version: number,
    callback: (commits: CommitJSON[]) => void,
  ) {
    const versionMap = this.map.get(streamKey);
    if (!versionMap) return;
    if ((versionMap.get(version)?.length ?? 0) <= 1) {
      versionMap.delete(version);
      if (versionMap.size === 0) {
        this.map.delete(streamKey);
      }
      await this.restart();
    } else {
      versionMap.set(
        version,
        versionMap.get(version)!.filter((r) => r === callback),
      );
    }
  }
}
