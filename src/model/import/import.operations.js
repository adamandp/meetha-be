const moment = require("moment");

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
    res.send({ success: true, message: "", data: reqdata });
  }
};
const restartImport = async (req, res) => {
  req
    .pool()
    .query(
      "update event set uploading = $1, loading = $2, import_status = $3, import_message = NULL where id = $4 AND uploading <> 2",
      [0, 0, 0, req.body.id],
      function (err, result) {
        if (!err) {
          if (!result?.rowCount)
            return res.send({
              success: false,
              message: "Import not found or already finished",
            });
          req.core.cancelEventUploadWithEventId(req.body.id);
          res.send({ success: true, message: "Success Update Event" });
        } else {
          res.send({ success: false, message: err.message });
        }
      },
    );
};
const resetImport = async (req, res) => {
  if (!req.query && !req.body.id) {
    res.send({ success: false, message: "Event ID is Required" });
  }
  let response = await req.core.resetEventProcessor(req.body.id);

  if (response) {
    res.send(response);
  } else {
    res.send({ success: false, message: "Failed to Reset" });
  }
};
const refreshImport = async (req, res) => {
  if (!req.query && !req.body.id) {
    res.send({ success: false, message: "Event ID is Required" });
  }
  let response = await req.core.refreshEventProcessor(req.body.id);
  if (response) {
    res.send(response);
  } else {
    res.send({ success: false, message: "Failed to Refresh" });
  }
};
const stopImport = async (req, res) => {
  req
    .pool()
    .query(
      "update event set uploading = $1, loading = $2 where id = $3 ",
      [3, 0, req.body.id],
      function (err) {
        if (!err) {
          try {
            req.core.cancelEventUploadWithEventId(req.body.id);
          } catch (ex) {
            // console.log(ex)
          }
          res.send({ success: true, message: "Success Update Event" });
        } else {
          res.send({ success: false, message: err.message });
        }
      },
    );
};

module.exports = {
  importFileEvent,
  eventsFileImportv2,
  restartImport,
  resetImport,
  refreshImport,
  stopImport,
};
