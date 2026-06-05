---
title: Presence
---

In the previous section, we made a prosemirror document collaborative with Pitter Patter's collab library. 
Now we will add prensence to tracking the cursor's of all editors on the collaborative document.

## Create a PresenceAuthority

Like with collab, the first step will be creating a PresenceAuthority on your backend. 
We will continue using Redis as a broadcast manager. Because presence does not require durable state, we will use
the same redis cluster to hold user's cursor state as well. All you need to create a PresenceAuthority, is the url to the redis cluster.

```ts
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

Like the CollabAuthority, the PresenceAuthority is stateless,
so you can create one in every server instance or function invocation your backend uses.
 

## Server Endpoints

You now need to create endpoints that allow your frontend clients to send and listen for updates to presence state
with the PresenceAuthority.

First, make a sendPresence endpoint for clients to send their cursor location to. 

```ts
app.post("/api/docs/:docId/presence/:clientId", async (req, res) => {
  const indicator = req.body as PresenceIndicator;
  await presenceAuthority.updatePresence(req.params.docId, indicator);

  res.status(204).send(null);
});
```
The path of this endpoint is up to you. The only requirement is that the `docId` and the client's new PresenceIndicator are included 
request. Here, the `docId` is included in the endpoint's path, and the PresenceIndicator in included in the request body. We'll see 
where this endpoint is called when we implement the PresenceClient below.

The body of this endpoint submits the new PresenceIndicator to the PresenceAuthority and returns a 204. The PresenceAuthority will 
then notify any clients listening to this document of the update.

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
This endpoint must use the POST method. The docId needs to be included in the URL path, and the request body should
have a `refs` and `clientId` field. The PresenceClient will include these fields in the request body automatically.

The function body just calls the PresenceAuthority's listenForCommit function and returns the updated presence when it is found.

## Creating the client

You can now connect your frontend client to the presence backend using PitterPatter's PresenceClient. 

Like with the CollabClient, you create a listener for presence state updates. 

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
The LongPollListener takes the url of the getPresence endpoint, as well as optional headers for requests to that endpoint. These headers can be updated with the listener's `update` method.

Next create a config for the PresenceClient. The config contains the listener created above and two functions that the CollabClient will use
to interact with your backend and your local editor state, sendIndicator and receiveIndicators. 

* **sendIndicators**:
  takes a new presence indicator as an argument and sends it to the sendCommits endpoint you created above.
* **receiveIndicators**:
  receives an array of indicators and merges them into your local editor state

```ts
const presenceConfig = useMemo<PresenceClientConfig>(
  () => ({
    userId,
    sendIndicator: async (indicator) => {
      await fetch(`/api/docs/${doc.id}/presence/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(indicator),
      });
    },
    receiveIndicators: (indicators) => {
      setState((prev) => prev.apply(receivePresenceTransaction(prev, indicators)));
    },
    listener: presenceListener,
  }),
  [presenceListener, doc.id],
);
```

Then you create a PresenceClient. 
```ts
  const [presenceClient] = useState(() => new PresenceClient(presenceConfig));
```

Tell the PresenceClient to listen for updates
```ts
  useEffect(() => {
    const abortController = new AbortController();
    presenceClient.listen(abortController.signal).catch((e) => console.error(e));

    return () => {
      abortController.abort();
    };
  }, [presenceClient, initialState]);
```

And send your client's indicator state when it updates
```ts
  useEffect(() => {
    presenceClient.send(state).catch((e) => console.error(e));
  }, [presenceClient, state]);
```
