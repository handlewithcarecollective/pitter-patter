import { harness } from "./harness.tsx";

import "./harness.css";
import "@pitter-patter/shuffle/style/shuffle.css";
import "prosemirror-view/style/prosemirror.css";

declare global {
  interface Window {
    __shuffle: typeof harness;
  }
}

window.__shuffle = harness;
