# Geobble multiplayer server

NestJS server for authoritative multiplayer rooms. HTTP handles health checks;
Socket.IO serves real-time room events on the `/rooms` namespace. MongoDB
persists room state. The initial deployment is intended to run as one persistent
server instance; multiple instances require shared Socket.IO and room-presence
coordination (for example, a Redis adapter).

## Local development

1. Copy `.env.example` to `.env` and set `MONGODB_URI` to a MongoDB database
   available to your machine.
2. From this directory, install dependencies and start the server:

   ```sh
   npm install
   npm run start:dev
   ```

The server listens on `PORT` (default `3000`). `GET /health` reports liveness;
`GET /health/ready` returns `503` until MongoDB is connected.

To insert a disposable sample room into the configured database, run this
from `apps/server` after setting `MONGODB_URI` in `.env`:

```sh
npm run db:seed:test
```

The script builds the server schema, inserts a waiting room with two disconnected
placeholder players, prints the generated room code, and sets it to expire after
24 hours. Re-running it inserts another uniquely named test room.

## Configuration

See `.env.example` for supported variables and defaults. Set `CLIENT_ORIGINS`
to the exact comma-separated origins allowed to connect, including the deployed
client origin. `MONGODB_URI` and `REST_COUNTRIES_API_KEY` are required for the
default REST Countries v5 endpoint. The server fetches the country catalog from
`REST_COUNTRIES_API_URL` and caches it in memory. Keep the API key in the server
environment only.

## Room protocol

Clients connect with Socket.IO to the `/rooms` namespace. The event names and
TypeScript payloads are defined in `src/rooms/room-events.ts`.

Client events:

- `room:create`, `room:join`, and `room:reconnect` establish room membership.
- `room:ready` updates readiness; `room:start` starts a match.
- `room:change-settings` changes lobby settings immediately or queues them for
  the next round while a match is active.
- `room:command` submits an answer, skip, or reveal command.
- `room:leave` leaves the room.

Server events:

- `room:joined` returns the player ID, reconnect token, command sequence, and
  public room snapshot.
- `room:updated` broadcasts public room state.
- `room:command-accepted` and `room:command-rejected` acknowledge gameplay.
- `room:settings-accepted`, `room:left`, `room:closed`, and `room:error` report
  lifecycle outcomes.

The server validates commands and owns scoring, timers, round transitions, and
admin succession. Reconnect tokens are returned only on create/join/reconnect
and are stored hashed. Public snapshots omit unrevealed answers and private
reconnect data. Pin-locate guesses are kept private until the round is revealed.
A room needs at least two connected, ready players to start.

The Vite client connects to this protocol through its Socket.IO room transport.
For local development, create `apps/web-client/.env.local` with:

```dotenv
VITE_MULTIPLAYER_SERVER_URL=http://localhost:3000
```

In Vercel, set `VITE_MULTIPLAYER_SERVER_URL` to the deployed server's public
HTTPS origin (for example, the Render service URL) for the applicable
deployment environment, then redeploy so Vite includes it in the client build.
Set the same client origin in the server's `CLIENT_ORIGINS` value. The client
uses the `/rooms` namespace and keeps reconnect tokens in browser local storage;
the server remains authoritative for room state and gameplay.

## Tests and deployment

```sh
npm run build
npm run lint
npm test
npm run test:e2e
```

For Render, create a persistent web service with this directory as its root,
build command `npm install && npm run build`, and start command
`npm run start:prod`. Configure `MONGODB_URI` and `CLIENT_ORIGINS` in the
service environment. The platform-provided `PORT` is used automatically.
