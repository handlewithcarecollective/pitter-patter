import { EditorState } from "prosemirror-state";

import { collabKey } from "@pitter-patter/collab-client";
import { randomRef } from "@pitter-patter/refs";

import { type PresenceClientConfig } from "./config";
import { type PresenceIndicator } from "./PresenceIndicator";

export { presence, presenceKey, receivePresenceTransaction } from "./plugin";

export { type PresenceIndicator, type PresenceClientConfig };

export class PresenceClient {
  private userId: string;
  private clientId: string;
  private refs: Record<string, string> = {};
  private sendIndicator: PresenceClientConfig["sendIndicator"];
  private getIndicators: PresenceClientConfig["getIndicators"];
  private receiveIndicators: PresenceClientConfig["receiveIndicators"];

  private lastSent: PresenceIndicator | null = null;

  constructor(config: PresenceClientConfig) {
    this.clientId = randomRef();
    this.userId = config.userId;
    this.sendIndicator = config.sendIndicator;
    this.getIndicators = config.getIndicators;
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

  async listen(signal: AbortSignal) {
    while (!signal.aborted) {
      try {
        const indicators = await this.getIndicators(this.clientId, this.refs, {
          signal,
        });

        const newRefs = Object.fromEntries(
          Object.entries(indicators).map(([clientId, indicator]) => [clientId, indicator.ref]),
        );

        if (Object.entries(newRefs).every(([clientId, ref]) => this.refs[clientId] === ref)) {
          continue;
        }

        this.refs = newRefs;

        this.receiveIndicators(indicators);
      } catch (e) {
        console.error(e);
        await new Promise<void>((resolve) => {
          setTimeout(() => resolve(), 3_000);
        });
      }
    }
  }
}

export interface LongPollListenerOptions {
  timeout?: number;
  headers?: HeadersInit;
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

    this.getIndicators = this.getIndicators.bind(this);
  }

  async getIndicators(clientId: string, refs?: Record<string, string>) {
    const response = await this.fetch(this.url, {
      headers: { ...this.headers, "Content-Type": "application/json" },
      method: "POST",
      body: JSON.stringify({
        clientId,
        refs,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to get commits. ${response.status}: ${response.statusText}`);
    }

    return (await response.json()) as Record<string, PresenceIndicator>;
  }
}
