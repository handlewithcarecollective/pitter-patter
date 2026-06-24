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
