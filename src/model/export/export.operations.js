const console = require("../../common/app-logger/console.js");

const config = require("../../common/config/config.js");

const moment = require("moment");
const fs = require("fs");
const path = require("path");
const docx = require("docx");
const { parseEventId, isAdmin } = require("../../common/runtime/event-access");
const {
  Document,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  WidthType,
  HeadingLevel,
  AlignmentType,
  TextRun,
  ColumnBreak,
  BorderStyle,
  UnderlineType,
  Header,
  ImageRun,
} = docx;

const exportEventTranscripts = async function (req, res) {
  const safeEventId = parseEventId(req.query.eventId);
  if (safeEventId === null)
    return res
      .status(400)
      .send({ success: false, message: "Invalid event ID" });
  if (
    !req.query.eventId ||
    req.query.eventId == undefined ||
    req.query.eventId == null ||
    req.query.eventId == "null" ||
    req.query.eventId == ""
  ) {
    res.send({ success: false, message: "Event ID is Required" });
  } else {
    let q =
      "SELECT e.*, ea.name as agenda_name, et.name as event_type_name, ek.name as event_kind_name, eg.name as event_group_name , NULL::interval as processing_time from event e left join event_type et on et.id = e.event_type_id left join event_agenda ea on ea.id = e.agenda_id left join event_kind ek on ek.id = e.event_kind_id left join event_group eg on eg.id = e.event_group_id where 1=1";
    q +=
      " and e.id = $1" + (isAdmin(req.user) ? "" : " AND e.datausername = $2");
    const eventParams = isAdmin(req.user)
      ? [safeEventId]
      : [safeEventId, req.user.username];
    req.pool().query(q, eventParams, function (err, qsres) {
      if (qsres && qsres.rows && qsres.rows.length > 0) {
        let prevQresRows = qsres.rows[0];
        req
          .pool()
          .query(
            "SELECT * FROM event_transcript where event_id = $1 order by start, id asc",
            [req.query.eventId],
            async function (err, qres) {
              if (qres && qres.rows && qres.rows.length > 0) {
                let q =
                  "SELECT ea.name as Nama, ea.description as role, ea.status_type as Status, att.nip as NIP, att.jabatan as Jabatan, att.tempat_lahir as Tempat_Lahir, att.jenis_kelamin as Jenis_Kelamin, att.kewarganegaraan as Kewarganegaraan, att.agama as Agama, att.alamat as Alamat, att.pekerjaan as Pekerjaan, att.pendidikan as Pendidikan FROM event_attendance ea left join attendance att on att.id = ea.attendance_id where 1=1";
                q += " and ea.event_id = $1";
                let wPrevQresRows = prevQresRows;
                let qresRows = qres.rows;
                req.pool().query(q, [safeEventId], function (err, qres2) {
                  if (qres2 && qres2.rows && qres2.rows.length > 0) {
                    let sortedTranscripts = [];
                    let runningTranscripts = [];
                    for (let i = 0; i < qresRows.length; i++) {
                      if (
                        runningTranscripts.length == 0 ||
                        (qresRows[i].event_id ==
                          runningTranscripts[runningTranscripts.length - 1]
                            .event_id &&
                          qresRows[i].attendance ==
                            runningTranscripts[runningTranscripts.length - 1]
                              .attendance)
                      ) {
                        try {
                          if (qresRows[i].attendance_id) {
                            if (
                              qresRows[i].attendance_id ==
                              runningTranscripts[runningTranscripts.length - 1]
                                .attendance_id
                            ) {
                              runningTranscripts.push(qresRows[i]);
                            }
                          } else {
                            runningTranscripts.push(qresRows[i]);
                          }
                        } catch (exceptione) {
                          runningTranscripts.push(qresRows[i]);
                        }
                      } else {
                        if (runningTranscripts.length > 0) {
                          let mergedRunningTranscript = "";
                          for (let j = 0; j < runningTranscripts.length; j++) {
                            mergedRunningTranscript =
                              mergedRunningTranscript +
                              runningTranscripts[j].transcript.trim();
                            if (j < runningTranscripts.length - 1) {
                              mergedRunningTranscript =
                                mergedRunningTranscript + ". ";
                            }
                          }
                          let newMergedTranscript = JSON.parse(
                            JSON.stringify(runningTranscripts[0]),
                          );
                          newMergedTranscript.transcript =
                            mergedRunningTranscript;
                          sortedTranscripts.push(newMergedTranscript);
                        }

                        runningTranscripts = [];
                        runningTranscripts.push(qresRows[i]);
                      }
                    }
                    if (runningTranscripts.length > 0) {
                      let mergedRunningTranscript = "";
                      for (let j = 0; j < runningTranscripts.length; j++) {
                        mergedRunningTranscript =
                          mergedRunningTranscript +
                          runningTranscripts[j].transcript.trim();
                        if (j < runningTranscripts.length - 1) {
                          mergedRunningTranscript =
                            mergedRunningTranscript + ". ";
                        }
                      }
                      let newMergedTranscript = JSON.parse(
                        JSON.stringify(runningTranscripts[0]),
                      );
                      newMergedTranscript.transcript = mergedRunningTranscript;
                      sortedTranscripts.push(newMergedTranscript);
                    }
                    exportTranscriptToWord(
                      req.query.eventId,
                      wPrevQresRows,
                      sortedTranscripts,
                      qres2.rows,
                      res,
                      req,
                    );
                  } else {
                    res.send({
                      success: false,
                      message: "Event Attendance Not found",
                    });
                  }
                });
              } else {
                res.send({
                  success: false,
                  message: "Event Transcript Not found",
                });
              }
            },
          );
      } else {
        res.send({ success: false, message: "Event Not found" });
      }
    });
  }
};
const exportVideoTranscripts = async function (req, res) {
  const safeEventId = parseEventId(req.query.eventId);
  if (safeEventId === null)
    return res
      .status(400)
      .send({ success: false, message: "Invalid event ID" });
  if (
    !req.query.eventId ||
    req.query.eventId == undefined ||
    req.query.eventId == null ||
    req.query.eventId == "null" ||
    req.query.eventId == ""
  ) {
    res.send({ success: false, message: "Event ID is Required" });
  } else {
    let q =
      "SELECT e.*, ea.name as agenda_name, et.name as event_type_name, ek.name as event_kind_name, eg.name as event_group_name , NULL::interval as processing_time from event e left join event_type et on et.id = e.event_type_id left join event_agenda ea on ea.id = e.agenda_id left join event_kind ek on ek.id = e.event_kind_id left join event_group eg on eg.id = e.event_group_id where 1=1";
    q +=
      " and e.id = $1" + (isAdmin(req.user) ? "" : " AND e.datausername = $2");
    const eventParams = isAdmin(req.user)
      ? [safeEventId]
      : [safeEventId, req.user.username];
    req.pool().query(q, eventParams, function (err, qsres) {
      if (qsres && qsres.rows && qsres.rows.length > 0) {
        let prevQresRows = qsres.rows[0];
        const recordingFile = prevQresRows?.import_file_path;
        if (
          typeof recordingFile === "string" &&
          /\.(mp4|m4a|f4v|m4b|mov)$/i.test(recordingFile)
        ) {
          req
            .pool()
            .query(
              "SELECT * FROM event_transcript where event_id = $1 order by start, id asc",
              [req.query.eventId],
              async function (err, qres) {
                if (qres && qres.rows && qres.rows.length > 0) {
                  exportTranscriptSubtitle(
                    req.query.eventId,
                    prevQresRows,
                    qres.rows,
                    res,
                    req,
                  );
                } else {
                  res.send({
                    success: false,
                    message: "Event Transcript Not found",
                  });
                }
              },
            );
        } else {
          res.send({ success: false, message: "Not video format" });
        }
      } else {
        res.send({ success: false, message: "Event Not found" });
      }
    });
  }
};

const exportTranscriptSubtitle = async (
  eventid,
  event,
  transcripts,
  res,
  req,
) => {
  let uploadedFile = "";
  if (config.app_env === "production") {
    uploadedFile = config.paths.uploads;
  } else {
    uploadedFile = config.paths.uploads;
  }
  let importFilePath = path.join(uploadedFile, event.import_file_path);
  let destinationFilePath = path.join(
    path.dirname(importFilePath),
    path.basename(importFilePath, path.extname(importFilePath)) + ".vtt",
  );
  if (destinationFilePath && fs.existsSync(destinationFilePath)) {
    fs.rmSync(destinationFilePath, { recursive: true, force: true });
    // console.log("Removed: ", destinationFilePath)
  }
  var stream = fs.createWriteStream(destinationFilePath);
  stream.once("open", async function (fd) {
    let veventid = eventid;
    let filename = path.basename(destinationFilePath);
    stream.write("WEBVTT\n\n");
    stream.write("NOTE Automatically Generated by meetha.cakra.ai\n\n");
    for (var i = 0; i < transcripts.length; i++) {
      let startTime = getTime(transcripts[i].start, "HH:mm:ss.SSS");
      let endTime = getTime(transcripts[i].stop, "HH:mm:ss.SSS");
      stream.write(startTime + " --> " + endTime + "\n");
      stream.write(transcripts[i].transcript.trim() + "\n\n");
    }
    stream.end();
    await req
      .pool()
      .query("UPDATE event SET subtitle_file_path = $1 WHERE id = $2 ", [
        filename,
        veventid,
      ]);
    res.send({
      success: true,
      message: "Success generate subtitle",
      data: { subtitle_file_path: filename },
    });
  });
};
const exportTranscriptToWord = async (
  eventid,
  event,
  rows,
  attendances,
  res,
  req,
) => {
  try {
    let title = "NOTULEN ACARA";
    let eventDay = moment(new Date(event.timestart)).format("dddd");
    let eventDate = moment(new Date(event.timestart)).format("DD MMMM YYYY");
    let eventTime = moment(new Date(event.timestart)).format("HH:mm");
    let nowDate = moment(new Date()).format("DD MMMM YYYY");
    let nowTime = moment(new Date()).format("HH:mm");
    let attendanceString = "";
    let format = req.query.format || "docx";
    if (attendances && attendances.length > 0) {
      for (let idx = 0; idx < attendances.length; idx++) {
        attendanceString += attendances[idx].nama;
        if (idx < attendances.length - 1) {
          attendanceString += ", ";
        }
      }
    }
    let sectionChilds3 = [];

    sectionChilds3.push(
      new Paragraph({
        children: [
          new TextRun({
            text: title,
            font: {
              name: "Arial",
            },
            color: "#000000",
            bold: true,
            size: 22,
            underline: { type: "single", color: "#000000" },
          }),
        ],
        heading: HeadingLevel.HEADING_3,
        alignment: AlignmentType.CENTER,
        spacing: {
          before: 0,
          after: 465,
        },
      }),
    );

    let longSummary = event.long_summary;

    let objSummary = null;
    if (longSummary) {
      objSummary = JSON.parse(event.long_summary);
    }

    sectionChilds3.push(
      new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        children: [
          new TextRun({
            text: "Informasi Rapat",
            font: {
              name: "Arial",
            },
            bold: true,
            size: 22,
            color: "#000000",
          }),
        ],
        style: "wellSpaced",
        spacing: {
          before: 0,
          after: 75,
        },
      }),
    );
    let infoTableRows = [];
    infoTableRows.push(
      new TableRow({
        children: [
          new TableCell({
            width: {
              size: 2500,
              type: WidthType.DXA,
            },
            shading: {
              color: "EFEFEF",
              type: docx.ShadingType.SOLID,
            },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1, color: "D6D6D6" },
              bottom: { style: BorderStyle.SINGLE, size: 1, color: "D6D6D6" },
              left: { style: BorderStyle.SINGLE, size: 1, color: "D6D6D6" },
              right: { style: BorderStyle.NIL, size: 0, color: "FFFFFF" },
            },
            children: [
              new Paragraph({
                style: "wellSpaced",
                spacing: {
                  before: 0,
                  after: 0,
                },
                children: [
                  new TextRun({
                    text: "Keterangan Rapat",
                    font: {
                      name: "Arial",
                    },
                    bold: true,
                    size: 22,
                    color: "#000000",
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: {
              size: 7300,
              type: WidthType.DXA,
            },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1, color: "D6D6D6" },
              bottom: { style: BorderStyle.SINGLE, size: 1, color: "D6D6D6" },
              left: { style: BorderStyle.SINGLE, size: 1, color: "D6D6D6" },
              right: { style: BorderStyle.SINGLE, size: 1, color: "D6D6D6" },
            },
            children: [
              new Paragraph({
                style: "wellSpaced",
                spacing: {
                  before: 0,
                  after: 0,
                },
                alignment: AlignmentType.JUSTIFIED,
                children: [
                  new TextRun({
                    text: event.description ? event.description : "",
                    font: {
                      name: "Arial",
                    },
                    size: 22,
                    color: "#000000",
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    );
    infoTableRows.push(
      new TableRow({
        children: [
          new TableCell({
            width: {
              size: 2500,
              type: WidthType.DXA,
            },
            shading: {
              color: "EFEFEF",
              type: docx.ShadingType.SOLID,
            },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1, color: "D6D6D6" },
              bottom: { style: BorderStyle.SINGLE, size: 1, color: "D6D6D6" },
              left: { style: BorderStyle.SINGLE, size: 1, color: "D6D6D6" },
              right: { style: BorderStyle.NIL, size: 0, color: "FFFFFF" },
            },
            children: [
              new Paragraph({
                style: "wellSpaced",
                spacing: {
                  before: 0,
                  after: 0,
                },
                children: [
                  new TextRun({
                    text: "Tanggal & Jam",
                    font: {
                      name: "Arial",
                    },
                    bold: true,
                    size: 22,
                    color: "#000000",
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: {
              size: 7300,
              type: WidthType.DXA,
            },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1, color: "D6D6D6" },
              bottom: { style: BorderStyle.SINGLE, size: 1, color: "D6D6D6" },
              left: { style: BorderStyle.SINGLE, size: 1, color: "D6D6D6" },
              right: { style: BorderStyle.SINGLE, size: 1, color: "D6D6D6" },
            },
            children: [
              new Paragraph({
                style: "wellSpaced",
                spacing: {
                  before: 0,
                  after: 0,
                },
                alignment: AlignmentType.JUSTIFIED,
                children: [
                  new TextRun({
                    text: eventDate + " " + eventTime,
                    font: {
                      name: "Arial",
                    },
                    size: 22,
                    color: "#000000",
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    );

    let attendanceRunner = [];
    let addedAttendances = [];
    if (attendances && attendances.length > 0) {
      for (let idx = 0; idx < attendances.length; idx++) {
        if (!addedAttendances.includes(attendances[idx])) {
          let kpPrg = new Paragraph({
            style: "wellSpaced",
            spacing: {
              before: 0,
              after: 0,
            },
            alignment: AlignmentType.JUSTIFIED,
            bullet: {
              level: 0,
            },
            children: [
              new TextRun({
                text: attendances[idx].nama,
                font: {
                  name: "Arial",
                },
                size: 22,
                color: "#000000",
              }),
            ],
          });
          attendanceRunner.push(kpPrg);
          addedAttendances.push(attendances[idx]);
        }
      }
    }
    infoTableRows.push(
      new TableRow({
        children: [
          new TableCell({
            width: {
              size: 2500,
              type: WidthType.DXA,
            },
            shading: {
              color: "EFEFEF",
              type: docx.ShadingType.SOLID,
            },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1, color: "D6D6D6" },
              bottom: { style: BorderStyle.SINGLE, size: 1, color: "D6D6D6" },
              left: { style: BorderStyle.SINGLE, size: 1, color: "D6D6D6" },
              right: { style: BorderStyle.NIL, size: 0, color: "FFFFFF" },
            },
            children: [
              new Paragraph({
                style: "wellSpaced",
                spacing: {
                  before: 0,
                  after: 0,
                },
                children: [
                  new TextRun({
                    text: "Peserta",
                    font: {
                      name: "Arial",
                    },
                    bold: true,
                    size: 22,
                    color: "#000000",
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: {
              size: 7300,
              type: WidthType.DXA,
            },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1, color: "D6D6D6" },
              bottom: { style: BorderStyle.SINGLE, size: 1, color: "D6D6D6" },
              left: { style: BorderStyle.SINGLE, size: 1, color: "D6D6D6" },
              right: { style: BorderStyle.SINGLE, size: 1, color: "D6D6D6" },
            },
            children: attendanceRunner,
          }),
        ],
      }),
    );
    const infoTable = new Table({
      columnWidths: [2500, 7300],
      rows: infoTableRows,
      margins: {
        top: 100,
        right: 150,
        bottom: 100,
        left: 150,
      },
    });
    sectionChilds3.push(infoTable);
    sectionChilds3.push(
      new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        children: [
          new TextRun({
            text: "",
            font: {
              name: "Arial",
            },
            size: 22,
            color: "#000000",
          }),
        ],
        style: "wellSpaced",
        spacing: {
          before: 0,
          after: 155,
        },
      }),
    );
    sectionChilds3.push(
      new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        children: [
          new TextRun({
            text: "Kesimpulan Event",
            font: {
              name: "Arial",
            },
            bold: true,
            size: 22,
            color: "#000000",
          }),
        ],
        style: "wellSpaced",
        spacing: {
          before: 0,
          after: 75,
        },
      }),
    );
    let summaryTableRows = [];
    summaryTableRows.push(
      new TableRow({
        children: [
          new TableCell({
            width: {
              size: 2500,
              type: WidthType.DXA,
            },
            shading: {
              color: "EFEFEF",
              type: docx.ShadingType.SOLID,
            },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1, color: "D6D6D6" },
              bottom: { style: BorderStyle.SINGLE, size: 1, color: "D6D6D6" },
              left: { style: BorderStyle.SINGLE, size: 1, color: "D6D6D6" },
              right: { style: BorderStyle.NIL, size: 0, color: "FFFFFF" },
            },
            children: [
              new Paragraph({
                style: "wellSpaced",
                spacing: {
                  before: 0,
                  after: 0,
                },
                children: [
                  new TextRun({
                    text: "Topik",
                    font: {
                      name: "Arial",
                    },
                    bold: true,
                    size: 22,
                    color: "#000000",
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: {
              size: 7300,
              type: WidthType.DXA,
            },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1, color: "D6D6D6" },
              bottom: { style: BorderStyle.SINGLE, size: 1, color: "D6D6D6" },
              left: { style: BorderStyle.SINGLE, size: 1, color: "D6D6D6" },
              right: { style: BorderStyle.SINGLE, size: 1, color: "D6D6D6" },
            },
            children: [
              new Paragraph({
                style: "wellSpaced",
                spacing: {
                  before: 0,
                  after: 0,
                },
                alignment: AlignmentType.JUSTIFIED,
                children: [
                  new TextRun({
                    text:
                      objSummary && objSummary.topic ? objSummary.topic : "",
                    font: {
                      name: "Arial",
                    },
                    size: 22,
                    color: "#000000",
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    );
    summaryTableRows.push(
      new TableRow({
        children: [
          new TableCell({
            width: {
              size: 2500,
              type: WidthType.DXA,
            },
            shading: {
              color: "EFEFEF",
              type: docx.ShadingType.SOLID,
            },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1, color: "D6D6D6" },
              bottom: { style: BorderStyle.SINGLE, size: 1, color: "D6D6D6" },
              left: { style: BorderStyle.SINGLE, size: 1, color: "D6D6D6" },
              right: { style: BorderStyle.NIL, size: 0, color: "FFFFFF" },
            },
            children: [
              new Paragraph({
                style: "wellSpaced",
                spacing: {
                  before: 0,
                  after: 0,
                },
                children: [
                  new TextRun({
                    text: "Kesimpulan",
                    font: {
                      name: "Arial",
                    },
                    bold: true,
                    size: 22,
                    color: "#000000",
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: {
              size: 7300,
              type: WidthType.DXA,
            },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1, color: "D6D6D6" },
              bottom: { style: BorderStyle.SINGLE, size: 1, color: "D6D6D6" },
              left: { style: BorderStyle.SINGLE, size: 1, color: "D6D6D6" },
              right: { style: BorderStyle.SINGLE, size: 1, color: "D6D6D6" },
            },
            children: [
              new Paragraph({
                style: "wellSpaced",
                spacing: {
                  before: 0,
                  after: 0,
                },
                alignment: AlignmentType.JUSTIFIED,
                children: [
                  new TextRun({
                    text:
                      objSummary && objSummary.summary
                        ? objSummary.summary
                        : "",
                    font: {
                      name: "Arial",
                    },
                    size: 22,
                    color: "#000000",
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    );

    // let keyPointRunner = []
    // if (objSummary && objSummary.key_point && objSummary.key_point.length > 0) {
    // 	for (let idx = 0; idx < objSummary.key_point.length; idx++) {
    // 		if (objSummary.key_point[idx] && objSummary.key_point[idx].key) {
    // 			let kpPrg = new Paragraph({
    // 				style: "wellSpaced",
    // 				spacing: {
    // 					before: 0,
    // 					after: 0,
    // 				},
    // 				alignment: AlignmentType.JUSTIFIED,
    // 				bullet: {
    // 					level: 0,
    // 				},
    // 				children: [new TextRun({
    // 					text: objSummary.key_point[idx].key,
    // 					font: {
    // 						name: "Arial",
    // 					},
    // 					size: 22,
    // 					color: "#000000",
    // 				})],
    // 			})
    // 			keyPointRunner.push(kpPrg)
    // 		}
    // 	}
    // }
    let keyPointRunner = [];
    if (objSummary && objSummary.key_point && objSummary.key_point.length > 0) {
      for (let idx = 0; idx < objSummary.key_point.length; idx++) {
        let keyPrg = new Paragraph({
          style: "wellSpaced",
          spacing: {
            before: 0,
            after: 0,
          },
          alignment: AlignmentType.JUSTIFIED,
          bullet: {
            level: 0,
          },
          children: [
            new TextRun({
              text: objSummary.key_point[idx].key
                ? objSummary.key_point[idx].key
                : "-",
              font: {
                name: "Arial",
              },
              size: 22,
              color: "#000000",
            }),
          ],
        });
        keyPointRunner.push(keyPrg);
        let expPrg = new Paragraph({
          style: "wellSpaced",
          spacing: {
            before: 0,
            after: 0,
          },
          alignment: AlignmentType.JUSTIFIED,
          indent: {
            left: 710,
          },
          children: [
            new TextRun({
              text: objSummary.key_point[idx].explanation
                ? objSummary.key_point[idx].explanation
                : "-",
              font: {
                name: "Arial",
              },
              size: 22,
              color: "#000000",
            }),
          ],
        });
        keyPointRunner.push(expPrg);
      }
    }
    summaryTableRows.push(
      new TableRow({
        children: [
          new TableCell({
            width: {
              size: 2500,
              type: WidthType.DXA,
            },
            shading: {
              color: "EFEFEF",
              type: docx.ShadingType.SOLID,
            },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1, color: "D6D6D6" },
              bottom: { style: BorderStyle.SINGLE, size: 1, color: "D6D6D6" },
              left: { style: BorderStyle.SINGLE, size: 1, color: "D6D6D6" },
              right: { style: BorderStyle.NIL, size: 0, color: "FFFFFF" },
            },
            children: [
              new Paragraph({
                style: "wellSpaced",
                spacing: {
                  before: 0,
                  after: 0,
                },
                children: [
                  new TextRun({
                    text: "Poin-poin Penting",
                    font: {
                      name: "Arial",
                    },
                    bold: true,
                    size: 22,
                    color: "#000000",
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: {
              size: 7300,
              type: WidthType.DXA,
            },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1, color: "D6D6D6" },
              bottom: { style: BorderStyle.SINGLE, size: 1, color: "D6D6D6" },
              left: { style: BorderStyle.SINGLE, size: 1, color: "D6D6D6" },
              right: { style: BorderStyle.SINGLE, size: 1, color: "D6D6D6" },
            },
            children: keyPointRunner,
          }),
        ],
      }),
    );
    let actionRunner = [];
    if (objSummary && objSummary.target && objSummary.target.length > 0) {
      for (let idx = 0; idx < objSummary.target.length; idx++) {
        let taskPrg = new Paragraph({
          style: "wellSpaced",
          spacing: {
            before: 0,
            after: 0,
          },
          alignment: AlignmentType.JUSTIFIED,
          bullet: {
            level: 0,
          },
          children: [
            new TextRun({
              text: "Aksi: ",
              font: {
                name: "Arial",
              },
              bold: false,
              size: 22,
              color: "#000000",
            }),
            new TextRun({
              text: objSummary.target[idx].Task
                ? objSummary.target[idx].Task
                : "-",
              font: {
                name: "Arial",
              },
              size: 22,
              color: "#000000",
            }),
          ],
        });
        actionRunner.push(taskPrg);
        let picPrg = new Paragraph({
          style: "wellSpaced",
          spacing: {
            before: 0,
            after: 0,
          },
          alignment: AlignmentType.JUSTIFIED,
          indent: {
            left: 710,
          },
          children: [
            new TextRun({
              text: "PIC: ",
              font: {
                name: "Arial",
              },
              bold: false,
              size: 22,
              color: "#000000",
            }),
            new TextRun({
              text: objSummary.target[idx].PIC
                ? objSummary.target[idx].PIC
                : "-",
              font: {
                name: "Arial",
              },
              size: 22,
              color: "#000000",
            }),
          ],
        });
        actionRunner.push(picPrg);
        let targetPrg = new Paragraph({
          style: "wellSpaced",
          spacing: {
            before: 0,
            after: 0,
          },
          alignment: AlignmentType.JUSTIFIED,
          indent: {
            left: 710,
          },
          children: [
            new TextRun({
              text: "Target: ",
              font: {
                name: "Arial",
              },
              bold: false,
              size: 22,
              color: "#000000",
            }),
            new TextRun({
              text: objSummary.target[idx].Deadline
                ? objSummary.target[idx].Deadline
                : "-",
              font: {
                name: "Arial",
              },
              size: 22,
              color: "#000000",
            }),
          ],
        });
        actionRunner.push(targetPrg);
        if (idx < objSummary.target.length - 1) {
          let spacePrg = new Paragraph({
            style: "wellSpaced",
            spacing: {
              before: 0,
              after: 0,
            },
            alignment: AlignmentType.JUSTIFIED,
            indent: {
              left: 710,
            },
            children: [
              new TextRun({
                text: "",
                font: {
                  name: "Arial",
                },
                bold: true,
                size: 5,
                color: "#000000",
              }),
            ],
          });
          actionRunner.push(spacePrg);
        }
      }
    }
    summaryTableRows.push(
      new TableRow({
        children: [
          new TableCell({
            width: {
              size: 2500,
              type: WidthType.DXA,
            },
            shading: {
              color: "EFEFEF",
              type: docx.ShadingType.SOLID,
            },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1, color: "D6D6D6" },
              bottom: { style: BorderStyle.SINGLE, size: 1, color: "D6D6D6" },
              left: { style: BorderStyle.SINGLE, size: 1, color: "D6D6D6" },
              right: { style: BorderStyle.NIL, size: 0, color: "FFFFFF" },
            },
            children: [
              new Paragraph({
                style: "wellSpaced",
                spacing: {
                  before: 0,
                  after: 0,
                },
                children: [
                  new TextRun({
                    text: "Tindak Lanjut",
                    font: {
                      name: "Arial",
                    },
                    bold: true,
                    size: 22,
                    color: "#000000",
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: {
              size: 7300,
              type: WidthType.DXA,
            },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1, color: "D6D6D6" },
              bottom: { style: BorderStyle.SINGLE, size: 1, color: "D6D6D6" },
              left: { style: BorderStyle.SINGLE, size: 1, color: "D6D6D6" },
              right: { style: BorderStyle.SINGLE, size: 1, color: "D6D6D6" },
            },
            children: actionRunner,
          }),
        ],
      }),
    );
    let attndOpinionRunner = [];
    if (objSummary && objSummary.attnd_opinions) {
      Object.entries(objSummary.attnd_opinions).forEach(
        ([attendant, opinions]) => {
          if (attendant) {
            let atnPrg = new Paragraph({
              style: "wellSpaced",
              spacing: {
                before: 0,
                after: 0,
              },
              alignment: AlignmentType.JUSTIFIED,
              bullet: {
                level: 0,
              },
              children: [
                new TextRun({
                  text: attendant ? attendant + ": " : "-",
                  font: {
                    name: "Arial",
                  },
                  bold: true,
                  size: 22,
                  color: "#000000",
                }),
              ],
            });
            attndOpinionRunner.push(atnPrg);
          }
          if (opinions) {
            opinions.forEach((opinion, index) => {
              let opinionPrg = new Paragraph({
                style: "wellSpaced",
                spacing: {
                  before: 0,
                  after: 0,
                },
                alignment: AlignmentType.JUSTIFIED,
                indent: {
                  left: 710,
                },
                children: [
                  new TextRun({
                    text: opinion && opinion.opinion ? opinion.opinion : "-",
                    font: {
                      name: "Arial",
                    },
                    size: 22,
                    color: "#000000",
                  }),
                ],
              });
              attndOpinionRunner.push(opinionPrg);
            });
            // for (let opIdx = 0; opIdx < opinions.length; opIdx++) {
            // 	attndOpinionRunner.push(
            // 		new Paragraph({
            // 			style: "wellSpaced",
            // 			spacing: {
            // 				before: 0,
            // 				after: 0,
            // 			},
            // 			alignment: AlignmentType.JUSTIFIED,
            // 			indent: {
            // 				left: 710
            // 			},
            // 			children: [new TextRun({
            // 				text: "SKAJKSJAKJS",
            // 				font: {
            // 					name: "Arial",
            // 				},
            // 				size: 22,
            // 				color: "#000000",
            // 			})],
            // 		}))
            // }
          }
        },
      );
    }
    summaryTableRows.push(
      new TableRow({
        children: [
          new TableCell({
            width: {
              size: 2500,
              type: WidthType.DXA,
            },
            shading: {
              color: "EFEFEF",
              type: docx.ShadingType.SOLID,
            },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1, color: "D6D6D6" },
              bottom: { style: BorderStyle.SINGLE, size: 1, color: "D6D6D6" },
              left: { style: BorderStyle.SINGLE, size: 1, color: "D6D6D6" },
              right: { style: BorderStyle.NIL, size: 0, color: "FFFFFF" },
            },
            children: [
              new Paragraph({
                style: "wellSpaced",
                spacing: {
                  before: 0,
                  after: 0,
                },
                children: [
                  new TextRun({
                    text: "Pendapat Peserta",
                    font: {
                      name: "Arial",
                    },
                    bold: true,
                    size: 22,
                    color: "#000000",
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: {
              size: 7300,
              type: WidthType.DXA,
            },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1, color: "D6D6D6" },
              bottom: { style: BorderStyle.SINGLE, size: 1, color: "D6D6D6" },
              left: { style: BorderStyle.SINGLE, size: 1, color: "D6D6D6" },
              right: { style: BorderStyle.SINGLE, size: 1, color: "D6D6D6" },
            },
            children: attndOpinionRunner,
          }),
        ],
      }),
    );
    const summaryTable = new Table({
      columnWidths: [2500, 7300],
      rows: summaryTableRows,
      margins: {
        top: 100,
        right: 150,
        bottom: 100,
        left: 150,
      },
    });
    sectionChilds3.push(summaryTable);

    let logo_path = "";
    if (config.app_env === "production") {
      logo_path = path.join(
        config.paths.static,
        config.static.images,
        config.static.logo_filename,
      );
    } else {
      logo_path = path.join(
        config.paths.static,
        config.static.images,
        config.static.logo_filename,
      );
    }

    let doc = null;

    doc = new Document({
      creator: "MEETHA",
      title: title,
      styles: {
        paragraphStyles: [
          {
            id: "Heading1",
            name: "Heading 1",
            basedOn: "Normal",
            next: "Normal",
            quickFormat: true,
            run: {
              size: 32,
              bold: true,
              italics: true,
              color: "#000000",
            },
            paragraph: {
              spacing: {
                after: 120,
              },
            },
          },
          {
            id: "Heading2",
            name: "Heading 2",
            basedOn: "Normal",
            next: "Normal",
            quickFormat: true,
            run: {
              size: 30,
              bold: true,
              underline: {
                type: UnderlineType.DOUBLE,
                color: "FF0000",
              },
            },
            paragraph: {
              spacing: {
                before: 240,
                after: 120,
              },
            },
          },
          {
            id: "aside",
            name: "Aside",
            basedOn: "Normal",
            next: "Normal",
            run: {
              color: "999999",
              italics: true,
            },
            paragraph: {
              indent: {
                left: 720,
              },
              spacing: {
                line: 276,
              },
            },
          },
          {
            id: "wellSpaced",
            name: "Well Spaced",
            basedOn: "Normal",
            quickFormat: true,
            paragraph: {
              spacing: {
                line: 276,
                before: 20 * 72 * 0.1,
                after: 20 * 72 * 0.05,
              },
            },
          },
          {
            id: "ListParagraph",
            name: "List Paragraph",
            basedOn: "Normal",
            quickFormat: true,
          },
        ],
      },
      numbering: {
        config: [
          {
            reference: "my-crazy-numbering",
            levels: [
              {
                level: 0,
                format: "lowerLetter",
                text: "%1)",
                alignment: AlignmentType.JUSTIFIED,
              },
            ],
          },
        ],
      },
      sections: [
        {
          headers: {
            default: new Header({
              children: [
                new Table({
                  columnWidths: [4900, 4900],
                  rows: [
                    new TableRow({
                      children: [
                        new TableCell({
                          width: {
                            size: 4900,
                            type: WidthType.DXA,
                          },
                          borders: {
                            top: {
                              style: BorderStyle.NIL,
                              size: 0,
                              color: "FFFFFF",
                            },
                            bottom: {
                              style: BorderStyle.NIL,
                              size: 0,
                              color: "FFFFFF",
                            },
                            left: {
                              style: BorderStyle.NIL,
                              size: 0,
                              color: "FFFFFF",
                            },
                            right: {
                              style: BorderStyle.NIL,
                              size: 0,
                              color: "FFFFFF",
                            },
                          },
                          children: [
                            new Paragraph({
                              style: "wellSpaced",
                              spacing: {
                                before: 0,
                                after: 0,
                              },
                              alignment: AlignmentType.JUSTIFIED,
                              children: [
                                new TextRun({
                                  text: "Notulen Event: ",
                                  font: {
                                    name: "Arial",
                                  },
                                  size: 18,
                                  color: "#6b6b6b",
                                }),
                                new TextRun({
                                  text: event.description
                                    ? event.description
                                    : "",
                                  bold: true,
                                  font: {
                                    name: "Arial",
                                  },
                                  size: 18,
                                  color: "#6b6b6b",
                                }),
                              ],
                            }),
                            new Paragraph({
                              style: "wellSpaced",
                              spacing: {
                                before: 0,
                                after: 0,
                              },
                              alignment: AlignmentType.JUSTIFIED,
                              children: [
                                new TextRun({
                                  text: "Disimpan: ",
                                  font: {
                                    name: "Arial",
                                  },
                                  size: 18,
                                  color: "#6b6b6b",
                                }),
                                new TextRun({
                                  text: nowDate + " " + nowTime,
                                  bold: true,
                                  font: {
                                    name: "Arial",
                                  },
                                  size: 18,
                                  color: "#6b6b6b",
                                }),
                              ],
                            }),
                          ],
                        }),
                        new TableCell({
                          width: {
                            size: 4900,
                            type: WidthType.DXA,
                          },
                          borders: {
                            top: {
                              style: BorderStyle.NIL,
                              size: 0,
                              color: "FFFFFF",
                            },
                            bottom: {
                              style: BorderStyle.NIL,
                              size: 0,
                              color: "FFFFFF",
                            },
                            left: {
                              style: BorderStyle.NIL,
                              size: 0,
                              color: "FFFFFF",
                            },
                            right: {
                              style: BorderStyle.NIL,
                              size: 0,
                              color: "FFFFFF",
                            },
                          },
                          children: [
                            new Paragraph({
                              style: "wellSpaced",
                              spacing: {
                                before: 0,
                                after: 0,
                              },
                              alignment: AlignmentType.RIGHT,
                              children: [
                                new TextRun({
                                  text: "Otomasi Notulen Oleh",
                                  font: {
                                    name: "Arial",
                                  },
                                  size: 18,
                                  color: "#6b6b6b",
                                }),
                              ],
                            }),
                            new Paragraph({
                              style: "wellSpaced",
                              spacing: {
                                before: 0,
                                after: 0,
                              },
                              alignment: AlignmentType.RIGHT,
                              children: [
                                // new ImageRun({
                                // 	data: fs.readFileSync(logo_path),
                                // 	transformation: {
                                // 		width: 118,
                                // 		height: 27.63,
                                // 	},
                                // }),
                                new TextRun({
                                  text: "Meetha, meet-auto-mate",
                                  font: {
                                    name: "Arial",
                                  },
                                  size: 18,
                                  color: "#6b6b6b",
                                }),
                              ],
                            }),
                          ],
                        }),
                      ],
                    }),
                  ],
                  margins: {
                    top: 0,
                    right: 0,
                    bottom: 350,
                    left: 0,
                  },
                }),
              ],
            }),
          },
          children: sectionChilds3,
        },
      ],
    });
    // const b64string = await Packer.toBase64String(doc);
    // let buffer = Buffer.from(b64string, "base64");
    // await saveToUserServerDir(eventid, buffer, req);
    // res.setHeader(
    // 	"Content-Disposition",
    // 	"attachment; filename=NOTULEN_ACARA.docx"
    // );
    // res.send(buffer);

    const b64string = await Packer.toBase64String(doc);
    let buffer = Buffer.from(b64string, "base64");

    // await saveToUserServerDir(eventid, buffer, req);
    // res.setHeader(
    // 	"Content-Disposition",
    // 	"attachment; filename=NOTULEN_ACARA.docx"
    // );
    // res.send(buffer);

    if (format === "docx") {
      await saveToUserServerDir(eventid, buffer, req, "docx");

      res.setHeader(
        "Content-Disposition",
        "attachment; filename=NOTULEN_ACARA.docx",
      );
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      );
      res.send(buffer);
    } else if (format === "pdf") {
      // format === 'docx'

      // try {
      // 	// Save and convert to PDF using the modified function
      // 	const pdfPath = await saveToUserServerDir(eventid, buffer, req, 'pdf');

      // 	// Read the PDF file
      // 	const pdfBuffer = fs.readFileSync(pdfPath);

      // 	res.setHeader(
      // 		"Content-Disposition",
      // 		"attachment; filename=NOTULEN_ACARA.pdf"
      // 	);
      // 	res.setHeader("Content-Type", "application/pdf");
      // 	res.send(pdfBuffer);

      // } catch (error) {
      // 	console.error('PDF conversion error:', error);
      // 	throw error;
      // }
      console.error("Export error:", "PDF is not supported");
      res.status(500).send("PDF is not supported");
    }
  } catch (error) {
    console.error("Export error:", error);
    res.status(500).send("Error exporting document");
  }
};

const saveToUserServerDir = async function (
  event_id,
  buffer,
  req,
  format = "docx",
) {
  let eventDirectory = "";
  if (config.app_env === "production") {
    eventDirectory = config.paths.events;
  } else {
    eventDirectory = config.paths.events;
  }
  let today = moment(new Date()).format("yyyyMMDDHHmmss");
  let eventDir = path.join(eventDirectory, "event-" + event_id);

  // Create file paths for both formats
  let docxPath = path.join(
    eventDir,
    `meetha_generated_transcript_${event_id}_${today}.docx`,
  );
  let pdfPath = path.join(
    eventDir,
    `meetha_generated_transcript_${event_id}_${today}.pdf`,
  );

  // Create directory if it doesn't exist
  if (!fs.existsSync(eventDir)) {
    fs.mkdirSync(eventDir, { recursive: true });
  }

  // Write the initial DOCX file
  fs.writeFileSync(docxPath, buffer);

  // If PDF is requested, convert DOCX to PDF
  if (format === "docx") {
    // Update database with DOCX path
    await req
      .pool()
      .query("UPDATE event SET real_transcript_path = $1 WHERE id = $2", [
        docxPath,
        event_id,
      ]);
    return docxPath;
  } else {
    // await docx2pdf.convert(docxPath, pdfPath);
    // // Update database with PDF path
    // await req.pool().query(
    // 	"UPDATE event SET real_transcript_path = $1 WHERE id = $2",
    // 	[pdfPath, event_id]
    // );
    // return pdfPath;
    return null;
  }
};

const getTime = (datetime, format = "HH:mm:ss") => {
  if (datetime == null) {
    datetime = "0";
  }
  return moment(Number(datetime) * 1000)
    .utcOffset("+00000")
    .format(format);
};

// API Attendance - List attendances by Event

module.exports = {
  exportEventTranscripts,
  exportVideoTranscripts,
  exportTranscriptSubtitle,
  exportTranscriptToWord,
  saveToUserServerDir,
  getTime,
};
