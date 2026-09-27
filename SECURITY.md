# Security

Flow of Funds is a small public preview, but it touches payments concepts and
runs a metered AI backend, so it is built defensively.

## Reporting a vulnerability

Please report security issues privately to **hello@fintechnorth.ca** rather than
opening a public issue. Include steps to reproduce and the impact you observed.
There is no bug-bounty program; this is a community project, but reports are
genuinely appreciated and will be acknowledged.

## What is (and isn't) sensitive here

- **Keep credentials out of Git.** Supply secrets through environment variables
  (`.env.local` is gitignored). `.env.example` contains configuration defaults
  with credential values left empty. Scan your own changes before publishing;
  a clean automated scan is useful evidence, not a guarantee.
- **Least privilege to the database.** The app reads Supabase with the
  anon / publishable key only, gated by Row Level Security. It never uses a
  `service_role` key, and the privileged read paths run through
  `SECURITY DEFINER` RPCs.
- **The share format is content, not a session.** A shared diagram is encoded
  in the URL (`src/lib/share.ts`); there is no server-side persistence of shared
  flows.

## Backend safety posture

- Same-origin / origin guards on the generate endpoint.
- Per-IP rate limiting (Upstash, with an in-memory fallback).
- A global daily spend kill-switch that fails safe (no keys or budget exhausted
  degrades to the zero-cost fixture provider).
- Optional Cloudflare Turnstile bot gate (verified before any paid generation).

## Note for anyone forking

Bring your own keys and your own admin secret, rotate them, and set a provider
spend cap. Do not reuse the Fintech North brand assets (see `NOTICE`).
