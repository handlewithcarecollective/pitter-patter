## 0.3.11

### Patch Changes

- Stay within the parent node when dragging between blocks

- Allow consumers to set a background color on the shuffle clone; set a small box shadow on the
  shuffle clone; track the mouse pointer rather than the center of the drag clone when calculating
  transforms.

- When a drag starts on a drag handle, don't report a y-axis move until the drag has moved outside
  the original handle rect
