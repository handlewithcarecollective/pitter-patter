import { EditorState } from "prosemirror-state";

import { collabKey } from "@pitter-patter/collab-client";
import { randomRef } from "@pitter-patter/refs";

import { type PresenceClientConfig } from "./config";
import { type PresenceIndicator } from "./PresenceIndicator";

export { presence, presenceKey, receivePresenceTransaction } from "./plugin";

export { type PresenceIndicator, type PresenceClientConfig };

export interface IndicatorListener {
  listen: (
    clientId: string,
    options?: { signal?: AbortSignal | undefined },
  ) => AsyncIterableIterator<Record<string, PresenceIndicator>>;
}

export class PresenceClient {
  private userId: string;
  private clientId: string;
  private sendIndicator: PresenceClientConfig["sendIndicator"];
  private listener: PresenceClientConfig["listener"];
  private receiveIndicators: PresenceClientConfig["receiveIndicators"];

  private lastSent: PresenceIndicator | null = null;

  constructor(config: PresenceClientConfig) {
    this.clientId = randomRef();
    this.userId = config.userId;
    this.sendIndicator = config.sendIndicator;
    this.listener = config.listener;
    this.receiveIndicators = config.receiveIndicators;
  }

  async send(editorState: EditorState) {
    const state = collabKey.getState(editorState);

    if (!state) {
      throw new Error("EditorState is missing the collab plugin, unable to listen for changes");
    }

    const { unconfirmed, version } = state;

    const indicator: PresenceIndicator = {
      ref: randomRef(),
      clientId: this.clientId,
      userId: this.userId,
      version,
      anchor: editorState.selection.anchor,
      head: editorState.selection.head,
    };

    for (const rebaseable of unconfirmed.slice().reverse()) {
      indicator.head = rebaseable.inverted.getMap().map(indicator.head);
      indicator.anchor = rebaseable.inverted.getMap().map(indicator.anchor);
    }

    if (
      this.lastSent?.version === indicator.version &&
      this.lastSent.anchor === indicator.anchor &&
      this.lastSent.head === indicator.head
    ) {
      return;
    }

    try {
      await this.sendIndicator(this.clientId, indicator);
      this.lastSent = indicator;
    } catch {}
  }

  update(config: Partial<Omit<PresenceClientConfig, "listener">>) {
    if (config.sendIndicator) this.sendIndicator = config.sendIndicator;
    if (config.receiveIndicators) this.receiveIndicators = config.receiveIndicators;
  }

  async listen(signal?: AbortSignal) {
    for await (const indicators of this.listener.listen(this.clientId, {
      signal,
    })) {
      if (signal && signal.aborted) break;
      this.receiveIndicators(indicators);
    }
  }
}

export interface LongPollListenerOptions {
  timeout?: number;
  headers?: Record<string, string>;
  fetch?: typeof globalThis.fetch;
}

export class LongPollListener {
  private headers: Record<string, string>;
  private fetch: typeof globalThis.fetch;

  constructor(
    private url: URL,
    options: LongPollListenerOptions = {},
  ) {
    this.headers = options.headers ?? {};
    this.fetch = options.fetch ?? globalThis.fetch.bind(globalThis);
  }

  update(headers: Record<string, string>) {
    this.headers = headers;
  }

  async *listen(clientId: string, options: { signal?: AbortSignal | undefined } = {}) {
    let refs: Record<string, string> = {};

    while (!options?.signal || !options.signal.aborted) {
      try {
        const response = await this.fetch(this.url, {
          headers: { ...this.headers, "Content-Type": "application/json" },
          method: "POST",
          body: JSON.stringify({
            clientId,
            refs,
          }),
        });

        if (!response.ok) {
          throw new Error(
            `Failed to get presence indicators. ${response.status}: ${response.statusText}`,
          );
        }

        const indicators = (await response.json()) as Record<string, PresenceIndicator>;

        const newRefs = Object.fromEntries(
          Object.entries(indicators).map(([clientId, indicator]) => [clientId, indicator.ref]),
        );

        if (Object.entries(newRefs).every(([clientId, ref]) => refs[clientId] === ref)) {
          continue;
        }

        refs = newRefs;

        yield indicators;
      } catch (e) {
        console.error(e);

        if (options.signal?.aborted) return;

        // TODO: Implement a backoff strategy
        await new Promise<void>((resolve) => {
          setTimeout(() => resolve(), 3_000);
        });
      }
    }
  }
}
