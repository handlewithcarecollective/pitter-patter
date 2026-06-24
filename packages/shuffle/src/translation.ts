export class TranslateCalculator {
  public lastSlideX: number;
  public lastSlideY: number;

  private scrollX = 0;
  private scrollY = 0;

  constructor(
    private originX: number,
    private originY: number,
    public startX: number,
    public startY: number,
    private rect: DOMRect,
    private marginTop: number,
  ) {
    this.lastSlideX = this.startX;
    this.lastSlideY = this.startY;
  }

  scroll(dx: number, dy: number) {
    this.scrollX = dx;
    this.scrollY = dy;
  }

  slide(x: number, y: number) {
    this.lastSlideX = x;
    this.lastSlideY = y;

    const dx = x - this.startX;
    const dy = y - this.startY - this.marginTop;

    return {
      transform: `rotateX(0) translate(${this.originX + this.scrollX + dx}px, ${this.originY + this.scrollY + dy}px) scale(1.05)`,
      transformOrigin: `${this.startX - this.rect.x}px ${this.startY - this.rect.y - this.marginTop}px`,
    };
  }

  place(x: number, y: number) {
    const offsetX = this.rect.x - this.startX;
    const offsetY = this.rect.y - this.startY;

    const dx = x - this.startX - offsetX;
    const dy = y - this.startY - offsetY - this.marginTop;

    return {
      transform: `rotateX(0) translate(${this.originX + this.scrollX + dx}px, ${this.originY + this.scrollY + dy}px) scale(1)`,
      transformOrigin: "initial",
    };
  }

  reset() {
    return {
      transform: `rotateX(0) translate(${this.originX + this.scrollX}px, ${this.originY + this.scrollY}px) scale(1)`,
      transformOrigin: "initial",
    };
  }
}
