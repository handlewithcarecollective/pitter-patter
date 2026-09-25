import { CollabAuthorityConfig, CommitJSON } from "@pitter-patter/collab-server";

type BroadcastManager = CollabAuthorityConfig<null>["broadcastManager"];

export class DurableObjectBroadcastManager implements BroadcastManager {
  private subscriptions: Map<string, Array<(version: number) => void>>;
  private timeout: number;

  constructor(config: { timeout?: number }) {
    this.subscriptions = new Map();
    this.timeout = config.timeout ?? 5_000;
  }

  async broadcastCommit(docId: string, commitJSON: CommitJSON) {
    this.subscriptions.get(docId)?.forEach((subscription) => subscription(commitJSON.version));
  }

  async createCommitListener(docId: string, version: number) {
    const { promise, resolve } = PromiseWithResolvers<boolean>();

    function listener(v: number) {
      if (v >= version) resolve(true);
    }

    this.subscriptions.set(docId, (this.subscriptions.get(docId) ?? []).concat(listener));

    const listen = async () => {
      return await Promise.race([
        promise,
        new Promise<boolean>((resolve) => {
          setTimeout(() => resolve(false), this.timeout);
        }),
      ]).finally(async () => {
        this.subscriptions.set(
          docId,
          (this.subscriptions.get(docId) ?? []).filter((s) => s !== listener),
        );
      });
    };

    const abort = async () => {
      this.subscriptions.set(
        docId,
        (this.subscriptions.get(docId) ?? []).filter((s) => s !== listener),
      );
    };

    return { listen, abort };
  }
}

function PromiseWithResolvers<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: any) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}
