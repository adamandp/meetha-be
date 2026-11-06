# Compatibility and verification

## Retained

The source is `meetha/api` plus `meetha/socket`. All active application routes from the Express router are represented in `routes.json`, with their original spelling, HTTP method, request fields and response envelopes. Existing export, import, transcript, attendance, billing, SSO, article, inappropriate-speech and Zoom algorithms are split into feature operation files. Typed Nest controllers/services handle routing and dependency registration. The operation files remain JavaScript to preserve the existing callback-heavy algorithms; this is not a claim that the entire business layer has been rewritten in TypeScript.

The original Vue and revamped Next.js FE code was read for contract comparison. No frontend files were edited. External services, schema and shared files are reused; no existing database migrations are run. Socket.IO event names and object-versus-JSON-string payloads are retained. The old standalone WebSocket broadcast server is integrated into the Nest application lifecycle.

Passwords continue to use bcrypt cost 10. Access/refresh token payloads, millisecond expiry fields and the Authorization renewal header retain their original format. The Nest auth guard uses the old feature auth middleware's verification/renewal behavior. The old separate Express JWT layer also required an `isAdmin` claim which local token issuance did not emit; this contradictory extra gate is not reproduced. Role-management access still requires role 1. This is an explicit correction, not byte-for-byte authentication middleware parity.

Production logging uses Pino; credential fields are redacted and existing diagnostic logs are routed through a sanitizing Pino bridge. Hardcoded Zoom/ASR/database encryption credentials are environment settings, preserved only in the local ignored environment file.

## Repairs to broken source paths

- `GET /v1/users/:userId` now looks up its actual ID parameter; the source attempted to read a nonexistent `username` parameter.
- `PATCH /v1/roles/:roleId` uses the role update schema; the source referred to an undefined user validation schema.
- Role deletion has a repository implementation; the source invoked a missing service method.
- Role creation supplies the mandatory existing database audit/status fields missing from the Sequelize model.
- `GET /v1/globals/exportTranscriptToWord` goes through the HTTP export entry point; the source routed directly to a multi-argument internal helper.
- Undefined error-path variables in billing/article/Zoom and password reset fall-through are corrected.
- Nested feature locations use explicit shared data paths instead of source/dist-relative directories.
- Prisma bigint database fields are normalized where the old model API exposed numbers, avoiding JSON serialization failures.
- Nest POST routes explicitly use status 200 where Express did; registration explicitly returns 201.

These repair unusable implementation paths without introducing new business workflows. Zod replaces Joi for the existing validated auth/user/role inputs; validation failures keep status 400 and a code/message envelope, while validation message wording can differ.

## Pre-existing frontend gaps

The revamped FE calls these paths, but the provided Express source has no active route for them:

| Method | Path | Source state |
| --- | --- | --- |
| GET | `/v1/globals/eventsCalendar` | No handler/route |
| POST | `/v1/globals/changeattendanceintranskrip` | No handler/route |
| POST | `/v1/globals/updatesummary` | No handler/route |
| POST | `/v1/globals/stopImport` | Handler exists, route not registered |

They are not silently invented during the refactor. The `stopImport` operation is retained in the import feature, matching the source's unrouted state. The original PDF export branch returns `PDF is not supported`; that limitation is preserved.

## Version decisions

Nest 11.2.8 is the latest compatible stable release in the 11 line at implementation time. Nest 12 is newer, but nestjs-zod 5.5.0 declares Nest 10/11 peer support. Prisma 7.10.1 is stable; the registry's Prisma 8 latest tag was a release candidate. TypeScript 6 is selected because current typescript-eslint declares support below 6.1. The lockfile records the exact resolved dependency versions. API/docs patterns were checked through Context7, and actual versions/peer ranges through npm.

## Verification limits

Automated checks cover startup, route inventory, auth/ownership checks, token renewal, billing forwarding, speech concurrency/error contracts, DOCX output, registration/login and user/role access on an isolated PostgreSQL instance, and Socket.IO notifications through an isolated Redis instance.

Real SSO, billing/Midtrans transactions, Zoom meetings, STT processing and LLM generation are not executed against live services by these tests. Production data and schema are not modified. A deployment smoke test against those existing services remains necessary before switching traffic from Express.
