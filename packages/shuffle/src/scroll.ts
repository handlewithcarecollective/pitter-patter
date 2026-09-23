const scrollParentCache = new WeakMap<Element, Element>();

function isScrolling(element: Element) {
  const overflow = getComputedStyle(element, null).getPropertyValue("overflow");

  return overflow.indexOf("scroll") > -1 || overflow.indexOf("auto") > -1;
}

/**
 * Finds the nearest ancestor that scrolls its overflow. Falls back to the
 * document element, i.e. the viewport, when there is no scrolling ancestor.
 */
export function findScrollParent(element: Element) {
  const cached = scrollParentCache.get(element);
  if (cached) return cached;

  let current = element.parentNode;
  while (current?.parentNode) {
    if (current instanceof Element && isScrolling(current)) {
      scrollParentCache.set(element, current);
      return current;
    }

    current = current.parentNode;
  }

  scrollParentCache.set(element, document.documentElement);
  return document.documentElement;
}

/**
 * Whether the given scroll parent is the viewport rather than an element
 * with its own scrollable overflow.
 */
export function isViewportScroller(scrollParent: Element) {
  return scrollParent === document.documentElement || scrollParent === document.body;
}

/**
 * The element whose `scrollTop`/`scrollLeft`/`scrollBy` actually move the
 * given scroll parent.
 */
export function getScrollingElement(scrollParent: Element) {
  return isViewportScroller(scrollParent)
    ? (document.scrollingElement ?? document.documentElement)
    : scrollParent;
}

/**
 * The target that receives `scroll` events for the given scroll parent.
 */
export function getScrollEventTarget(scrollParent: Element): EventTarget {
  return isViewportScroller(scrollParent) ? window : scrollParent;
}

/**
 * The on-screen area of the given scroll parent, in client coordinates.
 */
function getScrollRect(scrollParent: Element) {
  if (isViewportScroller(scrollParent)) {
    return { top: 0, left: 0, bottom: window.innerHeight, right: window.innerWidth };
  }

  return scrollParent.getBoundingClientRect();
}

/**
 * Scrolls the element's scroll parent when the pointer is near one of its
 * edges. Returns whether it scrolled.
 */
export function autoScroll(element: Element, x: number, y: number) {
  const scrollParent = findScrollParent(element);
  const scrollRect = getScrollRect(scrollParent);

  const scrollX =
    -Math.max(75 - (x - scrollRect.left), 0) || Math.max(75 - (scrollRect.right - x), 0);
  const scrollY =
    -Math.max(75 - (y - scrollRect.top), 0) || Math.max(75 - (scrollRect.bottom - y), 0);

  if (!scrollX && !scrollY) return false;

  getScrollingElement(scrollParent).scrollBy({ top: scrollY / 3, left: scrollX / 3 });
  return true;
}

export class AutoScroller {
  private handler: (() => void) | undefined = undefined;
  private scrollTarget: EventTarget = window;
  /** Whether the pointer is currently near an edge and the page is being scrolled. */
  active = false;

  constructor() {}

  start(element: Element, x: number, y: number) {
    if (this.handler !== undefined) {
      this.scrollTarget.removeEventListener("scroll", this.handler);
    }

    this.scrollTarget = getScrollEventTarget(findScrollParent(element));

    this.active = autoScroll(element, x, y);

    this.handler = () => {
      this.active = autoScroll(element, x, y);
    };

    // Recursively call autoScroll, triggered by its own scroll
    // events, so that just holding the element near the edge
    // of the scroll parent continuously scrolls the parent.
    this.scrollTarget.addEventListener("scroll", this.handler);
  }

  stop() {
    if (this.handler !== undefined) {
      this.scrollTarget.removeEventListener("scroll", this.handler);
      this.handler = undefined;
    }
    this.active = false;
  }
}

/**
 * Tracks how far the window has scrolled since the drag started. Only the
 * window matters here: the drag clone is absolutely positioned in the body,
 * so it moves with the page when the window scrolls but stays put when a
 * nested scroll container does.
 */
export class ScrollCalculator {
  private initialOffsetX: number;
  private initialOffsetY: number;

  constructor() {
    this.initialOffsetX = window.scrollX;
    this.initialOffsetY = window.scrollY;
  }

  diff() {
    return {
      x: window.scrollX - this.initialOffsetX,
      y: window.scrollY - this.initialOffsetY,
    };
  }
}
