/**
 * The contract between the browser harness and the Playwright specs.
 *
 * This module is type-only on purpose: specs import it in Node, and it must
 * never pull the library (or React) into the Node process.
 */

export interface HarnessOptions {
  /** Passed straight through to the shuffle plugin. */
  startDragInContentDOM?: boolean;
  /** Render hover decorations. Defaults to true. */
  hoverDecorations?: boolean;
  /** Whether the editor is editable. Defaults to true. */
  editable?: boolean;
}

/** Identifies a block in the harness document. */
export interface BlockRef {
  type: string;
  /** Exact text content. Ignored for nodes without a text block. */
  text?: string;
}

export interface Point {
  x: number;
  y: number;
}

/**
 * A node in the document, with the attributes Shuffle cares about and the
 * rectangle its DOM occupies.
 */
export interface HarnessBlock extends BlockRef {
  /** The node’s position in the document. */
  pos: number;
  /** The first grid column the block occupies, or null for nodes without spans. */
  start: number | null;
  /** The last grid column the block occupies, or null for nodes without spans. */
  end: number | null;
  zIndex: number;
  alignment: string | null;
  /** Distance from the root node; top level blocks are depth 1. */
  depth: number;
  /** Index of the node among each of its ancestors, starting at the doc. */
  path: number[];
  /** Child count, for containers and rows. */
  childCount: number;
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

/** A drag handle rendered by the library. */
export interface HarnessHandle {
  /** The handle’s label, which is the node type in sentence case. */
  label: string;
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface ShuffleHarness {
  /**
   * Replace the document with one built from the given top-level node JSON, and
   * resolve once the editor is mounted, laid out, and idle.
   */
  loadDoc(content: readonly unknown[], options?: HarnessOptions): Promise<void>;
  /** The document as JSON. */
  doc(): unknown;
  /** Every shuffle-relevant node, in document order. */
  blocks(): HarnessBlock[];
  /** Every drag handle currently rendered, in document order. */
  handles(): HarnessHandle[];
  /**
   * A point that hovers `ref` rather than one of its descendants, or null when
   * the block exposes no such point.
   */
  hoverPoint(ref: BlockRef): Point | null;
  /** The x coordinate of the left edge of a skeleton column (1-12). */
  columnLeft(column: number): number;
  /** Whether a shuffle drag is in progress. */
  dragging(): boolean;
}

declare global {
  interface Window {
    __shuffle: ShuffleHarness;
  }
}
