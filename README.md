# Meetha BE

NestJS backend refactor of the existing Meetha Express API. Feature folders follow `adamandp/chat-with-pdf-be`: `src/model/<feature>`, shared infrastructure in `src/common`, plus `guards`, `decorators`, `exceptions`, `utils`, `prisma`, `test`, and `docs`.

## Run

Use Node.js 24 LTS and npm.

```sh
npm ci
cp .env.example .env
# Fill in the existing Meetha database and service settings.
npm run build
npm start
```

The local ignored `.env` prepared during this refactor reuses the original Meetha environment and data directories. It is never committed. Development: `npm run start:dev`. API documentation: `/v1/docs`.

The API defaults to port 3000. The existing raw WebSocket broadcast relay is included on port 8080; Socket.IO remains attached to the HTTP server at `/socket.io`. Set `WS_RELAY_PORT` if needed. `RUNTIME_ENABLED=false` disables Redis, import polling and the broadcast relay for isolated HTTP development; it does not replace the database or upstream APIs.

### Recording transcription

With `RUNTIME_ENABLED=true`, startup validates `STT_SERVER` (HTTP/S), `WS_STT_SERVER` (HTTP/S or WS/S, as supported by the legacy WebSocket client), `REDIS_SERVER`, `BILLING_SERVICE_BASE_URL`, `BILLING_MEETHA_APP_ID` and a positive `PER_MINUTE_RATE`. The `stt:8080` values in `.env.example` are **examples**, not guaranteed reachable endpoints. Use the actual deployment endpoints. If only running HTTP locally, set `RUNTIME_ENABLED=false`: uploads may be recorded as pending, but **no transcription runs**.

The STT API receives `media_file` as a **filename** from the upload directory. STT must have a compatible shared-storage mount; a reachable HTTP endpoint alone does not prove the STT worker can open the file. Confirm the STT container sees the recorded file before running real transcription.

Import completion requires a successful transcript write and the number of durable `event_transcript` rows to reach STT's expected chunk count. An incomplete result fails after a 60-second grace period or on WebSocket disconnect, and is not billed by this worker. Restarting an unfinished import clears its stale in-memory state. Existing production tables are **not migrated**; the transcript is ordered by `start, id` because the checked-in schema has no `seq` column.

To diagnose a specific recording (replace the ID), query the DB read-only:

```sql
SELECT e.id, e.uploading, e.import_status, e.import_message, e.loading,
       e.total_segment, COUNT(et.id) AS transcript_count
FROM event e LEFT JOIN event_transcript et ON et.event_id = e.id
WHERE e.id = 123
GROUP BY e.id;
```

Billing and DB commits are separate services. The same recording should **not** be retried blindly after a billing request times out; reconcile billing logs first to avoid a duplicate charge. Full cross-service billing idempotency requires an upstream idempotency key/contract.

## Existing database and files

Use `DATABASE_URL` or the original `SQL_*` variables. Plaintext passwords are supported; existing encrypted passwords require `SQL_PASSWORD_ENCRYPTION_KEY` with the existing key. Never run `prisma migrate`, `prisma db push`, or Sequelize sync against the existing database. Startup never applies schema changes.

`prisma/schema.prisma` mirrors the checked-in original SQL definitions. User/role access uses Prisma; existing report queries, PostgreSQL functions and session-scoped advisory locks retain `pg` to preserve behavior. Verify the schema against the actual deployment with read-only introspection before production rollout if its schema differs from the source SQL.

Set `DATA_ROOT` to the original Meetha shared directory containing `file_uploaded`, `events`, and `summary`. Individual paths can be overridden with `UPLOAD_DIR`, `EVENTS_DIR`, `SUMMARY_DIR`, and `STATIC_DIR`. Preserve the shared filesystem mounts used by STT and LLM services. Email templates and static images are included in this repository.

## Validation

```sh
npm run lint
npm run prisma:validate
npm test
npm run test:e2e
```

Default HTTP tests mock upstream services and database access. Optional integration tests use dedicated local test services:

```sh
TEST_DATABASE_URL=postgresql://meetha_test@127.0.0.1:55439/meetha_be_test \
TEST_REDIS_URL=redis://127.0.0.1:56379 \
npm run test:e2e
```

The database integration suite **recreates the public schema** of the selected fixture database. It refuses non-local hosts and database names without a `_test` suffix. Never point it at a real Meetha database.

See [compatibility notes](docs/COMPATIBILITY.md) and the [route inventory](docs/routes.json) for retained contracts, pre-existing gaps and verification limits.
