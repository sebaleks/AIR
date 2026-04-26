# SenseRoute Product Spec (Baseline)

## Product thesis
SenseRoute routes context, memory, and user attention for AI glasses.

It decides:
- when to stay silent,
- when to remember,
- when to surface a wearable cue,
- and when to ask permission before action.

## Core entities

### ContextEvent
Represents raw context arriving from sensors or software sources.

Fields:
- `id`: unique ID
- `kind`: event kind (e.g., `departure_signal`)
- `source`: producer (`calendar`, `device`, `location`, etc.)
- `payload`: structured event body
- `timestamp`: ISO timestamp
- `confidence`: optional confidence estimate (0..1)
- `privacy_risk`: optional privacy sensitivity estimate (0..1)

### Salience score
For each event, SenseRoute computes:
- `urgency`
- `confidence`
- `user_value`
- `annoyance_cost`
- `privacy_risk`

All scores are normalized to `0..1`.

### Policy decision
Given event + salience, return one action:
- `ignore`
- `remember`
- `suggest`
- `ask_permission`
- `execute_preapproved`

## API
- `POST /events`: ingest one event and return score + policy decision.
- `GET /state`: current in-memory events, memories, and recent decisions.
- `POST /demo/leaving-mode`: run a synthetic "leaving mode" scenario.

## Baseline non-goals
- No auth system yet
- No persistent database yet
- No external tool execution
- No multi-user tenancy
