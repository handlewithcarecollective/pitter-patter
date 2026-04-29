"use server-entry";

import "../client.js";

import { Selectable } from "kysely";

import { DB } from "../database/schema.js";

import { Editor } from "./Editor.js";

interface Props {
  doc: Selectable<DB["doc"]>;
}

export function EditorPage({ doc }: Props) {
  return (
    <html suppressHydrationWarning>
      <head>
        <title>Pitter Patter Demo</title>
      </head>
      <body suppressHydrationWarning>
        <h1>Pitter Patter Demo</h1>
        <Editor doc={doc} />
      </body>
    </html>
  );
}
