import { applyCommitJSON } from "@stepwisehq/prosemirror-collab-commit/apply-commit";
import { CommitJSON, NodeJSON } from "@stepwisehq/prosemirror-collab-commit/collab-commit";
import { Schema } from "prosemirror-model";
import { createClient, RedisClientType } from "redis";

export { type CommitJSON };

function PromiseWithResolvers<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: any) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

export class TooMuchContentionError extends Error {
  constructor() {
    super("Too much contention");
    this.name = "TooMuchContentionError";
  }
}

export interface CommitListener {
  listen: () => Promise<boolean>;
  abort: () => Promise<void>;
}

/**
 * The config for creating a CollabAuthority. Parameters that perform database operations should use the provided transaction
 * or if a transaction is not provided, start a transaction and perform all database operations inside it.
 */
export interface CollabAuthorityConfig<Transaction> {
  schema: Schema;
  /**
   * This function should start a transaction on your database, execute the provided callback with it, and commit the transaction.
   */
  runWithTransaction: <Result>(callback: (tr: Transaction) => Promise<Result>) => Promise<Result>;
  /**
   * Retrieves a document from your database by docId.
   */
  getDoc: (
    tr: Transaction | null,
    docId: string,
  ) => Promise<{
    docJSON: NodeJSON;
    version: number;
    lastUpdatedTimestamp: number;
  }>;
  /**
   * Given a docId and commitRef, retrieves the associated commit's steps and version from your database
   * and returns a joined CommitJSON object.
   */
  getCommit: (
    tr: Transaction | null,
    docId: string,
    commitRef: string,
  ) => Promise<CommitJSON | null>;
  /**
   * For the provided docId, retrieves all commits from the database with a version number strictly greater than the provided `version`.
   */
  getCommits: (tr: Transaction | null, docId: string, version: number) => Promise<CommitJSON[]>;
  /**
   * Saves a document along with its docId, version, and lastUpdatedTimestamp to your database.
   */
  saveDoc: (
    tr: Transaction | null,
    docId: string,
    docJSON: NodeJSON,
    version: number,
    lastUpdatedTimestamp: number,
  ) => Promise<void>;
  /**
   * Saves a commit along with its version and ref to your database.
   */
  saveCommit: (
    tr: Transaction | null,
    docId: string,
    ref: string,
    version: number,
    steps: {
      [key: string]: unknown;
    }[],
  ) => Promise<void>;
  /**
   * The broadcast manager that will be used to listen for and send document updates.
   *
   * Currently the only built-in option is the {@link RedisBroadcastManager}.
   */
  broadcastManager: {
    broadcastCommit: (docId: string, commit: CommitJSON) => Promise<void>;
    createCommitListener: (docId: string, version: number) => Promise<CommitListener>;
  };
}

/**
 * The CollabAuthority manages most of Pitter Patter's server side collaborative editing operations.
 *
 * You create endpoints that call the appropriate CollabAuthority functions to integrate with
 * a CollabClient.
 *
 * A CollabAuthority is designed to be stateless, so you can create a new one on every server,
 * lambda, or cloud function instance.
 */
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

  async runWithTransactionRetries<Result>(
    callback: (tr: Transaction) => Promise<Result>,
  ): Promise<Result> {
    let retries = 5;
    while (retries > 0) {
      try {
        return await this.runWithTransaction(callback);
      } catch {
        retries--;
      }
    }
    throw new TooMuchContentionError();
  }

  /**
   * Receives a commit from a CollabClient and merges it into the remote
   * editor state.
   */
  async receiveCommit(docId: string, commitJSON: CommitJSON) {
    const appliedCommitJSON = await this.runWithTransactionRetries(async (tr) => {
      // If we've already received this commit, skip it
      if (await this.getCommit(tr, docId, commitJSON.ref)) {
        return null;
      }
      const { docJSON, version, lastUpdatedTimestamp } = await this.getDoc(tr, docId);
      const newCommits = await this.getCommits(tr, docId, commitJSON.version);

      const { commitJSON: appliedCommitJSON, docJSON: appliedDocJSON } = applyCommitJSON(
        version,
        this.schema,
        docJSON,
        newCommits,
        commitJSON,
      );

      await this.saveCommit(
        tr,
        docId,
        appliedCommitJSON.ref,
        appliedCommitJSON.version,
        appliedCommitJSON.steps,
      );
      await this.saveDoc(
        tr,
        docId,
        appliedDocJSON,
        appliedCommitJSON.version,
        lastUpdatedTimestamp,
      );

      return appliedCommitJSON;
    });

    if (!appliedCommitJSON) return;

    await this.broadcastManager.broadcastCommit(docId, appliedCommitJSON);
  }

  /**
   * Listens for remote changes to a document's editor state and returns when changes
   * are found or after a timeout specified in the CollabAuthority's `broadcastManager`.
   */
  async listenForCommit(docId: string, version: number) {
    // Create listner to notify if commits are made. After this await, the listener is registered with
    // the notification service and will be notified if a commit is made.
    const { listen, abort } = await this.broadcastManager.createCommitListener(docId, version);

    // Check if any commits were made between the last time this function was called and the
    // new commit listener being registered
    const preCommits = await this.getCommits(null, docId, version);
    if (preCommits.length) {
      await abort();
      return preCommits;
    }

    // Await and return any incoming commits
    let commitsFound = await listen();
    if (commitsFound) {
      const postCommits = await this.getCommits(null, docId, version);
      return postCommits;
    }
    return [];
  }
}

export interface RedisBroadcastManagerConfig {
  /**
   * the url for your Redis cluster
   */
  redisUrl: string;
  /**
   * the maximum time the broadcast manager should listen for changes
   * to a document before returning an empty result
   */
  timeout?: number;
}

/**
 * A broadcast manager that uses a Redis cluster as a message broker via Redis's pub/sub.
 *
 * When a client connects it specifies the document id to listen to.
 *
 * When changes are submitted to a document all listeners for that document id are notified
 * that there is an update.
 */
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
    await this.pub.publish(`pitter-patter:collab:${docId}`, commitJSON.version.toString());
  }

  async createCommitListener(docId: string, version: number) {
    const { promise, resolve } = PromiseWithResolvers<boolean>();
    function listener(message: string) {
      if (parseInt(message, 10) >= version) resolve(true);
    }
    await this.sub.subscribe(`pitter-patter:collab:${docId}`, listener);

    const listen = async () => {
      return await Promise.race([
        promise,
        new Promise<boolean>((resolve) => {
          setTimeout(() => resolve(false), this.timeout);
        }),
      ]).finally(async () => {
        await this.sub.unsubscribe(`pitter-patter:collab:${docId}`, listener);
      });
    };

    const abort = async () => {
      await this.sub.unsubscribe(`pitter-patter:collab:${docId}`, listener);
    };

    return { listen, abort };
  }
}
