const console = require("../../common/app-logger/console.js");

const config = require("../../common/config/config.js");

const moment = require("moment");
const fs = require("fs");
const path = require("path");

const getEvents = async function (req, res) {
  let next_7_day_filter = "";
  let username_filter = "";

  if (req && req.query && req.query.is_next_7_days == "true") {
    next_7_day_filter =
      " and timestart between date('now') and (SELECT date('now') + 7) ";
  }
  if (req && req.query && (req.query.ufa == "true" || req.query.ufa == true)) {
    username_filter = " and e.datausername = '" + req.query.username + "' ";
    if (req.query.username != req.user.username && req.user.roleId != 1) {
      res.status(403).send({ success: false, message: "Invalid request" });
      return;
    }
  }
  let q =
    "SELECT e.*, ea.name as agenda_name, et.name as event_type_name, ek.name as event_kind_name, eg.name as event_group_name , NULL::interval as processing_time from event e left join event_type et on et.id = e.event_type_id left join event_agenda ea on ea.id = e.agenda_id left join event_kind ek on ek.id = e.event_kind_id left join event_group eg on eg.id = e.event_group_id where 1=1 " +
    username_filter +
    " " +
    next_7_day_filter +
    " order by e.timestart desc";

  req.pool().query(q, [], function (err, qres) {
    if (err) {
      console.error("Failed to load events", err);
      return res.status(500).send({ success: false, message: "Gagal mengambil daftar rekaman." });
    }
    // console.log(err)
    res.send({
      success: true,
      message: "Success",
      data: qres ? qres.rows : [],
    });
  });
};
const detailEvents = async function (req, res) {
  let eventId = req.query.id ? req.query.id : null;
  let username = req.user.username;
  if (eventId != null) {
    let q =
      "SELECT e.*, ea.name as agenda_name, et.name as event_type_name, ek.name as event_kind_name, eg.name as event_group_name , NULL::interval as processing_time from event e left join event_type et on et.id = e.event_type_id left join event_agenda ea on ea.id = e.agenda_id left join event_kind ek on ek.id = e.event_kind_id left join event_group eg on eg.id = e.event_group_id where 1=1";
    q += " and e.id = " + eventId;
    if (req.user.roleId != 1) {
      q += " and e.datausername = '" + username + "'";
    }
    // console.log(q);

    req.pool().query(q, function (err, qres) {
      if (err) {
        console.error("Failed to load event details", err);
        return res.status(500).send({ success: false, message: "Gagal mengambil detail rekaman." });
      }
      if (qres && qres.rows && qres.rows.length > 0) {
        res.send({
          success: true,
          message: "Success",
          data: qres && qres.rows ? qres.rows[0] : null,
        });
      } else {
        res
          .status(403)
          .send({
            success: false,
            message: "Data not found or you are not belongs to them",
          });
      }
    });
  } else {
    return res.send({ success: false, message: "ID is Required", data: [] });
  }
};
const updateEventStatus = async function (req, res) {
  let eventId = req.body.id ? req.body.id : null;
  let status = req.body.status || req.body.status == 0 ? req.body.status : null;
  if (eventId != null && status != null) {
    var now = moment(new Date()).format("yyyy-MM-DD HH:mm:ss");
    var endDate = moment(new Date()).format("YYYY-MM-DD HH:mm");
    if (
      status &&
      status != null &&
      status != undefined &&
      (status == "2" || status == 2)
    ) {
      req
        .pool()
        .query(
          "update event set status = $1, updatedon = $2, timeend = $3 where id = $4",
          [status, now, endDate, eventId],
          function (errUpdate) {
            if (errUpdate) {
              console.err(errUpdate.message);
              res.send({ success: false, message: "Failed" });
            }
            let q =
              "SELECT e.*, ea.name as agenda_name, et.name as event_type_name, ek.name as event_kind_name, eg.name as event_group_name , NULL::interval as processing_time from event e left join event_type et on et.id = e.event_type_id left join event_agenda ea on ea.id = e.agenda_id left join event_kind ek on ek.id = e.event_kind_id left join event_group eg on eg.id = e.event_group_id where 1=1";
            q += " and e.id = " + eventId;
            req.pool().query(q, function (err, qres) {
              res.send({
                success: true,
                message: "Success",
                data: qres.rows[0],
              });
            });
          },
        );
    } else {
      req
        .pool()
        .query(
          "update event set status = $1, updatedon = $2 where id = $3",
          [status, now, eventId],
          function (errUpdate) {
            if (errUpdate) res.send({ success: false, message: "Failed" });
            let q =
              "SELECT e.*, ea.name as agenda_name, et.name as event_type_name, ek.name as event_kind_name, eg.name as event_group_name , NULL::interval as processing_time from event e left join event_type et on et.id = e.event_type_id left join event_agenda ea on ea.id = e.agenda_id left join event_kind ek on ek.id = e.event_kind_id left join event_group eg on eg.id = e.event_group_id where 1=1";
            q += " and e.id = " + eventId;
            req.pool().query(q, function (err, qres) {
              res.send({
                success: true,
                message: "Success",
                data: qres.rows[0],
              });
            });
          },
        );
    }
  } else {
    return res.send({
      success: false,
      message: "ID and status are Required",
      data: req.body,
    });
  }
};
const updateEvent = async function (req, res) {
  if (!req.body) {
    res.send({ success: false, message: "Request cannot be processed" });
    return;
  }
  let eventId = req.body.id ? req.body.id : null;
  let real_transcript_path =
    req.body.real_transcript_path || req.body.real_transcript_path == 0
      ? req.body.real_transcript_path
      : null;
  let revised_transcript_path =
    req.body.revised_transcript_path || req.body.revised_transcript_path == 0
      ? req.body.revised_transcript_path
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
  let json_transcript_file_path =
    req.body.json_transcript_file_path ||
    req.body.json_transcript_file_path == 0
      ? req.body.json_transcript_file_path
      : null;
  let zip_file_path =
    req.body.zip_file_path || req.body.zip_file_path == 0
      ? req.body.zip_file_path
      : null;
  if (eventId != null) {
    let qIdx = 1;
    if (
      real_transcript_path != null ||
      revised_transcript_path != null ||
      json_file_path != null ||
      audio_folder_path != null ||
      sync_status != null ||
      json_transcript_file_path != null ||
      zip_file_path != null
    ) {
      let q = "update event set ";
      let param = [];
      if (real_transcript_path != null) {
        q += " real_transcript_path = $" + qIdx + " ,";
        param.push(real_transcript_path);
        qIdx++;
      }
      if (revised_transcript_path != null) {
        q += " revised_transcript_path = $" + qIdx + " ,";
        param.push(revised_transcript_path);
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
      if (json_transcript_file_path != null) {
        q += " json_transcript_file_path = $" + qIdx + " ,";
        param.push(json_transcript_file_path);
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
        let q =
          "SELECT e.*, ea.name as agenda_name, et.name as event_type_name, ek.name as event_kind_name, eg.name as event_group_name , NULL::interval as processing_time from event e left join event_type et on et.id = e.event_type_id left join event_agenda ea on ea.id = e.agenda_id left join event_kind ek on ek.id = e.event_kind_id left join event_group eg on eg.id = e.event_group_id where 1=1";
        q += " and e.id = " + eventId;
        req.pool().query(q, function (err, qres) {
          res.send({
            success: true,
            message: "Success",
            data: qres ? qres.rows : [][0],
          });
        });
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
const updateEventAuto = async function (req, res) {
  if (!req.body) {
    res.send({ success: false, message: "Request cannot be processed" });
    return;
  }
  let eventId = req.body.id ? req.body.id : null;
  let real_transcript_path =
    req.body.real_transcript_path || req.body.real_transcript_path == 0
      ? req.body.real_transcript_path
      : null;
  let revised_transcript_path =
    req.body.revised_transcript_path || req.body.revised_transcript_path == 0
      ? req.body.revised_transcript_path
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
  let json_transcript_file_path =
    req.body.json_transcript_file_path ||
    req.body.json_transcript_file_path == 0
      ? req.body.json_transcript_file_path
      : null;
  let zip_file_path =
    req.body.zip_file_path || req.body.zip_file_path == 0
      ? req.body.zip_file_path
      : null;
  if (eventId != null) {
    if (
      real_transcript_path != null ||
      revised_transcript_path != null ||
      json_file_path != null ||
      audio_folder_path != null ||
      sync_status != null ||
      json_transcript_file_path != null ||
      zip_file_path != null
    ) {
      let q = "update event set ";
      let param = [];
      let qIdx = 1;
      if (real_transcript_path != null) {
        q += " real_transcript_path = $" + qIdx + " ,";
        param.push(real_transcript_path);
        qIdx++;
      }
      if (revised_transcript_path != null) {
        q += " revised_transcript_path = $" + qIdx + " ,";
        param.push(revised_transcript_path);
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
      if (json_transcript_file_path != null) {
        q += " json_transcript_file_path = $" + qIdx + " ,";
        param.push(json_transcript_file_path);
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
        let q =
          "SELECT e.*, ea.name as agenda_name, et.name as event_type_name, ek.name as event_kind_name, eg.name as event_group_name , NULL::interval as processing_time from event e left join event_type et on et.id = e.event_type_id left join event_agenda ea on ea.id = e.agenda_id left join event_kind ek on ek.id = e.event_kind_id left join event_group eg on eg.id = e.event_group_id where 1=1";
        q += " and e.id = " + eventId;
        req.pool().query(q, function (err, qres) {
          res.send({
            success: true,
            message: "Success",
            data: qres ? qres.rows : [][0],
          });
        });
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
const eventDelete = async function (req, res) {
  let eventId = req.body.id ? req.body.id : null;
  if (eventId != null) {
    let q =
      "SELECT e.* , NULL::interval as processing_time from event e where 1=1";
    q += " and e.id = " + eventId;
    req.pool().query(q, function (err, qsres) {
      if (qsres && qsres.rows && qsres.rows.length > 0) {
        try {
          let eventDirectory = "";
          let uploadedFile = "";
          if (config.app_env === "production") {
            eventDirectory = config.paths.events;
          } else {
            eventDirectory = config.paths.events;
          }
          let eventDir = path.join(eventDirectory, "event-" + eventId);
          if (config.app_env === "production") {
            uploadedFile = config.paths.uploads;
          } else {
            uploadedFile = config.paths.uploads;
          }
          if (qsres.rows[0].real_transcript_path) {
            let userFilePath = path.join(
              eventDir,
              qsres.rows[0].real_transcript_path,
            );
            fs.rmSync(userFilePath, { recursive: true, force: true });
            // console.log("Removed: ", userFilePath)
          }
          if (qsres.rows[0].import_file_path) {
            let importedFilePath = path.join(
              uploadedFile,
              qsres.rows[0].import_file_path,
            );
            fs.rmSync(importedFilePath, { recursive: true, force: true });
            // console.log("Removed: ", importedFilePath)
          }
        } catch (ex) {
          console.log("Delete event files failed");
          console.log(ex);
        }
        req.core.cancelEventUploadWithEventId(eventId);
        let q = "delete from event where id = $1 ";
        req.pool().query(q, [eventId], function (r1) {
          let q = "delete from event_transcript where event_id = $1 ";
          req.pool().query(q, [eventId], function (r2) {
            let q = "delete from event_attendance where event_id = $1 ";
            req.pool().query(q, [eventId], function (r3) {
              res.send({ success: true, message: "Success" });
              return;
            });
          });
        });
      } else {
        return res.send({
          success: false,
          message: "Event not found",
          data: req.body,
        });
      }
    });
  } else {
    return res.send({
      success: false,
      message: "ID are Required",
      data: req.body,
    });
  }
};

module.exports = {
  getEvents,
  detailEvents,
  updateEventStatus,
  updateEvent,
  updateEventAuto,
  eventDelete,
};
