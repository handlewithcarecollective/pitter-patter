export class TranslateCalculator {
  constructor(
    private originX: number,
    private originY: number,
    public startX: number,
    public startY: number,
    private rect: DOMRect,
    private liftAmount: number,
  ) {}

  slide(x: number, y: number) {
    const dx = x - this.startX;
    const dy = y - this.startY;
    return `rotateX(0) scale(1.05) translate(${this.originX + dx}px, ${this.originY + dy - this.liftAmount}px)`;
  }

  place(x: number, y: number) {
    const offsetX = this.rect.x - this.startX;
    const offsetY = this.rect.y - this.startY;

    const dx = x - this.startX - offsetX;
    const dy = y - this.startY - offsetY;

    return `rotateX(0) scale(1) translate(${this.originX + dx}px, ${this.originY + dy}px)`;
  }
}
