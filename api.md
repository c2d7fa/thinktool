# Server-client API with support for connections

## Full state

This API call is used to initialize the data on the client.

    GET /state
    -> {things: {name: string, content: string, children: ConnectionId[]}[],
        connections: {name: string, parent: ThingId, child: ThingId, tag: ThingId?}[]}

## Change subscription

The server notifies the client through a websocket over which the server sends
the ID of things that have changed.

    WS /changes
    -> ThingId ...

## Getting thing data

Whenever the client wants to update its data to match a changed thing, it uses
this function:

    GET /state/things/<NAME>
    -> {content: string,
        children: {name: string, parent: ThingId, child: ThingId, tag: ThingId?}[],
        parents: {name: string, parent: ThingId, child: ThingId, tag: ThingId?}[]}

The client should then update its state by updating the given thing and
replacing or adding the connections with the given names.

## Updating thing data

All updates to things or connections except for updates to a connection's tag
is done by modifying the thing, not by modifying connections directly.

    PUT /state/things/<NAME>
    <- {content: string, children: {name, parent, child, tag?}[]}

Only the child connections are passed; parents in other items are automatically
updated on the server.

## Updating connection tag

The connection tag is updated directly:

    PUT /state/connections/<NAME>/tag
    <- ThingId

