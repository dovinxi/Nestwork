# NestWork

A personal contact & relationship manager. Not a social network — a private tool for
remembering who people are, how you know them, and how to stay in touch.

## Why this exists

Address books store facts. NestWork is meant to store *context*: how you met someone,
what you have in common with them, what to remember about their life, and how often you
want to reach out. The relationship "web" view exists to answer a specific question —
"who do I know that's connected to this person?" — that a flat contact list can't.

## Monorepo layout

```
NestWork/
  apps/
    server/   Express + TypeScript API, Prisma ORM, SQLite (local-first storage)
    web/      React + TypeScript + Vite frontend, Tailwind CSS
  packages/
    shared/   TypeScript domain types shared by web and server (no build step --
              both Vite and tsx transpile the .ts source directly)
```

An `apps/desktop` package can be added later (Tauri or Electron, wrapping `apps/web`)
without changing the data model or API — see "Desktop later" below.

## Data model

Defined once in [`packages/shared/src`](packages/shared/src) and mirrored in
[`apps/server/prisma/schema.prisma`](apps/server/prisma/schema.prisma):

- **Contact** — name, contact info, birthday, work info, freeform notes, and
  `relationshipToMe` (a free-text description of *your* relationship to them, e.g.
  "college roommate"). Also carries `keepInTouch` (a cadence in days, last-contacted
  date, and a computed next-reminder date).
- **Circle** — *where someone fits in your life* (Family, Work, College, ...). A
  contact can belong to several. Circles are the spatial clusters in the relationship
  web — each contact is placed in its first circle's wedge.
- **Tag** — *what you know about someone* — freeform attributes, many-to-many with
  contacts. Two contacts sharing a tag draw a thin cross-cutting line between their
  clusters in the relationship web, independent of Circle or Relationship.
- **Relationship** — an edge *between two contacts* (not the user), e.g. "Ada —
  coworker — Charles". Rendered as a solid line in the relationship web graph.
- **Interaction** — a logged touchpoint or a flagged "thing to remember" about a
  contact (marking one `important` surfaces it on their profile).
- **DraftMessage** — phase 2 (see below). The table and API route exist now so the
  data model won't need to change when AI drafting is built.

Circle vs. Tag is a deliberate split: Circle answers "where do they fit" (life
domain, mostly one at a time), Tag answers "what do I know about them" (facts,
interests, any number of them).

## Getting started

Requires Node 18+ (tested on Node 21) and npm.

```bash
npm install
npm run db:migrate   # creates apps/server/prisma/dev.db and seeds default circles
npm run dev          # starts the API on :4000 and the web app on :5173
```

Then open http://localhost:5173.

Other useful scripts:

```bash
npm run db:studio    # Prisma Studio, a GUI for the local SQLite database
npm run build        # typecheck shared, build server, build web
```

## Storage & privacy

Contact data lives in a local SQLite file (`apps/server/prisma/dev.db`), which is
git-ignored. There's no account system and no data leaves your machine. If cloud sync
is wanted later, the only structural change needed is swapping the Prisma
`datasource.provider` from `sqlite` to `postgresql` (or similar) — the API and
frontend don't need to change.

## Desktop later

The web app was built with a desktop wrapper in mind:

- The frontend talks to the backend only through the `/api/*` REST routes in
  [`apps/web/src/api`](apps/web/src/api) — no assumptions about running in a browser
  tab, so it can be pointed at a bundled local server from Tauri or Electron.
- Local-first storage (SQLite) means there's no cloud dependency to work around when
  packaging a desktop build.
- When we get there: Tauri is the lighter-weight option (smaller binaries, Rust
  shell) if we're comfortable adding a Rust toolchain; Electron is more turnkey since
  it's pure Node/JS, at the cost of bundle size.

## Phase 2: AI-assisted messaging

Not built yet, but the seams are in place:

- `DraftMessage` (schema + shared types + `/api/draft-messages`) already exists.
  Today it only accepts manually-typed drafts.
- When built, this route will call an LLM with the contact's notes, tags, recent
  interactions, and an occasion (e.g. "birthday", "just checking in") to generate
  `draftText`, and set `generatedByAI: true`.
- The UI already has a "Draft a message" section on each contact's page (marked "AI
  drafting coming in phase 2") wired to save/list drafts, so the phase 2 work is
  additive: swap the manual textarea flow for a "Generate" button that calls the same
  endpoint.

## What's built vs. what's next

**Working now:** add/edit/delete contacts, circles, tags, keep-in-touch cadence +
reminders, interaction/notes log, contact-to-contact relationships, a relationship
web with circle-based clustering and tag cross-links.

**Not yet built:** contact import (CSV/vCard/Google), a real force-directed graph
layout (the current graph view is a simple circular layout), AI message drafting.
These were explicitly deferred, not forgotten — see the data model notes above for
how each was planned for.
