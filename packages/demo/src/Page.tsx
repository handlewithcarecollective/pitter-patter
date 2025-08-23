"use server-entry";

import "./client.js";
import { Editor } from "./Editor.js";

export function Page() {
  return (
    <html>
      <head>
        <title>Parcel React Server App</title>
      </head>
      <body>
        <h1>Hello world!</h1>
        <Editor />
      </body>
    </html>
  );
}
