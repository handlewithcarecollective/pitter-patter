import {
  CommitJSON,
  NodeJSON,
} from "@stepwisehq/prosemirror-collab-commit/collab-commit";
import { applyCommitJSON } from "@stepwisehq/prosemirror-collab-commit/apply-commit";
import { Schema } from "prosemirror-model";
import { createClient, RedisClientType } from "redis";

function PromiseWithResolvers<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: any) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

interface CollabAuthorityConfig {
  schema: Schema;
  getDoc: (docId: string) => Promise<{ docJSON: NodeJSON; version: number }>;
  getCommit: (docId: string, commitRef: string) => Promise<CommitJSON | null>;
  getCommits: (docId: string, version: number) => Promise<CommitJSON[]>;
  saveDoc: (docId: string, docJSON: NodeJSON, version: number) => Promise<void>;
  saveCommit: (docId: string, commitJSON: CommitJSON) => Promise<void>;
  broadcastManager: {
    broadcastCommit: (docId: string, commit: CommitJSON) => Promise<void>;
    listenForCommit: (docId: string, version: number) => Promise<void>;
  };
}

export class CollabAuthority {
  private schema: CollabAuthorityConfig["schema"];
  private getDoc: CollabAuthorityConfig["getDoc"];
  private getCommits: CollabAuthorityConfig["getCommits"];
  private getCommit: CollabAuthorityConfig["getCommit"];
  private saveDoc: CollabAuthorityConfig["saveDoc"];
  private saveCommit: CollabAuthorityConfig["saveCommit"];
  private broadcastManager: CollabAuthorityConfig["broadcastManager"];

  constructor(config: CollabAuthorityConfig) {
    this.schema = config.schema;
    this.getDoc = config.getDoc;
    this.getCommit = config.getCommit;
    this.getCommits = config.getCommits;
    this.saveDoc = config.saveDoc;
    this.saveCommit = config.saveCommit;
    this.broadcastManager = config.broadcastManager;
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
    await this.broadcastManager.broadcastCommit(docId, appliedCommitJSON);
  }

  async listenForCommit(docId: string, version: number) {
    const preCommits = await this.getCommits(docId, version);
    if (preCommits.length) return preCommits;
    await this.broadcastManager.listenForCommit(docId, version);
    const postCommits = await this.getCommits(docId, version);
    return postCommits;
  }
}

interface RedisBroadcastManagerConfig {
  redisUrl: string;
  timeout?: number;
}

export class RedisBroadcastManager {
  private pub: RedisClientType;
  private sub: RedisClientType;
  private timeout: number;

  constructor(config: RedisBroadcastManagerConfig) {
    this.pub = createClient({
      url: config.redisUrl,
    });
    this.sub = createClient({
      url: config.redisUrl,
    });

    this.timeout = config.timeout ?? 5_000;

    this.broadcastCommit = this.broadcastCommit.bind(this);
  }

  async connect() {
    await Promise.all([this.sub.connect(), this.pub.connect()]);
  }

  async broadcastCommit(docId: string, commitJSON: CommitJSON) {
    await this.pub.publish(
      `pitter-patter:collab:${docId}`,
      commitJSON.version.toString(),
    );
  }

  async listenForCommit(docId: string, version: number) {
    const { promise, resolve } = PromiseWithResolvers<void>();

    function listener(message: string) {
      if (parseInt(message, 10) >= version) resolve();
    }

    await this.sub.subscribe(`pitter-patter:collab:${docId}`, listener);

    return await Promise.race([
      promise,
      new Promise<void>((resolve) => {
        setTimeout(resolve, this.timeout);
      }),
    ]).finally(async () => {
      await this.sub.unsubscribe(`pitter-patter:collab:${docId}`, listener);
    });
  }
}
