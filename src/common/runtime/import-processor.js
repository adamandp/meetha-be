const console = require("../app-logger/console.js");
const config = require("../config/config.js");
const moment = require("moment");
const { client: WebSocketClient } = require("websocket");
const axios = require("axios");
const email = require("../email/email.js");
const { createAdapter } = require("@socket.io/redis-adapter");
const { createClient } = require("redis");
let uploadingEvents = [];
let dbpool = null; // Will change to PostgreSQL Pool instance
let io = null;
const activeConnections = new Set();
let stopping = false;
let getUploadInterval = null;
let processUploadInterval = null;

let redisClient, pubClient, subClient;
const connectToRedis = async (client) => {
  client.on("error", (err) => logger.error({ err }, "Redis error"));
  await client.connect();
};
const logger = require("../app-logger/logger.js");
const startService = async (http, pool) => {
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
const fetchUploadableEvents = () => {
  if (dbpool) {
    dbpool().query(
      "SELECT * FROM event WHERE (import_file_path IS NOT NULL OR online_meeting_link IS NOT NULL) AND (uploading = 0 OR uploading = 1) AND loading < 100 ORDER BY timestart ASC",
      (err, qres) => {
        if (!err && qres && qres.rows) {
          qres.rows.forEach((row) => {
            if (!checkEventIsExistOnArray(row, uploadingEvents)) {
              uploadingEvents.push(row);
            }
          });
        }
      },
    );
  }
};
const processUploadingEvents = async () => {
  try {
    for (let event of uploadingEvents) {
      if (
        event &&
        event.id > 0 &&
        (event.uploading === 0 || event.uploading === 1) &&
        !event.ws &&
        !event.importWSConnected
      ) {
        console.log(`Processing event ID: ${event.id}`);
        try {
          await processImportEvent(event);
        } catch (error) {
          console.log(
            `Error processing event ID: ${event.id}, Error: ${error.message}`,
          );
          handleEventFailure(event, error);
        }
      }
    }
  } catch (error) {
    console.log(`Error in upload processing interval: ${error.message}`);
  }
};
const processImportEvent = async (uploadingEvent) => {
  const { base_url, credit_endpoint } = config.services.billing;
  const perMinutePricing = config.services.pricing.staticPerMinutes;
  const user_uuid = uploadingEvent.data_user_uuid;
  const apiUrl = `${base_url}${credit_endpoint}`;
  try {
    const { data: billingUserResponse } = await axios.get(
      `${apiUrl}${user_uuid}`,
    );
    if (billingUserResponse.status_code === 200 && uploadingEvent) {
      const billing = billingUserResponse.data;
      billing.per_minute_rate = perMinutePricing;
      const secondsLeft =
        (Number(billing.credit) / Number(perMinutePricing)) * 60;
      if (Number(secondsLeft) >= Number(uploadingEvent.duration_sec)) {
        Object.assign(uploadingEvent, {
          loading: 0,
          uploading: 1,
          import_status: 1,
        });
        updateImportStatusMessage(
          uploadingEvent.uploading,
          uploadingEvent.import_status,
          null,
          uploadingEvent.id,
          uploadingEvent.loading,
        );
        uploadEvent(uploadingEvent);
      } else {
        handleEventFailure(uploadingEvent, new Error("Kuota tidak cukup"));
      }
    } else {
      handleEventFailure(uploadingEvent, new Error("Gagal memuat data"));
    }
  } catch (error) {
    console.log(
      `Error checking credits for event ID ${uploadingEvent.id}: ${error.message}`,
    );
    handleEventFailure(uploadingEvent, new Error("Unknown billing error"));
  }
};
const updateImportStatusMessage = (
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
  let queryText = `UPDATE event SET id = id ${query} WHERE id = $${index}`;
  params.push(event_id);
  dbpool().query(queryText, params, (errUpdate) => {
    if (errUpdate) {
      console.log(`Error updating event ID ${event_id}: ${errUpdate.message}`);
    }
  });
};
const handleEventFailure = (event, error) => {
  console.log(`Failed event ID ${event.id}: ${error.message}`);
  email.sendImportNotificationEmail("failed", event);
  Object.assign(event, { import_status: 3, uploading: 3, loading: 0 });
  io.emit("event_import_failed", event);
  updateImportStatusMessage(
    event.uploading,
    event.import_status,
    "Error happened: " + error.message,
    event.id,
    event.loading,
  );
  if (event.ws) {
    event.ws.abort();
  }
};
const markEventAsFinished = async (event) => {
  try {
    console.log(`Marking event ${event.id} as finished`);

    console.log(`Applying billing for event ${event.id} as finished`);
    await applyBillingInternal({
      api_key: event.third_party_key_1,
      amount:
        (event.duration_sec / 60) * config.services.pricing.staticPerMinutes,

      description:
        event.description +
        " - " +
        moment(event.timestart).utcOffset(420).format("DD/MM/YY HH:mm"),
    });
    console.log(`Saving event ${event.id} as finished`);
    await dbpool().query(
      "UPDATE event SET uploading = $1, loading = $2, total_segment = $3, status = $4 WHERE id = $5",
      [2, 100, event.total_segment, event.id, 2],
    );
    Object.assign(event, {
      uploading: 2,
      loading: 100,
      import_status: 2,
      status: 2,
    });

    console.log(`Send socket notification for event ${event.id} as finished`);
    io.emit("event_import_finished", JSON.stringify(event));
    console.log(`Send email notification for event ${event.id} as finished`);
    email.sendImportNotificationEmail("finished", event);
    updateImportStatusMessage(2, 2, "Finished", event.id, 100);
    console.log(`Closing ws for ${event.id}`);
    if (event.ws) {
      event.ws.abort();
    }
    console.log(`Removing event ${event.id}`);
    event = null;
    console.log(`Process Finished`);
  } catch (errUpdate) {
    console.log(
      `Error marking event ID ${event.id} as finished: ${errUpdate.message}`,
    );
  }
};
const uploadEvent = async (event) => {
  if (event && event.id > 0 && !event.ws && !event.importWSConnected) {
    event.ws = new WebSocketClient();
    event.ws.on("connectFailed", (error) => {
      console.log(
        `Connect to WS failed for event ID ${event.id}: ${error.toString()}`,
      );
      handleEventFailure(event, new Error("WebSocket connection failed"));
    });
    event.ws.on("connect", (connection) => {
      activeConnections.add(connection);
      connection.once("close", () => activeConnections.delete(connection));
      console.log(`Connected to WS for event ID: ${event.id}`);
      event.importWSConnected = true;
      connection.on("error", (error) => {
        event.importWSConnected = false;
        console.log(
          `Connection error for event ID ${event.id}: ${error.toString()}`,
        );
        handleEventFailure(event, new Error("WebSocket connection error"));
      });
      connection.on("close", () => {
        if (stopping) return;
        event.importWSConnected = false;
        console.log(`Connection closed for event ID: ${event.id}`);
      });
      connection.on("message", (message) => {
        handleWebSocketMessage(event, message);
      });
      uploadEventProcessor(event, true);
    });
    event.ws.connect(`${config.services.stt.ws}/${event.id}`);
  }
};
const handleWebSocketMessage = async (event, message) => {
  if (message && message.utf8Data) {
    try {
      const messageObj = JSON.parse(message.utf8Data);
      // console.log(`Message received for event ID ${event.id}:`, messageObj);
      console.log(`Message received for event ID ${event.id}:`);
      if (
        messageObj.response === 200 &&
        messageObj.data &&
        messageObj.data.meetha_id &&
        event.id == messageObj.data.meetha_id
      ) {
        if (messageObj.data?.total_percent !== undefined) {
          if (messageObj.data?.total_chunks !== undefined) {
            event.total_segment = messageObj.data?.total_chunks;
          }
          updateEventProgress(event, messageObj);
          if (messageObj.data.total_percent >= 95) {
            console.log(`Event ID ${event.id} is almost finished.`);
          }
          if (messageObj.data.total_percent === 100) {
            console.log(`Event ID ${event.id} is FINISHED.`);
            await markEventAsFinished(event);
          }
        }
        if (messageObj.message === "transcribe" && messageObj.data?.results) {
          const speakerName = speakerNameByTagFormat(
            messageObj.data?.results.speaker_tag,
          );
          const attendance_id = await getEventAttendanceBySpeakerTag(
            speakerName,
            event.id,
            event.datausername,
            event.data_user_uuid,
          );
          messageObj.data.results.attendance_id = attendance_id;
          messageObj.data.results.attendance_name = speakerName;
          sendIntermediateTranscript(messageObj);
          await saveTranscript(messageObj, event);
        }
      } else {
        handleEventFailure(event, new Error(messageObj.message));
      }
    } catch (error) {
      console.log(
        `Error parsing WebSocket message for event ID ${event.id}: ${error.message}`,
      );
    }
  }
};
const updateEventProgress = (event, progressData) => {
  event.loading = progressData.data.total_percent;
  io.emit("event_import_progress", JSON.stringify(progressData));
  updateImportStatusMessage(
    event.uploading,
    event.import_status,
    null,
    event.id,
    event.loading,
    event.total_segment,
  );
};
const sendIntermediateTranscript = (progressData) => {
  io.emit("intermediate_transcript_data", JSON.stringify(progressData));
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
    const { data: importResponse } = await axios.post(apiUrl, data);
    if (importResponse.response === 200) {
      console.log(`Acknowledge event ID: ${event.id}`);

      if (importResponse.data && importResponse.data.task_info) {
        let results = importResponse.data.task_info.results;
        let total_percent = importResponse.data.task_info.total_percent;
        let media_chunks_count =
          importResponse.data.task_info.media_chunks_count;
        let currentPercent = 0;
        if (total_percent) {
          currentPercent = parseFloat(total_percent);
        }
        if (currentPercent == 0) {
          email.sendImportNotificationEmail("on_progress", event);
        }
        event.total_segment = media_chunks_count;
        updateEventProgress(event, { data: { total_percent: currentPercent } });
        let currentTranscriptCount = getEventTranscriptsCount(event);
        if (currentTranscriptCount != media_chunks_count || resync) {
          await synchronizeTranscripts(results, event);
        }
        if (currentPercent === 100) {
          console.log(`Event ID ${event.id} is FINISHED ALREADY.`);
          markEventAsFinished(event);
        }
      }
    } else {
      handleEventFailure(event, new Error("Service status error"));
    }
  } catch (error) {
    handleEventFailure(event, error);
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
      await dbpool().query(
        "update event set uploading = $1, loading = $2 where id = $3 ",
        [1, 0, event_id],
      );
      return { success: true, message: "Success Reset" };
    } else {
      return { success: false, message: "Refresh Reset" };
    }
  } catch (error) {
    return { success: false, message: "Refresh Reset", error: error };
  }
};
const synchronizeTranscripts = async (transcripts, event) => {
  try {
    console.log("STARTING SYNC TRANSCRIPTS for EVENT " + event.id);
    for (const transcript of transcripts) {
      // console.log("SYNC TRANSCRIPT: ", transcript);
      if (transcript.transcript) {
        const { rowCount } = await dbpool().query(
          "SELECT 1 FROM event_transcript WHERE event_id = $1 AND message_id = $2",
          [event.id, transcript.message_id],
        );
        if (rowCount === 0) {
          let messageObj = {
            data: {
              meetha_id: event.id,
              results: transcript,
            },
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
          sendIntermediateTranscript(messageObj);
          await saveTranscript(messageObj, event);
        }
      }
    }
    console.log(`Synchronized transcripts for event ID ${event.id}`);
  } catch (err) {
    console.log(
      `Error synchronizing transcripts for event ID ${event.id}: ${err.message}`,
    );
  }
};
const fetchEventAttendance = async (attendanceName, eventId) => {
  try {
    const { rows } = await dbpool().query(
      `SELECT id FROM event_attendance WHERE name = '${attendanceName}' and event_id = ${eventId}`,
    );

    return rows && rows[0].id ? rows[0].id : null;
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
const saveTranscript = async (obj, event) => {
  const results = obj.data.results;
  const transcript = results.transcript.replace(/(\r\n|\n|\r)/gm, "");
  const now = moment().format("YYYY-MM-DD HH:mm:ss");
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
    seq: results.seq,
  };
  try {
    await dbpool().query(
      `INSERT INTO event_transcript (event_id, attendance, attendance_id, title, transcript, start, stop, duration, status, createdon, message_id, datausername, data_user_uuid, seq) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      Object.values(reqdata),
    );
    return { success: true, message: "Success saving transcript" };
  } catch (err) {
    // console.log(err);
    console.log("Error inserting event_transcript", err.message);
    return { success: false, message: err.message };
  }
};
const getEventTranscriptsCount = async (event) => {
  try {
    const { rowCount } = await dbpool().query(
      "SELECT 1 FROM event_transcript WHERE event_id = $1",
      [event.id],
    );
    return rowCount;
  } catch (error) {
    console.log(error);
    return 0;
  }
};
const applyBillingInternal = async function (data) {
  const apiUrl =
    config.services.billing.base_url +
    config.services.billing.create_billing_log_endpoint;
  const successApiUrl =
    config.services.billing.base_url +
    config.services.billing.success_billing_log_endpoint;
  const { api_key, amount, description } = data;
  console.log("APPLY BILLING LOG", apiUrl);
  console.log(data);
  const { data: billingLogResponse } = await axios.post(apiUrl, {
    app_id: config.services.billing.meetha_app_id,
    api_key: api_key,
    amount: amount,
    description: description,
    app_name: "meetha",
    billing_type: "pre",
  });
  if (billingLogResponse && billingLogResponse.status_code === 201) {
    await axios.put(successApiUrl + "?id=" + billingLogResponse.data.id);
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
const cancelEventUploadWithEventId = (eventId) => {};
const notifyEventAsPending = (eventId, event) => {
  io.emit("event_import_pending", event);
  dbpool().query(
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
  for (const event of uploadingEvents) event.ws?.abort();
  activeConnections.clear();
  uploadingEvents = [];
  if (io) await new Promise((resolve) => io.close(resolve));
  await Promise.all(
    [redisClient, pubClient, subClient]
      .filter((c) => c?.isOpen)
      .map((c) => c.quit()),
  );
};
