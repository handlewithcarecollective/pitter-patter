"use server-entry";

import "../client.js";

export function HomePage() {
  return (
    <html suppressHydrationWarning>
      <head>
        <title>Pitter Patter Demo</title>
      </head>
      <body suppressHydrationWarning>
        <h1>Pitter Patter Demo</h1>
        <form method="POST" action="/api/docs">
          <button type="submit">Create a new doc!</button>
        </form>
      </body>
    </html>
  );
}
