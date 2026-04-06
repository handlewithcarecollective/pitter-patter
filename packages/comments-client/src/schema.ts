import { type MarkSpec } from "prosemirror-model";

export const comment: MarkSpec = {
  attrs: {
    threadId: { validate: "string" },
  },
  inclusive: false,
  excludes: "", // Allows multiple overlapping comment marks with unique ids
  parseDOM: [
    {
      tag: "span[data-mark-type='comment']",
      getAttrs(mark) {
        return {
          threadId: mark.dataset["threadId"],
        };
      },
    },
  ],
  toDOM(mark) {
    return [
      "span",
      {
        "data-mark-type": "comment",
        "data-thread-id": mark.attrs["threadId"],
      },
      0,
    ];
  },
};
