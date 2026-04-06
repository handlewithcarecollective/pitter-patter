import { PresenceIndicator } from "./PresenceIndicator";

export interface PresenceClientConfig {
  userId: string;
  sendIndicator: (
    clientId: string,
    indicator: PresenceIndicator,
  ) => Promise<void>;
  getIndicators: (
    clientId: string,
    refs?: Record<string, string>,
    options?: { signal?: AbortSignal },
  ) => Promise<Record<string, PresenceIndicator>>;
  receiveIndicators: (indicators: Record<string, PresenceIndicator>) => void;
}
