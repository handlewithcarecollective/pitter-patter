import { CollabAuthorityConfig, CommitJSON } from "@pitter-patter/collab-server";

type BroadcastManager = CollabAuthorityConfig<null>["broadcastManager"];

export class DurableObjectBroadcastManager implements BroadcastManager {
  private subscriptions: Map<string, Array<(version: number) => void>>;

  constructor() {
    this.subscriptions = new Map();
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
          signal?.addEventListener("abort", () => {
            resolve(false);
          });
        }),
        new Promise<boolean>((resolve) => {
          setTimeout(() => resolve(false), 5_000);
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
