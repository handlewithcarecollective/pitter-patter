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

interface CollabAuthorityConfig<Transaction> {
  schema: Schema;
  runWithTransaction: <Result>(
    callback: (tr: Transaction) => Promise<Result>,
  ) => Promise<Result>;
  getDoc: (
    tr: Transaction | null,
    docId: string,
  ) => Promise<{ docJSON: NodeJSON; version: number }>;
  getCommit: (
    tr: Transaction | null,
    docId: string,
    commitRef: string,
  ) => Promise<CommitJSON | null>;
  getCommits: (
    tr: Transaction | null,
    docId: string,
    version: number,
  ) => Promise<CommitJSON[]>;
  saveDoc: (
    tr: Transaction | null,
    docId: string,
    docJSON: NodeJSON,
    version: number,
  ) => Promise<void>;
  saveCommit: (
    tr: Transaction | null,
    docId: string,
    commitJSON: CommitJSON,
  ) => Promise<void>;
  broadcastManager: {
    broadcastCommit: (docId: string, commit: CommitJSON) => Promise<void>;
    listenForCommit: (docId: string, version: number) => Promise<void>;
  };
}

export class CollabAuthority<Transaction> {
  private schema: CollabAuthorityConfig<Transaction>["schema"];
  private runWithTransaction: CollabAuthorityConfig<Transaction>["runWithTransaction"];
  private getDoc: CollabAuthorityConfig<Transaction>["getDoc"];
  private getCommits: CollabAuthorityConfig<Transaction>["getCommits"];
  private getCommit: CollabAuthorityConfig<Transaction>["getCommit"];
  private saveDoc: CollabAuthorityConfig<Transaction>["saveDoc"];
  private saveCommit: CollabAuthorityConfig<Transaction>["saveCommit"];
  private broadcastManager: CollabAuthorityConfig<Transaction>["broadcastManager"];

  constructor(config: CollabAuthorityConfig<Transaction>) {
    this.schema = config.schema;
    this.runWithTransaction = config.runWithTransaction;
    this.getDoc = config.getDoc;
    this.getCommit = config.getCommit;
    this.getCommits = config.getCommits;
    this.saveDoc = config.saveDoc;
    this.saveCommit = config.saveCommit;
    this.broadcastManager = config.broadcastManager;
  }

  async receiveCommit(docId: string, commitJSON: CommitJSON) {
    const appliedCommitJSON = await this.runWithTransaction(async (tr) => {
      // If we've already received this commit, skip it
      if (await this.getCommit(tr, docId, commitJSON.ref)) {
        return null;
      }
      const { docJSON, version } = await this.getDoc(tr, docId);
      const newCommits = await this.getCommits(tr, docId, commitJSON.version);

      const { commitJSON: appliedCommitJSON, docJSON: appliedDocJSON } =
        applyCommitJSON(version, this.schema, docJSON, newCommits, commitJSON);

      await this.saveCommit(tr, docId, appliedCommitJSON);
      await this.saveDoc(tr, docId, appliedDocJSON, appliedCommitJSON.version);

      return appliedCommitJSON;
    });

    if (!appliedCommitJSON) return;

    await this.broadcastManager.broadcastCommit(docId, appliedCommitJSON);
  }

  async listenForCommit(docId: string, version: number) {
    const preCommits = await this.getCommits(null, docId, version);
    if (preCommits.length) return preCommits;
    await this.broadcastManager.listenForCommit(docId, version);
    const postCommits = await this.getCommits(null, docId, version);
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
