const eventTranscripts = async function (req, res) {
  if (
    !req.query.eventId ||
    req.query.eventId == undefined ||
    req.query.eventId == null ||
    req.query.eventId == "null" ||
    req.query.eventId == ""
  ) {
    res.send({ success: false, message: "Event ID is Required" });
  } else {
    if (req.user.roleId != 1) {
      let username = req.user.username;
      req
        .pool()
        .query(
          "SELECT et.* FROM event_transcript et left join event e on e.id = et.event_id where  et.event_id = $1 and e.datausername = $2 order by et.seq, et.start, et.id asc",
          [req.query.eventId, username],
          function (err, qres) {
            res.send({
              success: true,
              message: "Success",
              data: qres ? qres.rows : [],
            });
          },
        );
    } else {
      req
        .pool()
        .query(
          "SELECT et.* FROM event_transcript et left join event e on e.id = et.event_id where  et.event_id = $1 order by et.seq, et.start, et.id asc",
          [req.query.eventId],
          function (err, qres) {
            res.send({
              success: true,
              message: "Success",
              data: qres ? qres.rows : [],
            });
          },
        );
    }
  }
};

const editTranscript = async function (req, res) {
  if (
    !req.body.transcriptMessageId ||
    req.body.transcriptMessageId == undefined ||
    req.body.transcriptMessageId == null ||
    req.body.transcriptMessageId == "null" ||
    req.body.transcriptMessageId == ""
  ) {
    res.send({ success: false, message: "Transcript Message ID is Required" });
  } else {
    req
      .pool()
      .query(
        "UPDATE event_transcript set transcript = $1 where message_id = $2 ",
        [req.body.transcriptMessageNew, req.body.transcriptMessageId],
        function (err) {
          if (err) {
            res.send({ success: false, message: err.message });
          } else {
            res.send({ success: true, message: "success edit transcript" });
          }
        },
      );
  }
};
const editTranscriptLive = async function (req, res) {
  if (
    !req.body.transcriptMessageId ||
    req.body.transcriptMessageId == undefined ||
    req.body.transcriptMessageId == null ||
    req.body.transcriptMessageId == "null" ||
    req.body.transcriptMessageId == ""
  ) {
    res.send({ success: false, message: "Transcript Message ID is Required" });
  } else {
    req
      .pool()
      .query(
        "UPDATE event_transcript set transcript = $1 where message_id = $2 ",
        [req.body.transcriptMessageNew, req.body.transcriptMessageId],
        function (err) {
          if (err) {
            res.send({ success: false, message: err.message });
          } else {
            res.send({ success: true, message: "success edit transcript" });
          }
        },
      );
  }
};
const updateTranscript = async function (req, res) {
  const transcriptId = req.body;
  req
    .pool()
    .query(
      "UPDATE event_transcript SET transcript = $1 WHERE id = $2 ",
      [req.body.transcriptId],
      function (err) {
        if (err) {
          res.send({ success: false, message: err.message });
        } else {
          res.send({ success: true, message: "success update transcript" });
        }
      },
    );
};

const deleteTranscript = async function (req, res) {
  if (
    !req.body.message_id ||
    req.body.message_id == undefined ||
    req.body.message_id == null ||
    req.body.message_id == "null" ||
    req.body.message_id == ""
  ) {
    res.send({ success: false, message: "Transcript ID is Required" });
  } else {
    req
      .pool()
      .query(
        "DELETE FROM event_transcript where message_id = $1 ",
        [req.body.message_id],
        function (err) {
          if (err) {
            res.send({ success: false, message: err.message });
          } else {
            req
              .pool()
              .query(
                "SELECT et.* FROM event_transcript et where et.event_id = $1 order by et.seq, et.start, et.id asc",
                [req.body.eventId],
                async function (err, qres) {
                  if (!qres) {
                    res.send({ success: false, message: "Gagal" });
                    return;
                  }
                  let lastStart = 0.0;
                  let lastStop = 0.0;
                  let lastDuration = 0.0;
                  let currStart = 0.0;
                  let currStop = 0.0;
                  let currDuration = 0.0;
                  for (let i = 0; i < qres.rows.length; i++) {
                    if (i == 0) {
                      lastStart = 0.0;
                      lastStop = 0 + qres.rows[i].duration;
                      lastDuration = 0.0 + qres.rows[i].duration;
                      currStart = 0.0;
                      currStop = 0.0 + qres.rows[i].duration;
                      currDuration = 0.0 + qres.rows[i].duration;
                    } else {
                      currStart = 0.0 + lastStop;
                      currStop = lastStop + qres.rows[i].duration;
                      currDuration = 0.0 + qres.rows[i].duration;
                    }
                    qres.rows[i].start = 0.0 + currStart;
                    qres.rows[i].stop = 0.0 + currStop;
                    qres.rows[i].duration = 0.0 + currDuration;
                    lastStart = 0 + currStart;
                    lastStop = 0 + currStop;
                    lastDuration = 0 + currDuration;
                    // console.log(qres.rows[i].id, qres.rows[i].start, qres.rows[i].stop, qres.rows[i].duration)
                    await req
                      .pool()
                      .query(
                        "UPDATE event_transcript set start = $1, stop = $2, duration = $3 where id = $4 ",
                        [
                          qres.rows[i].start,
                          qres.rows[i].stop,
                          qres.rows[i].duration,
                          qres.rows[i].id,
                        ],
                      );
                  }
                  res.send({
                    success: true,
                    message: "success delete transcript",
                  });
                },
              );
          }
        },
      );
  }
};
const deleteTranscriptOnly = async function (req, res) {
  if (
    !req.body.message_id ||
    req.body.message_id == undefined ||
    req.body.message_id == null ||
    req.body.message_id == "null" ||
    req.body.message_id == ""
  ) {
    res.send({ success: false, message: "Transcript ID is Required" });
  } else {
    req
      .pool()
      .query(
        "DELETE FROM event_transcript where message_id = $1 ",
        [req.body.message_id],
        function (err) {
          if (err) {
            res.send({ success: false, message: err.message });
          } else {
            res.send({
              success: true,
              message: "success delete transcript",
            });
          }
        },
      );
  }
};

module.exports = {
  eventTranscripts,
  editTranscript,
  editTranscriptLive,
  updateTranscript,
  deleteTranscript,
  deleteTranscriptOnly,
};
