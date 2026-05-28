import { type PresenceIndicator } from "./PresenceIndicator";

import { IndicatorListener } from ".";

export interface PresenceClientConfig { 
  userId: string;
  /**
   * Sends local indicator state to a remote server to be merged into the remote presence state.
   * The endpoint this function hits is defined by you, and should call the 
   * PresenceAuthority's {@link https://pitter-patter.dev/docs/presence/reference/presence-server/classes/PresenceAuthority#updatepresence | updatePresence} 
   * function.
   */
  sendIndicator: (clientId: string, indicator: PresenceIndicator) => Promise<void>;
  /**
   * Receives an array of commits and merges them into your local editor state. This function should
   * use {@link https://pitter-patter.dev/docs/presence/reference/presence-client/functions/receivePresenceTransaction | receivePresenceTransaction}
   * to merge the indicators into the local editor state.
   */
  receiveIndicators: (indicators: Record<string, PresenceIndicator>) => void;
  listener: IndicatorListener;
}
