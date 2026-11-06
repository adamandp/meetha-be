const console = require("../app-logger/console.js");
const config = require("../config/config.js");
const moment = require("moment");
const { client: WebSocketClient } = require("websocket");
const axios = require("axios");
const email = require("../email/email.js");
const { BILLING_CLAIM_MESSAGE } = require("./import-constants.js");
const { createAdapter } = require("@socket.io/redis-adapter");
const { createClient } = require("redis");
let uploadingEvents = [];
let dbpool = null; // Will change to PostgreSQL Pool instance
let io = null;
const activeConnections = new Set();
let stopping = false;
let getUploadInterval = null;
let processUploadInterval = null;
let fetchingEvents = false;
let processingEvents = false;
let queueVersion = 0;
const COMPLETION_GRACE_MS = 60_000;

const removeQueuedEvent = (event) => {
  queueVersion++;
  clearTimeout(event.completionTimer);
  uploadingEvents = uploadingEvents.filter((item) => item !== event);
  if (event.connection) {
    event.connection.close();
    activeConnections.delete(event.connection);
    event.connection = null;
  }
  event.ws?.abort();
  event.ws = null;
  event.importWSConnected = false;
};

let redisClient, pubClient, subClient;
const connectToRedis = async (client) => {
  client.on("error", (err) => logger.error({ err }, "Redis error"));
  await client.connect();
};
const logger = require("../app-logger/logger.js");
const startService = async (http, pool) => {
  if (io) return;
  stopping = false;
  moment.locale("id");
  redisClient = createClient({
    url: config.services.redis.server_url.startsWith("redis")
      ? config.services.redis.server_url
      : "redis://" + config.services.redis.server_url,
  });
  pubClient = redisClient.duplicate();
  subClient = redisClient.duplicate();
  await Promise.all([
    connectToRedis(redisClient),
    connectToRedis(pubClient),
    connectToRedis(subClient),
  ]);

  dbpool = pool;

  io = require("socket.io")(http, {
    cors: {
      origins: ["*"],
      methods: ["GET", "POST"],
    },
    adapter: createAdapter(pubClient, subClient),
    allowEIO3: true, // Allow Engine.IO version 3 clients
    transports: ["websocket", "polling"], // Enable both WebSocket and polling transports
    pingTimeout: 60000, // Increase ping timeout
    pingInterval: 25000, // Increase ping interval
  });

  try {
    io.adapter(createAdapter(pubClient, subClient));
    console.log("Socket.IO Redis adapter created successfully");
  } catch (error) {
    console.error("Error creating Socket.IO Redis adapter:", error);
  }

  console.log("Socket IO started");
  io.on("connection", (socket) => {
    console.log(`Socket new client connected: ${socket.id}`);
    // Log connection details
    console.log(`Socket client IP: ${socket.handshake.address}`);
    console.log(
      `Socket client User Agent: ${socket.handshake.headers["user-agent"]}`,
    );

    // Log any query parameters
    // console.log('Socket connection query params:', socket.handshake.query);
    console.log(`Socket Transport used: ${socket.conn.transport.name}`);
    console.log(`Socket IP: ${socket.handshake.address}`);
    // console.log(`Socket Headers:`, socket.handshake.headers);

    console.log(`Socket total clients connected: ${io.engine.clientsCount}`);

    socket.on("disconnect", (reason) => {
      console.log(
        `Socket client disconnected: ${socket.id}. Reason: ${reason}`,
      );
      console.log(`Socket remaining clients: ${io.engine.clientsCount}`);
    });

    socket.on("error", (error) => {
      console.error(`Socket error for client ${socket.id}:`, error);
    });
  });

  io.of("/").adapter.on("error", (error) => {
    console.error("Socket.IO Redis adapter error:", error);
  });

  try {
    // Test Redis connection
    await redisClient.ping();
    console.log("Redis connection test successful");
  } catch (error) {
    console.error("Redis connection test failed:", error);
  }

  setupService();
};
const checkEventIsExistOnArray = (event, events) =>
  events.some((existingEvent) => existingEvent.id === event.id);
const setupService = () => {
  getUploadInterval = setInterval(fetchUploadableEvents, 2000);
  processUploadInterval = setInterval(processUploadingEvents, 1000);
};
const fetchUploadableEvents = async () => {
  if (!dbpool || stopping || fetchingEvents) return;
  fetchingEvents = true;
  const version = queueVersion;
  try {
    const { rows } = await dbpool().query(
      "SELECT * FROM event WHERE (import_file_path IS NOT NULL OR online_meeting_link IS NOT NULL) AND (uploading = 0 OR uploading = 1) AND loading < 100 AND import_message IS DISTINCT FROM $1 ORDER BY timestart ASC",
      [BILLING_CLAIM_MESSAGE],
    );
    // Do not re-queue stale rows from a SELECT started before completion,
    // failure, stop, or restart. The next poll reads the new DB state.
    if (version !== queueVersion || stopping) return;
    for (const row of rows) {
      if (!checkEventIsExistOnArray(row, uploadingEvents)) {
        uploadingEvents.push(row);
      }
    }
  } catch (error) {
    logger.error({ err: error }, "Failed to fetch pending imports");
  } finally {
    fetchingEvents = false;
  }
};
const processUploadingEvents = async () => {
  if (stopping || processingEvents) return;
  processingEvents = true;
  try {
    for (const event of uploadingEvents) {
      if (
        event &&
        event.id > 0 &&
        (event.uploading === 0 || event.uploading === 1) &&
        !event.failed &&
        !event.finished &&
        !event.processing &&
        !event.ws &&
        !event.importWSConnected
      ) {
        console.log(`Processing event ID: ${event.id}`);
        event.processing = true;
        try {
          await processImportEvent(event);
        } catch (error) {
          console.log(
            `Error processing event ID: ${event.id}, Error: ${error.message}`,
          );
          await handleEventFailure(event, error);
        } finally {
          event.processing = false;
        }
      }
    }
  } catch (error) {
    console.log(`Error in upload processing interval: ${error.message}`);
  } finally {
    processingEvents = false;
  }
};
const processImportEvent = async (uploadingEvent) => {
  const { base_url, credit_endpoint } = config.services.billing;
  const perMinutePricing = config.services.pricing.staticPerMinutes;
  const user_uuid = uploadingEvent.data_user_uuid;
  const apiUrl = `${base_url}${credit_endpoint}`;
  const { data: billingUserResponse } = await axios.get(
    `${apiUrl}${user_uuid}`,
    { timeout: 15_000 },
  );
  if (uploadingEvent.failed || stopping) return;
  if (billingUserResponse.status_code === 200 && uploadingEvent) {
    const billing = billingUserResponse.data;
    const secondsLeft =
      (Number(billing.credit) / Number(perMinutePricing)) * 60;
    if (
      Number.isFinite(secondsLeft) &&
      Number(secondsLeft) >= Number(uploadingEvent.duration_sec)
    ) {
      Object.assign(uploadingEvent, {
        loading: 0,
        uploading: 1,
        import_status: 1,
      });
      const updated = await updateImportStatusMessage(
        uploadingEvent.uploading,
        uploadingEvent.import_status,
        null,
        uploadingEvent.id,
        uploadingEvent.loading,
      );
      if (uploadingEvent.failed || stopping || updated?.rowCount !== 1) return;
      uploadEvent(uploadingEvent);
    } else {
      throw new Error("Kuota tidak cukup atau konfigurasi tarif tidak valid");
    }
  } else {
    throw new Error("Gagal memuat data billing");
  }
};
const updateImportStatusMessage = async (
  uploading,
  import_status,
  import_message,
  event_id,
  loading,
  total_segment = null,
) => {
  let query = "";
  let params = [];
  let index = 1;
  if (uploading !== undefined) {
    query += ", uploading = $" + index + " ";
    index++;
    params.push(uploading);
  }
  if (import_status !== undefined) {
    query += ", import_status = $" + index + " ";
    index++;
    params.push(import_status);
  }
  if (import_message) {
    query += ", import_message = $" + index + " ";
    index++;
    params.push(import_message);
  }
  if (loading !== undefined) {
    query += ", loading = $" + index + " ";
    index++;
    params.push(loading);
  }
  if (total_segment !== undefined) {
    query += ", total_segment = $" + index + " ";
    index++;
    params.push(total_segment);
  }
  if (event_id === undefined) {
    console.log("Error updating event, event id is required");
    return;
  }
  if (!query) {
    console.log("Error updating event, params are required");
    return;
  }
  // Ignore late progress after an operator has stopped or finished the event.
  const queryText = `UPDATE event SET id = id ${query} WHERE id = $${index} AND uploading IN (0, 1) AND import_message IS DISTINCT FROM $${index + 1}`;
  params.push(event_id, BILLING_CLAIM_MESSAGE);
  return dbpool().query(queryText, params);
};
const handleEventFailure = (event, error) => {
  if (event.finished || event.failurePromise || stopping)
    return event.failurePromise;
  event.failed = true;
  event.failurePromise = (async () => {
    logger.error({ err: error, eventId: event.id }, "Import failed");
    Object.assign(event, { import_status: 3, uploading: 3, loading: 0 });
    removeQueuedEvent(event);
    try {
      if (event.billingClaimed) {
        await dbpool().query(
          "UPDATE event SET uploading = 3, import_status = 3, loading = 0 WHERE id = $1 AND import_message = $2",
          [event.id, BILLING_CLAIM_MESSAGE],
        );
      } else {
        await updateImportStatusMessage(
          3,
          3,
          String(error.message).slice(0, 225),
          event.id,
          0,
        );
      }
    } catch (updateError) {
      logger.error(
        { err: updateError, eventId: event.id },
        "Failed to persist import failure",
      );
    }
    io?.emit("event_import_failed", event);
    try {
      await email.sendImportNotificationEmail("failed", event);
    } catch (emailError) {
      logger.error(
        { err: emailError, eventId: event.id },
        "Failed to notify import failure",
      );
    }
  })();
  return event.failurePromise;
};
const markEventAsFinished = async (event) => {
  if (event.failed || event.finished || stopping) return;
  // Claim billing in the DB before calling the remote service. Only one
  // worker can claim it, and a crash leaves a marker requiring reconciliation.
  const claim = await dbpool().query(
    "UPDATE event SET import_message = $1 WHERE id = $2 AND uploading = 1 AND import_message IS DISTINCT FROM $1",
    [BILLING_CLAIM_MESSAGE, event.id],
  );
  if (claim.rowCount !== 1) {
    // Another worker finished, stopped, or claimed this event. This instance
    // must not later emit a competing failure notification on socket close.
    event.finished = true;
    removeQueuedEvent(event);
    return;
  }
  event.billingClaimed = true;
  if (event.failed || stopping) return;
  console.log(`Marking event ${event.id} as finished`);
  const billed = await applyBillingInternal({
    api_key: event.third_party_key_1,
    amount:
      (event.duration_sec / 60) * config.services.pricing.staticPerMinutes,

    description:
      event.description +
      " - " +
      moment(event.timestart).utcOffset(420).format("DD/MM/YY HH:mm"),
  });
  if (!billed.success) throw new Error(`Billing failed: ${billed.message}`);
  const { rowCount } = await dbpool().query(
    "UPDATE event SET uploading = $1, loading = $2, total_segment = $3, status = $4, import_status = $5, import_message = $6 WHERE id = $7 AND uploading = 1 AND import_message = $8",
    [
      2,
      100,
      event.total_segment,
      2,
      2,
      "Finished",
      event.id,
      BILLING_CLAIM_MESSAGE,
    ],
  );
  if (rowCount !== 1)
    throw new Error("Import status changed before completion");
  Object.assign(event, {
    uploading: 2,
    loading: 100,
    import_status: 2,
    status: 2,
  });

  console.log(`Send socket notification for event ${event.id} as finished`);
  event.finished = true;
  io?.emit("event_import_finished", JSON.stringify(event));
  console.log(`Send email notification for event ${event.id} as finished`);
  try {
    await email.sendImportNotificationEmail("finished", event);
  } catch (error) {
    logger.error(
      { err: error, eventId: event.id },
      "Failed to notify completed import",
    );
  }
  console.log(`Closing ws for ${event.id}`);
  removeQueuedEvent(event);
  console.log(`Removing event ${event.id}`);
  console.log(`Process Finished`);
};
const tryFinishEvent = async (event) => {
  if (
    !event.completionReceived ||
    event.failed ||
    event.finished ||
    event.finishing
  )
    return;
  const expected = Number(event.total_segment);
  const persisted = await getEventTranscriptsCount(event);
  const observed = event.observedSegments?.size ?? 0;
  if (
    Number.isInteger(expected) &&
    expected > 0 &&
    persisted >= expected &&
    observed >= expected
  ) {
    clearTimeout(event.completionTimer);
    event.finishing = markEventAsFinished(event)
      .catch((error) => handleEventFailure(event, error))
      .finally(() => {
        event.finishing = null;
      });
    await event.finishing;
    return;
  }
  if (!event.completionTimer) {
    event.completionTimer = setTimeout(() => {
      void handleEventFailure(
        event,
        new Error(
          `STT completed but only ${persisted}/${Number.isInteger(expected) ? expected : "unknown"} transcript segments were saved`,
        ),
      );
    }, COMPLETION_GRACE_MS);
  }
};
const enqueueEventWork = (event, work) => {
  event.messageQueue = (event.messageQueue || Promise.resolve())
    .then(() => {
      if (!event.failed && !event.finished && !stopping) return work();
    })
    .catch((error) => handleEventFailure(event, error));
  return event.messageQueue;
};
const uploadEvent = (event) => {
  if (event && event.id > 0 && !event.ws && !event.importWSConnected) {
    event.ws = new WebSocketClient();
    event.ws.on("connectFailed", (error) => {
      console.log(
        `Connect to WS failed for event ID ${event.id}: ${error.toString()}`,
      );
      void handleEventFailure(
        event,
        new Error(`WebSocket connection failed: ${error.message}`),
      );
    });
    event.ws.on("connect", (connection) => {
      if (event.failed || event.finished || stopping) {
        connection.close();
        return;
      }
      event.connection = connection;
      activeConnections.add(connection);
      connection.once("close", () => activeConnections.delete(connection));
      console.log(`Connected to WS for event ID: ${event.id}`);
      event.importWSConnected = true;
      connection.on("error", (error) => {
        event.importWSConnected = false;
        console.log(
          `Connection error for event ID ${event.id}: ${error.toString()}`,
        );
        void handleEventFailure(
          event,
          new Error(`WebSocket connection error: ${error.message}`),
        );
      });
      connection.on("close", () => {
        if (stopping) return;
        event.importWSConnected = false;
        console.log(`Connection closed for event ID: ${event.id}`);
        // `close` can fire while the last message is still being inserted.
        // Drain both the WebSocket queue and the initial STT snapshot first.
        void (async () => {
          await event.importPromise;
          await event.messageQueue;
          if (!event.finished && !event.failed)
            await handleEventFailure(
              event,
              new Error("STT WebSocket closed before transcription was saved"),
            );
        })().catch((error) => handleEventFailure(event, error));
      });
      connection.on("message", (message) => {
        enqueueEventWork(event, () => handleWebSocketMessage(event, message));
      });
      event.importPromise = uploadEventProcessor(event, true);
    });
    event.ws.connect(`${config.services.stt.ws}/${event.id}`);
  }
};
const handleWebSocketMessage = async (event, message) => {
  if (message && message.utf8Data) {
    const messageObj = JSON.parse(message.utf8Data);
    // console.log(`Message received for event ID ${event.id}:`, messageObj);
    console.log(`Message received for event ID ${event.id}:`);
    if (
      messageObj.response === 200 &&
      messageObj.data &&
      messageObj.data.meetha_id &&
      event.id == messageObj.data.meetha_id
    ) {
      if (
        messageObj.message === "transcribe" &&
        messageObj.data?.results?.transcript
      ) {
        const speakerName = speakerNameByTagFormat(
          messageObj.data.results.speaker_tag,
        );
        const attendance_id = await getEventAttendanceBySpeakerTag(
          speakerName,
          event.id,
          event.datausername,
          event.data_user_uuid,
        );
        messageObj.data.results.attendance_id = attendance_id;
        messageObj.data.results.attendance_name = speakerName;
        const saved = await saveTranscript(messageObj, event);
        trackObservedSegment(event, messageObj.data.results);
        if (saved) sendIntermediateTranscript(messageObj);
      }
      if (messageObj.data?.total_percent !== undefined) {
        if (messageObj.data?.total_chunks !== undefined) {
          event.total_segment = messageObj.data?.total_chunks;
        }
        await updateEventProgress(event, messageObj);
        if (Number(messageObj.data.total_percent) >= 95) {
          console.log(`Event ID ${event.id} is almost finished.`);
        }
        if (Number(messageObj.data.total_percent) === 100) {
          console.log(`Event ID ${event.id} is FINISHED.`);
          event.completionReceived = true;
        }
      }
      await tryFinishEvent(event);
    } else {
      throw new Error(messageObj.message || "Invalid STT response");
    }
  }
};
const updateEventProgress = async (event, progressData) => {
  // A 100% STT progress event does not guarantee durable transcript rows.
  event.loading = Math.max(
    event.loading || 0,
    Math.min(99, Math.max(0, Number(progressData.data.total_percent) || 0)),
  );
  await updateImportStatusMessage(
    event.uploading,
    event.import_status,
    null,
    event.id,
    event.loading,
    event.total_segment,
  );
  io?.emit(
    "event_import_progress",
    JSON.stringify({
      ...progressData,
      data: { ...progressData.data, total_percent: event.loading },
    }),
  );
};
const sendIntermediateTranscript = (progressData) => {
  io?.emit("intermediate_transcript_data", JSON.stringify(progressData));
};
const uploadEventProcessor = async (event, resync = false) => {
  const apiUrl = `${config.services.stt.api}${config.services.stt.import_endpoint}`;
  const data = {
    meetha_id: event.id,
    media_file: event.import_file_path,
    lang: event.language,
    tier: 1,
    is_full_result: resync,
  };

  try {
    const { data: importResponse } = await axios.post(apiUrl, data, {
      timeout: 30_000,
    });
    if (importResponse.response === 200) {
      console.log(`Acknowledge event ID: ${event.id}`);

      if (importResponse.data && importResponse.data.task_info) {
        const results = importResponse.data.task_info.results;
        const total_percent = importResponse.data.task_info.total_percent;
        const media_chunks_count =
          importResponse.data.task_info.media_chunks_count;
        const currentPercent = Number.parseFloat(total_percent) || 0;
        await enqueueEventWork(event, async () => {
          if (currentPercent === 0)
            void Promise.resolve()
              .then(() =>
                email.sendImportNotificationEmail("on_progress", event),
              )
              .catch((error) =>
                logger.error({ err: error }, "Import progress email failed"),
              );
          if (media_chunks_count !== undefined)
            event.total_segment = media_chunks_count;
          if (Array.isArray(results))
            await synchronizeTranscripts(results, event);
          await updateEventProgress(event, {
            data: { total_percent: currentPercent },
          });
          if (currentPercent === 100) event.completionReceived = true;
          await tryFinishEvent(event);
        });
      }
    } else {
      throw new Error("STT service status error");
    }
  } catch (error) {
    await handleEventFailure(event, error);
  }
};
const refreshEventProcessor = async (event_id) => {
  const apiUrl = `${config.services.stt.api}${config.services.stt.refresh_endpoint}`;
  try {
    const { data: importResponse } = await axios.get(
      apiUrl + "?meetha_id=" + event_id,
    );
    if (importResponse.response === 200) {
      return { success: true, message: "Success Refresh" };
    } else {
      return { success: false, message: "Refresh Failed" };
    }
  } catch (error) {
    return { success: false, message: "Refresh Failed", error: error };
  }
};
const resetEventProcessor = async (event_id) => {
  const apiUrl = `${config.services.stt.api}${config.services.stt.reset_endpoint}`;
  try {
    const { data: importResponse } = await axios.get(
      apiUrl + "?meetha_id=" + event_id,
    );
    console.log(importResponse);
    if (importResponse.response === 200) {
      const updated = await dbpool().query(
        "update event set uploading = $1, loading = $2, import_status = $3, import_message = NULL where id = $4 AND uploading <> 2 AND import_message IS DISTINCT FROM $5",
        [1, 0, 1, event_id, BILLING_CLAIM_MESSAGE],
      );
      if (!updated.rowCount)
        return {
          success: false,
          message: "Import already finished or not found",
        };
      cancelEventUploadWithEventId(event_id);
      return { success: true, message: "Success Reset" };
    } else {
      return { success: false, message: "Refresh Reset" };
    }
  } catch (error) {
    return { success: false, message: "Refresh Reset", error: error };
  }
};
const synchronizeTranscripts = async (transcripts, event) => {
  console.log("STARTING SYNC TRANSCRIPTS for EVENT " + event.id);
  for (const transcript of transcripts) {
    if (transcript?.transcript) {
      const messageObj = {
        data: { meetha_id: event.id, results: { ...transcript } },
      };
      const speakerName = speakerNameByTagFormat(transcript.speaker_tag);
      const attendance_id = await getEventAttendanceBySpeakerTag(
        speakerName,
        event.id,
        event.datausername,
        event.data_user_uuid,
      );
      messageObj.data.results.attendance_id = attendance_id;
      messageObj.data.results.attendance_name = speakerName;
      const saved = await saveTranscript(messageObj, event);
      trackObservedSegment(event, messageObj.data.results);
      if (saved) sendIntermediateTranscript(messageObj);
    }
  }
  console.log(`Synchronized transcripts for event ID ${event.id}`);
};
const fetchEventAttendance = async (attendanceName, eventId) => {
  try {
    const { rows } = await dbpool().query(
      "SELECT id FROM event_attendance WHERE name = $1 AND event_id = $2",
      [attendanceName, eventId],
    );
    return rows?.[0]?.id ?? null;
  } catch (error) {
    return null;
  }
};
const getEventAttendanceBySpeakerTag = async (
  speakerName,
  eventId,
  datausername,
  data_user_uuid,
) => {
  let now = moment(new Date()).format("yyyy-MM-DD HH:mm:ss");
  let event_id = eventId;

  let attendance_id = await fetchEventAttendance(speakerName, eventId);

  if (attendance_id != null && attendance_id != undefined) {
    return attendance_id;
  }

  try {
    const { rows } = await dbpool().query(
      "INSERT INTO event_attendance (event_id,event_role_id,name,description,status,createdby,createdon,updatedby,updatedon, datausername, data_user_uuid) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id",
      [
        event_id,
        9,
        speakerName,
        "Peserta",
        1,
        datausername,
        now,
        datausername,
        now,
        datausername,
        data_user_uuid,
      ],
    );

    if (rows && rows[0].id) {
      return rows[0].id;
    }
  } catch (error) {
    console.log(error);
    return null;
  }
};
const speakerNameByTagFormat = (speaker_tag) => {
  return `Speaker ${speaker_tag}`;
};
const trackObservedSegment = (event, result) => {
  if (!event.observedSegments) event.observedSegments = new Set();
  const identity =
    result.message_id == null
      ? `${result.start_sec}:${result.end_sec}:${result.transcript}`
      : String(result.message_id);
  event.observedSegments.add(identity);
};
const saveTranscript = async (obj, event) => {
  const results = obj.data.results;
  if (typeof results.transcript !== "string" || !results.transcript.trim())
    throw new Error("STT returned an empty transcript segment");
  const transcript = results.transcript.replace(/(\r\n|\n|\r)/gm, "");
  const now = moment().format("YYYY-MM-DD HH:mm:ss");
  // The existing DB schema has no `seq` column. Message IDs are used to
  // suppress resync duplicates without introducing a production migration.
  const { rowCount } = await dbpool().query(
    "SELECT 1 FROM event_transcript WHERE event_id = $1 AND (message_id = $2 OR (start IS NOT DISTINCT FROM $3 AND stop IS NOT DISTINCT FROM $4 AND transcript = $5)) LIMIT 1",
    [
      event.id,
      results.message_id ?? null,
      results.start_sec ?? null,
      results.end_sec ?? null,
      transcript,
    ],
  );
  if (rowCount > 0) return false;
  const reqdata = {
    event_id: obj.data.meetha_id,
    attendance: results.attendance_name,
    attendance_id: results.attendance_id,
    title: "Transcript",
    transcript,
    start: results.start_sec,
    stop: results.end_sec,
    duration: results.audio_len,
    status: 1,
    createdon: now,
    message_id: results.message_id,
    datausername: event.datausername,
    data_user_uuid: event.data_user_uuid,
  };
  await dbpool().query(
    "INSERT INTO event_transcript (event_id, attendance, attendance_id, title, transcript, start, stop, duration, status, createdon, message_id, datausername, data_user_uuid) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)",
    Object.values(reqdata),
  );
  return true;
};
const getEventTranscriptsCount = async (event) => {
  const { rows } = await dbpool().query(
    "SELECT COUNT(*) AS count FROM event_transcript WHERE event_id = $1",
    [event.id],
  );
  return Number(rows[0].count);
};
const applyBillingInternal = async function (data) {
  const apiUrl =
    config.services.billing.base_url +
    config.services.billing.create_billing_log_endpoint;
  const successApiUrl =
    config.services.billing.base_url +
    config.services.billing.success_billing_log_endpoint;
  const { api_key, amount, description } = data;
  const { data: billingLogResponse } = await axios.post(
    apiUrl,
    {
      app_id: config.services.billing.meetha_app_id,
      api_key: api_key,
      amount: amount,
      description: description,
      app_name: "meetha",
      billing_type: "pre",
    },
    { timeout: 15_000 },
  );
  if (billingLogResponse && billingLogResponse.status_code === 201) {
    await axios.put(
      successApiUrl + "?id=" + billingLogResponse.data.id,
      undefined,
      { timeout: 15_000 },
    );
    console.log("Success charge Billing");
    return { success: true, message: "Success", data: billingLogResponse.data };
  } else if (billingLogResponse && billingLogResponse.messages) {
    console.log("Failed charge Billing: " + billingLogResponse.messages);
    return {
      success: false,
      message: "Failed: " + billingLogResponse.messages,
    };
  } else {
    console.log("Failed charge Billing");
    return { success: false, message: "Failed" };
  }
};
const cancelEventUploadWithEventId = (eventId) => {
  for (const event of uploadingEvents.filter(
    (item) => String(item.id) === String(eventId),
  )) {
    event.failed = true;
    removeQueuedEvent(event);
  }
};
const notifyEventAsPending = (eventId, event) => {
  io?.emit("event_import_pending", event);
  return dbpool?.()?.query(
    "UPDATE event SET uploading = $1, import_status = $2 WHERE id = $3",
    [0, 0, eventId],
  );
};
module.exports = {
  startService,
  setupService,
  notifyEventAsPending,
  cancelEventUploadWithEventId,
  refreshEventProcessor,
  resetEventProcessor,
};

module.exports.stopService = async () => {
  stopping = true;
  clearInterval(getUploadInterval);
  clearInterval(processUploadInterval);
  for (const connection of activeConnections) connection.close();
  for (const event of [...uploadingEvents]) removeQueuedEvent(event);
  activeConnections.clear();
  uploadingEvents = [];
  if (io) await new Promise((resolve) => io.close(resolve));
  io = null;
  dbpool = null;
  await Promise.all(
    [redisClient, pubClient, subClient]
      .filter((c) => c?.isOpen)
      .map((c) => c.quit()),
  );
};
