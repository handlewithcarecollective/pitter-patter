const scrollParentCache = new WeakMap<Element, Element | undefined>();

function isScrolling(element: Element) {
  var overflow = getComputedStyle(element, null).getPropertyValue("overflow");

  return overflow.indexOf("scroll") > -1 || overflow.indexOf("auto") > -1;
}

export function findScrollParent(element: Element) {
  if (scrollParentCache.has(element)) return scrollParentCache.get(element)!;

  var current = element.parentNode;
  while (current?.parentNode) {
    if (current instanceof Element && isScrolling(current)) {
      scrollParentCache.set(element, current);
      return current;
    }

    current = current.parentNode;
  }

  scrollParentCache.set(element, undefined);
  return undefined;
}

export function autoScroll(element: Element, x: number, y: number) {
  const scrollParent = findScrollParent(element);
  const scrollRect = scrollParent?.getBoundingClientRect() ?? {
    top: 0,
    left: 0,
    bottom: window.innerHeight,
    right: window.innerWidth,
  };

  const scrollX =
    -Math.max(75 - (x - scrollRect.left), 0) || Math.max(75 - (scrollRect.right - x), 0);
  const scrollY =
    -Math.max(75 - (y - scrollRect.top), 0) || Math.max(75 - (scrollRect.bottom - y), 0);

  (scrollParent ?? window).scrollBy({ top: scrollY * 2, left: scrollX * 2, behavior: "smooth" });
}

export class AutoScroller {
  private handler: (() => void) | undefined = undefined;
  private scrollParent: Element | Window = window;

  constructor() {}

  start(element: Element, x: number, y: number) {
    if (this.handler !== undefined) {
      this.scrollParent.removeEventListener("scroll", this.handler);
    }

    this.scrollParent = findScrollParent(element) ?? window;

    autoScroll(element, x, y);

    this.handler = () => {
      autoScroll(element, x, y);
    };

    this.scrollParent.addEventListener("scroll", this.handler);
  }

  stop() {
    if (this.handler !== undefined) {
      this.scrollParent.removeEventListener("scroll", this.handler);
      this.handler = undefined;
    }
  }
}

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
