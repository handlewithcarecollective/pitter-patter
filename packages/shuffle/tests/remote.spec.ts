import { expect, test } from "@playwright/test";

import { endDrag, movePointerBy, openEditor, pressHandle, remoteInsert } from "./helpers.ts";
import { h, p } from "./nodes.ts";

test("keeps dragging when a peer types in the editor before the drag's start pos", async ({
  page,
}) => {
  const errors = await openEditor(page, [h("Header"), p("Wide"), p("Tail")]);

  const session = await pressHandle(page, { type: "paragraph", text: "Wide" });
  await remoteInsert(page, { type: "heading", text: "Header" }, "!");
  await movePointerBy(page, session, 40, 40);
  await endDrag(page);

  expect(errors(), "the editor threw while a remote insert landed mid-drag").toEqual([]);
});
