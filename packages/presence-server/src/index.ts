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

export interface PresenceIndicator {
  ref: string;
  clientId: string;
  userId: string;
  anchor: number;
  head: number;
  version: number;
}

export interface PresenceAuthorityConfig {
  /**
   * Saves and retrieves presence state. For example, see the {@link RedisPresencePersistenceManager}
   */
  persistenceManager: {
    saveIndicator: (docId: string, indicator: PresenceIndicator) => Promise<void>;
    getIndicators: (docId: string) => Promise<Record<string, PresenceIndicator>>;
  };
  /**
   * Creates listeners for updates to presence state and sends notifications to listeners when presence state is updated. See {@link RedisPresenceBroadcastManager}
   */
  broadcastManager: {
    broadcastIndicator: (docId: string, indicator: PresenceIndicator) => Promise<void>;
    listenForPresence: (
      docId: string,
      clientId: string,
      refs: Record<string, string>,
    ) => Promise<void>;
  };
}

/**
 * The PresenceAuthority manages most of Pitter Patter's server side presence operations.
 *
 * You create endpoints that call the appropriate PresenceAuthority functions to integrate with
 * a PresenceClient.
 *
 * A PresenceAuthority is designed to be stateless, so you can create a new one on every server,
 * lambda, or cloud function instance.
 */
export class PresenceAuthority {
  private persistenceManager: PresenceAuthorityConfig["persistenceManager"];
  private broadcastManager: PresenceAuthorityConfig["broadcastManager"];

  constructor(config: PresenceAuthorityConfig) {
    this.persistenceManager = config.persistenceManager;
    this.broadcastManager = config.broadcastManager;
  }

  /**
   * Saves new presence state for a client and notifies and listeners of the update.
   */
  async updatePresence(docId: string, indicator: PresenceIndicator) {
    await this.persistenceManager.saveIndicator(docId, indicator);
    await this.broadcastManager.broadcastIndicator(docId, indicator);
  }

  /**
   * Listens for remote changes to a document's presence state and returns when changes
   * are found or after a timeout specified in the PresenceAuthority's `broadcastManager`.
   */
  async listenForPresence(
    docId: string,
    excludeClientId: string,
    refs: Record<string, string> = {},
  ) {
    const prePresence = await this.persistenceManager.getIndicators(docId);
    const upToDate = Object.values(prePresence).every(
      (indicator) =>
        indicator.clientId === excludeClientId || refs[indicator.clientId] === indicator.ref,
    );
    if (!upToDate) {
      return Object.fromEntries(
        Object.entries(prePresence).filter(([clientId]) => clientId !== excludeClientId),
      );
    }
    await this.broadcastManager.listenForPresence(docId, excludeClientId, refs);
    const postPresence = await this.persistenceManager.getIndicators(docId);
    return Object.fromEntries(
      Object.entries(postPresence).filter(([clientId]) => clientId !== excludeClientId),
    );
  }
}

export interface RedisPresencePersistenceManagerConfig {
  redisUrl: string;
}

/**
 * Stores and retrieves presence state in the specified redis cluster
 */
export class RedisPresencePersistenceManager {
  private kv: RedisClientType;

  constructor(config: RedisPresencePersistenceManagerConfig) {
    this.kv = createClient({
      url: config.redisUrl,
    });
  }

  async connect() {
    await this.kv.connect();
  }

  async saveIndicator(docId: string, indicator: PresenceIndicator) {
    await this.kv.hSet(
      `pitter-patter:presence:${docId}`,
      indicator.clientId,
      JSON.stringify(indicator),
    );
    await this.kv.hExpire(`pitter-patter:presence:${docId}`, indicator.clientId, 30);
  }

  async getIndicators(docId: string) {
    const result = (await this.kv.hGetAll(`pitter-patter:presence:${docId}`)) as Record<
      string,
      string
    >;

    return Object.fromEntries(
      Object.entries(result).map(([clientId, indicatorString]) => [
        clientId,
        JSON.parse(indicatorString),
      ]),
    );
  }
}

export interface RedisPresenceBroadcastManagerConfig {
  redisUrl: string;
  timeout?: number;
}

/**
 * A broadcast manager that uses a Redis cluster as a message broker via Redis's pub/sub.
 *
 * When a client connects it specifies the document id to listen to.
 *
 * When presence state changes for a document all listeners for that document id are notified
 * that there is an update.
 */
export class RedisPresenceBroadcastManager {
  private pub: RedisClientType;
  private sub: RedisClientType;
  private timeout: number;

  constructor(config: RedisPresenceBroadcastManagerConfig) {
    this.pub = createClient({
      url: config.redisUrl,
    });
    this.sub = createClient({
      url: config.redisUrl,
    });
    this.timeout = config.timeout ?? 5_000;
  }

  async connect() {
    await Promise.all([this.sub.connect(), this.pub.connect()]);
  }

  async broadcastIndicator(docId: string, indicator: PresenceIndicator) {
    await this.pub.publish(
      `pitter-patter:presence:${docId}`,
      JSON.stringify({ ref: indicator.ref, clientId: indicator.clientId }),
    );
  }

  async listenForPresence(docId: string, excludeClientId: string, refs: Record<string, string>) {
    const { promise, resolve } = PromiseWithResolvers<void>();

    function listener(message: string) {
      const { ref, clientId } = JSON.parse(message) as {
        ref: string;
        clientId: string;
      };

      if (ref !== refs[clientId] && clientId !== excludeClientId) {
        resolve();
      }
    }

    await this.sub.subscribe(`pitter-patter:presence:${docId}`, listener);

    return await Promise.race([
      promise,
      new Promise<void>((resolve) => {
        setTimeout(resolve, this.timeout);
      }),
    ]).finally(async () => {
      await this.sub.unsubscribe(`pitter-patter:persistence:${docId}`, listener);
    });
  }
}
