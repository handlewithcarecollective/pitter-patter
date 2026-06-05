---
title: Presence
---

In the previous section, we made a Prosemirror document collaborative with Pitter Patter's Collab
library. Now we will add presence to track the cursor's of all editors on the collaborative
document.

## Create a [PresenceAuthority](https://pitter-patter.dev/docs/presence/reference/presence-server/classes/PresenceAuthority)

Similar to Collab, the first step will be creating a
[PresenceAuthority](https://pitter-patter.dev/docs/presence/reference/presence-server/classes/PresenceAuthority)
on your backend. We will continue using Redis as a broadcast manager. Because presence does not
require durable state, we will use the same Redis cluster to hold the user's cursor state as well.
All you need to create a
[PresenceAuthority](https://pitter-patter.dev/docs/presence/reference/presence-server/classes/PresenceAuthority),
is the url to the Redis cluster.

```ts
import {
  PresenceAuthority,
  RedisPresenceBroadcastManager,
  RedisPresencePersistenceManager,
} from "@pitter-patter/presence-server";

const presenceBroadcaster = new RedisPresenceBroadcastManager({
  redisUrl: process.env["REDIS_URL"] ?? "redis://localhost:6379",
});

const presencePersister = new RedisPresencePersistenceManager({
  redisUrl: process.env["REDIS_URL"] ?? "redis://localhost:6379",
});

const presenceAuthority = new PresenceAuthority({
  persistenceManager: presencePersister,
  broadcastManager: presenceBroadcaster,
});
```

Like the
[CollabAuthority](https://pitter-patter.dev/docs/collab/reference/collab-server/classes/CollabAuthority),
the
[PresenceAuthority](https://pitter-patter.dev/docs/presence/reference/presence-server/classes/PresenceAuthority)
is stateless, so you can create one in every server instance or function invocation your backend
uses.

## Server Endpoints

You now need to create endpoints that allow your frontend clients to send and listen for updates to
presence state with the
[PresenceAuthority](https://pitter-patter.dev/docs/presence/reference/presence-server/classes/PresenceAuthority).

First, make a sendPresence endpoint for clients to send their cursor location to.

```ts
import { PresenceIndicator } from "@pitter-patter/presence-server";

app.post("/api/docs/:docId/presence/:clientId", async (req, res) => {
  const indicator = req.body as PresenceIndicator;
  await presenceAuthority.updatePresence(req.params.docId, indicator);

  res.status(204).send(null);
});
```

The path of this endpoint is up to you. The only requirement is that the `docId` and the client's
new PresenceIndicator are included request. Here, the `docId` is included in the endpoint's path,
and the PresenceIndicator in included in the request body. We'll see where this endpoint is called
when we implement the
[PresenceClient](https://pitter-patter.dev/docs/presence/reference/presence-client/classes/PresenceClient)
below.

The body of this endpoint submits the new PresenceIndicator to the
[PresenceAuthority](https://pitter-patter.dev/docs/presence/reference/presence-server/classes/PresenceAuthority)
and returns a 204. The
[PresenceAuthority](https://pitter-patter.dev/docs/presence/reference/presence-server/classes/PresenceAuthority)
will then notify any clients listening to this document of the update.

Next make the getPresence endpoint where clients can listen for updates to other's presence.

```ts
app.post("/api/docs/:docId/presence", async (req, res) => {
  const { refs, clientId } = req.body as {
    refs: Record<string, string> | undefined;
    clientId: string;
  };

  const presence = await presenceAuthority.listenForPresence(req.params.docId, clientId, refs);

  res.status(200).send(presence);
});
```

This endpoint must use the POST method. The docId needs to be included in the URL path, and the
request body should have a `refs` and `clientId` field. The
[PresenceClient](https://pitter-patter.dev/docs/presence/reference/presence-client/classes/PresenceClient)
will include these fields in the request body automatically.

The function body just calls the PresenceAuthority's listenForCommit function and returns the
updated presence when it is found.

## Creating the client

You can now connect your frontend client to the presence backend using PitterPatter's
[PresenceClient](https://pitter-patter.dev/docs/presence/reference/presence-client/classes/PresenceClient).

Like with the
[CollabClient](https://pitter-patter.dev/docs/collab/reference/collab-client/classes/CollabClient),
you create a listener for presence state updates with Presence's built-in
[LongPollListner](https://pitter-patter.dev/docs/presence/reference/presence-client/classes/LongPollListener).

```ts
const [presenceListener] = useState(
  () =>
    new PresenceListener(
      new URL(
        `/api/docs/${doc.id}/presence`,
        typeof window !== "undefined" ? window.location.href : "http://localhost:3000",
      ),
    ),
);
```

The
[LongPollListner](https://pitter-patter.dev/docs/presence/reference/presence-client/classes/LongPollListener)
takes the url of the getPresence endpoint, as well as optional headers for requests to that
endpoint. These headers can be updated with the listener's
[update](https://pitter-patter.dev/docs/presence/reference/presence-client/classes/LongPollListener#update)
method.

Next create a config for the
[PresenceClient](https://pitter-patter.dev/docs/presence/reference/presence-client/classes/PresenceClient).
The config contains the listener created above and two functions that the
[PresenceClient](https://pitter-patter.dev/docs/presence/reference/presence-client/classes/PresenceClient)
will use to interact with your backend and your local editor state, sendIndicator and
receiveIndicators.

- **sendIndicators**: takes a new presence indicator as an argument and sends it to the sendCommits
  endpoint you created above.
- **receiveIndicators**: receives an array of indicators and merges them into your local editor
  state

```ts
import { receivePresenceTransaction } from "@pitter-patter/presence-client";

const presenceConfig = {
  userId,
  sendIndicator: async (indicator) => {
    await fetch(`/api/docs/${doc.id}/presence/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(indicator),
    });
  },
  receiveIndicators: (indicators) => {
    // merge a new set of indicators into your editor state for example:
    // const newEditorState = oldEditorState.apply(receivePresenceTransaction(oldEditorState, indicators)));
  },
  listener: presenceListener,
};
```

Then you create the
[PresenceClient](https://pitter-patter.dev/docs/presence/reference/presence-client/classes/PresenceClient).

```ts
import { PresenceClient } from "@pitter-patter/presence-client";

const [presenceClient] = useState(() => new PresenceClient(presenceConfig));
```

Tell the
[PresenceClient](https://pitter-patter.dev/docs/presence/reference/presence-client/classes/PresenceClient)
to listen for updates

```ts
const abortController = new AbortController();
presenceClient.listen(abortController.signal).catch((e) => console.error(e));
```

And send your client's indicator state when it updates

```ts
presenceClient.send(state).catch((e) => console.error(e));
```
