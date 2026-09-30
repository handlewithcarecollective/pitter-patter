/**
 * Document builders for spec fixtures. They produce plain ProseMirror node JSON
 * so that fixtures stay in the specs, next to the behaviour they set up.
 *
 * Blocks left without explicit `shuffleStart`/`shuffleEnd` get the schema
 * defaults of 4 and 9.
 */

type Attrs = Record<string, unknown>;

export function p(text: string, attrs?: Attrs) {
  return {
    type: "paragraph",
    ...(attrs && { attrs }),
    content: [{ type: "text", text }],
  };
}

export function h(text: string, level = 2, attrs?: Attrs) {
  return {
    type: "heading",
    attrs: { level, ...attrs },
    content: [{ type: "text", text }],
  };
}

export function img(attrs?: Attrs) {
  return { type: "image", ...(attrs && { attrs }) };
}

export function row(...children: unknown[]) {
  return { type: "row", content: children };
}

export function rowWith(attrs: Attrs, ...children: unknown[]) {
  return { type: "row", attrs, content: children };
}

export function container(...children: unknown[]) {
  return { type: "container", content: children };
}

export function containerWith(attrs: Attrs, ...children: unknown[]) {
  return { type: "container", attrs, content: children };
}

export function card(text: string) {
  return { type: "card", content: [p(text)] };
}

export function deck(...cards: unknown[]) {
  return { type: "card_deck", content: cards };
}
