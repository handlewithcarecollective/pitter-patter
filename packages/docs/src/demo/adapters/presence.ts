import { PresenceIndicator } from "@pitter-patter/presence-client";

export class WebSocketListener {
  constructor(
    private getPresence: (clientId: string, refs: Record<string, string>) => Promise<void>,
    private presenceIterator: AsyncIterator<
      Record<string, PresenceIndicator> | undefined,
      void,
      unknown
    >,
  ) {}

  async *listen(clientId: string, options: { signal?: AbortSignal | undefined } = {}) {
    let refs: Record<string, string> = {};

    while (!options.signal || !options.signal.aborted) {
      try {
        await this.getPresence(clientId, refs);
        const { value: indicators } = await this.presenceIterator.next();
        if (!indicators) continue;

        const newRefs = Object.fromEntries(
          Object.entries(indicators).map(([clientId, indicator]) => [clientId, indicator.ref]),
        );

        if (
          Object.keys(newRefs).length === Object.keys(refs).length &&
          Object.entries(newRefs).every(([clientId, ref]) => refs[clientId] === ref)
        ) {
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
