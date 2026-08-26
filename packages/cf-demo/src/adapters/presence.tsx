import { PresenceAuthorityConfig, PresenceIndicator } from "@pitter-patter/presence-server";

type BroadcastManager = PresenceAuthorityConfig["broadcastManager"];

export class DurableObjectBroadcastManager implements BroadcastManager {
  private subscriptions: Array<(indicator: { ref: string; clientId: string }) => void>;
  private timeout: number;

  constructor(config: { timeout?: number }) {
    this.subscriptions = [];
    this.timeout = config.timeout ?? 5_000;
  }

  async broadcastIndicator(_docId: string, indicator: PresenceIndicator) {
    this.subscriptions.forEach((subscription) => subscription(indicator));
  }

  async createPresenceListener(
    _docId: string,
    excludeClientId: string,
    refs: Record<string, string>,
  ) {
    const { promise, resolve } = PromiseWithResolvers<boolean>();

    function listener({ ref, clientId }: { ref: string; clientId: string }) {
      if (ref !== refs[clientId] && clientId !== excludeClientId) resolve(true);
    }

    this.subscriptions.push(listener);

    const listen = async () => {
      return await Promise.race([
        promise,
        new Promise<boolean>((resolve) => {
          setTimeout(() => resolve(false), this.timeout);
        }),
      ]).finally(async () => {
        const index = this.subscriptions.indexOf(listener);
        this.subscriptions.splice(index, 1);
      });
    };

    const abort = async () => {
      const index = this.subscriptions.indexOf(listener);
      this.subscriptions.splice(index, 1);
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

type PersistenceManager = PresenceAuthorityConfig["persistenceManager"];

type PresenceStore = Record<string, PresenceIndicator>;

export class DurableObjectPersistenceManager implements PersistenceManager {
  constructor(private storage: DurableObjectStorage) {}

  private expire(clientId: string, timeout: number) {
    setTimeout(async () => {
      const { [clientId]: _, ...indicators } =
        (await this.storage.get<PresenceStore>("presence")) ?? {};

      void this.storage.put(indicators);
    }, timeout);
  }

  async saveIndicator(_docId: string, indicator: PresenceIndicator) {
    const indicators = await this.storage.get<PresenceStore>("presence");
    await this.storage.put("presence", { ...indicators, [indicator.clientId]: indicator });

    this.expire(indicator.clientId, 30);
  }

  async getIndicators() {
    return (await this.storage.get<PresenceIndicator>("presence")) ?? {};
  }
}
