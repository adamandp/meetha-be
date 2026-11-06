const moment = require("moment");
const {
  getEventAccess,
  rejectEventAccess,
  isAdmin,
} = require("../../common/runtime/event-access");
const {
  BILLING_CLAIM_MESSAGE,
} = require("../../common/runtime/import-constants");

const rejectBillingReconciliation = (res, access) => {
  if (access.importMessage !== BILLING_CLAIM_MESSAGE) return false;
  res.status(409).send({
    success: false,
    message: "Billing reconciliation required before retrying this import",
  });
  return true;
};

const importFileEvent = async function (req, res) {
  let eventId = req.body.id ? req.body.id : null;
  let import_file_path =
    req.body.import_file_path || req.body.import_file_path == 0
      ? req.body.import_file_path
      : null;
  let json_file_path =
    req.body.json_file_path || req.body.json_file_path == 0
      ? req.body.json_file_path
      : null;
  let audio_folder_path =
    req.body.audio_folder_path || req.body.audio_folder_path == 0
      ? req.body.audio_folder_path
      : null;
  let sync_status =
    req.body.sync_status || req.body.sync_status == 0
      ? req.body.sync_status
      : null;
  let zip_file_path =
    req.body.zip_file_path || req.body.zip_file_path == 0
      ? req.body.zip_file_path
      : null;
  if (eventId != null) {
    if (
      import_file_path != null ||
      json_file_path != null ||
      audio_folder_path != null ||
      sync_status != null ||
      zip_file_path != null
    ) {
      let q = "update event set ";
      let param = [];
      let qIdx = 1;
      if (import_file_path != null) {
        q += " import_file_path = $" + qIdx + " ,";
        param.push(import_file_path);
        qIdx++;
      }
      if (json_file_path != null) {
        q += " json_file_path = $" + qIdx + " ,";
        param.push(json_file_path);
        qIdx++;
      }
      if (audio_folder_path != null) {
        q += " audio_folder_path = $" + qIdx + " ,";
        param.push(audio_folder_path);
        qIdx++;
      }
      if (sync_status != null) {
        q += " sync_status = $" + qIdx + " ,";
        param.push(sync_status);
        qIdx++;
      }
      if (zip_file_path != null) {
        q += " zip_file_path = $" + qIdx + " ,";
        param.push(zip_file_path);
        qIdx++;
      }
      q = q + " updatedon = $" + qIdx + " ";
      qIdx++;
      q = q + " where id = $" + qIdx + " ";
      qIdx++;
      var now = moment(new Date()).format("yyyy-MM-DD HH:mm:ss");
      param.push(now, eventId);
      req.pool().query(q, param, function (errUpdate) {
        if (errUpdate) res.send({ success: false, message: "Failed" });
        res.send({ success: true, message: "Success" });
      });
    }
  } else {
    return res.send({
      success: false,
      message: "ID and status are Required",
      data: req.body,
    });
  }
};
const eventsFileImportv2 = async (req, res) => {
  if (!req.file)
    return res
      .status(400)
      .send({ success: false, message: "Recording file is required" });
  if (typeof req.body.description !== "string" || !req.body.description.trim())
    return res
      .status(400)
      .send({ success: false, message: "Description is required" });

  if (!isAdmin(req.user)) {
    const userId = Number(req.user?.userId);
    if (!Number.isSafeInteger(userId) || userId <= 0)
      return res
        .status(403)
        .send({ success: false, message: "User identity is missing" });
    const { rows } = await req
      .pool()
      .query('SELECT username, user_uuid FROM "user" WHERE id = $1 LIMIT 1', [
        userId,
      ]);
    const owner = rows?.[0];
    if (
      !owner ||
      (req.body.username && req.body.username !== owner.username) ||
      (req.body.user_uuid && req.body.user_uuid !== owner.user_uuid)
    )
      return res.status(403).send({
        success: false,
        message: "Recording owner does not match authenticated user",
      });
    req.body.username = owner.username;
    req.body.user_uuid = owner.user_uuid;
  }
  let reqdata = {};
  let username = req.body.username ? req.body.username : "default";
  let user_uuid = req.body.user_uuid ? req.body.user_uuid : "default";
  let timestart = req.body.timestart ? req.body.timestart : null;
  let status = "1";
  let description =
    req.body.description || req.body.description == 0
      ? req.body.description
      : req.body.id;
  let pembicara = req.body.guests || req.body.guests == 0 ? req.body.guests : 1;
  let partisipan =
    req.body.participant || req.body.participant == 0
      ? req.body.participant
      : 1;
  let subject =
    req.body.subject || req.body.subject == 0 ? req.body.subject : req.body.id;
  let duration = req.body.duration;
  let file = req.file;
  let language = req.body.language;
  let third_party_key_1 = req.body.third_party_key_1;
  let now = moment(new Date()).format("yyyy-MM-DD HH:mm:ss");
  if (req.body.description && req.body.description != "") {
    req
      .pool()
      .query(
        "INSERT INTO event (timestart, subject, description, import_file_path, status, duration_sec, third_party_key_1, createdby, createdon, updatedby, updatedon, pembicara, partisipan, language, sync_status, uploading, status_process_chunk, loading, datausername, data_user_uuid) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19, $20) RETURNING id",
        [
          timestart,
          subject,
          description,
          file.filename,
          status,
          duration,
          third_party_key_1,
          username,
          now,
          username,
          now,
          pembicara,
          partisipan,
          language,
          0,
          0,
          0,
          0,
          username,
          user_uuid,
        ],
        function (err, qres) {
          if (err) {
            // console.log(err.message)
            res.send({ success: false, message: err.message });
          } else {
            reqdata = {
              event_id: qres.rows[0].id, // Last event id inputed
              username: username,
              user_uuid: user_uuid,
              timestart: timestart,
              status: status,
              description: description,
              pembicara: pembicara,
              partisipan: partisipan,
              subject: subject,
              import_file_path: file.filename,
              language: language,
              now: now,
            };
            req.core.notifyEventAsPending(qres.rows[0].id, {
              id: qres.rows[0].id,
            });
            res.send({
              success: true,
              message:
                "Server Notification! Success adding import event to database.",
              data: reqdata,
            });
          }
        },
      );
  } else {
    res
      .status(400)
      .send({ success: false, message: "Description is required" });
  }
};
const restartImport = async (req, res) => {
  const access = await getEventAccess(req, req.body?.id);
  if (!access.ok) return rejectEventAccess(res, access);
  if (rejectBillingReconciliation(res, access)) return;
  if (access.uploading === 2)
    return res
      .status(409)
      .send({ success: false, message: "Import already finished" });
  try {
    const result = await req
      .pool()
      .query(
        "update event set uploading = $1, loading = $2, import_status = $3, import_message = NULL where id = $4 AND uploading <> 2 AND import_message IS DISTINCT FROM $5",
        [0, 0, 0, access.id, BILLING_CLAIM_MESSAGE],
      );
    if (!result.rowCount)
      return res.send({
        success: false,
        message: "Import not found or already finished",
      });
    req.core.cancelEventUploadWithEventId(access.id);
    return res.send({ success: true, message: "Success Update Event" });
  } catch (error) {
    return res.send({ success: false, message: "Failed to restart import" });
  }
};
const resetImport = async (req, res) => {
  const access = await getEventAccess(req, req.body?.id);
  if (!access.ok) return rejectEventAccess(res, access);
  if (rejectBillingReconciliation(res, access)) return;
  if (access.uploading === 2)
    return res
      .status(409)
      .send({ success: false, message: "Import already finished" });
  const response = await req.core.resetEventProcessor(access.id);

  if (response) {
    res.send(response);
  } else {
    res.send({ success: false, message: "Failed to Reset" });
  }
};
const refreshImport = async (req, res) => {
  const access = await getEventAccess(req, req.body?.id);
  if (!access.ok) return rejectEventAccess(res, access);
  if (rejectBillingReconciliation(res, access)) return;
  const response = await req.core.refreshEventProcessor(access.id);
  if (response) {
    res.send(response);
  } else {
    res.send({ success: false, message: "Failed to Refresh" });
  }
};
const stopImport = async (req, res) => {
  const access = await getEventAccess(req, req.body?.id);
  if (!access.ok) return rejectEventAccess(res, access);
  if (rejectBillingReconciliation(res, access)) return;
  if (access.uploading === 2)
    return res
      .status(409)
      .send({ success: false, message: "Import already finished" });
  try {
    const result = await req
      .pool()
      .query(
        "UPDATE event SET uploading = $1, loading = $2 WHERE id = $3 AND uploading <> 2 AND import_message IS DISTINCT FROM $4",
        [3, 0, access.id, BILLING_CLAIM_MESSAGE],
      );
    if (!result.rowCount)
      return res.send({ success: false, message: "Import not found" });
    req.core.cancelEventUploadWithEventId(access.id);
    return res.send({ success: true, message: "Success Update Event" });
  } catch (error) {
    return res.send({ success: false, message: "Failed to stop import" });
  }
};

module.exports = {
  importFileEvent,
  eventsFileImportv2,
  restartImport,
  resetImport,
  refreshImport,
  stopImport,
};
