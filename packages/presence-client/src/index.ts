import { EditorState } from "prosemirror-state";

import { collabKey } from "@pitter-patter/collab-client";
import { randomRef } from "@pitter-patter/refs";

import { type PresenceClientConfig, type IndicatorListener } from "./config.ts";
import { type PresenceIndicator } from "./PresenceIndicator.ts";

export { type PresenceState, presenceKey, receivePresenceTransaction } from "./basePlugin.ts";

export { presence } from "./vanillaPlugin.ts";

export { type PresenceIndicator, type PresenceClientConfig, type IndicatorListener };

/**
 * The client that manages sending local presence state to the remote server and listening
 * for remote changes to presence state.
 */
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

  /**
   * Send updated presence state to the remote PresenceAuthority.
   */
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

  /**
   * Updates the desired portion of the client's `PresenceClientConfig`. For example, this can
   * be used to update the auth headers used by `send`.
   */
  update(config: Partial<Omit<PresenceClientConfig, "listener">>) {
    if (config.sendIndicator) this.sendIndicator = config.sendIndicator;
    if (config.receiveIndicators) this.receiveIndicators = config.receiveIndicators;
  }

  /**
   * Start listening for remote presence changes. This function should only be called once.
   */
  async listen(signal?: AbortSignal) {
    for await (const indicators of this.listener.listen(this.clientId, {
      signal,
    })) {
      if (signal && signal.aborted) break;
      this.receiveIndicators(indicators);
    }
  }

  getUserId(): string {
    return this.userId;
  }

  getClientId(): string {
    return this.clientId;
  }
}

export interface LongPollListenerOptions {
  // Todo: the timeout option is not currently used in the LongPollListner. Add support for it.
  // timeout?: number;
  /**
   * Any headers that need to be included in requests to your long polling endpoint. Defaults to an empty object.
   */
  headers?: Record<string, string>;
  /**
   * The fetch method to use when making requests. Defaults to the global fetch method.
   */
  fetch?: typeof globalThis.fetch;
}

/**
 * An {@link IndicatorListener} that polls an endpoint for remote updates to a document's presence state. Intended to be used
 * with an remote long polling endpoint that call a Presence Authority's {@link https://pitter-patter.dev/docs/presence/reference/presence-server/classes/PresenceAuthority#listenforpresence | listenForPresence}
 * function to efficiently listen for updates.
 */
export class LongPollListener {
  private headers: Record<string, string>;
  private fetch: typeof globalThis.fetch;

  /**
   * @param url - the url that polling requests will be sent to
   */
  constructor(
    private url: URL,
    options: LongPollListenerOptions = {},
  ) {
    this.headers = options.headers ?? {};
    this.fetch = options.fetch ?? globalThis.fetch.bind(globalThis);
  }

  /**
   * Update the headers sent with long polling requests.
   */
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
