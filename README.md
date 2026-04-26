# AIR

AIR is an ambient-agent orchestrator for AI glasses.

It routes context, memory, and user attention. It decides when to stay silent, when to remember, when to surface a wearable cue, and when to ask permission to act.

## Baseline prototype

This baseline includes:

- Context event ingestion
- In-memory memory store
- Salience scoring engine
- Policy decision engine
- Demo scenario: `leaving_mode`
- HTTP API endpoints:
  - `POST /events`
  - `GET /state`
  - `POST /demo/leaving-mode`

## Quick start

```bash
npm install
npm run build
npm start
```

Server defaults to `http://localhost:3000`.

## Run tests

```bash
npm test
```

## Example usage

Create an event:

```bash
curl -s -X POST http://localhost:3000/events \
  -H 'content-type: application/json' \
  -d '{
    "kind": "departure_signal",
    "source": "calendar",
    "payload": {"minutes_to_departure": 5},
    "confidence": 0.9,
    "privacy_risk": 0.2,
    "timestamp": "2026-04-26T10:00:00.000Z"
  }'
```

Run leaving mode demo:

```bash
curl -s -X POST http://localhost:3000/demo/leaving-mode
```
