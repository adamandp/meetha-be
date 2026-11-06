const moment = require("moment");

const attendanceCreate = async (req, res) => {
  let reqdata = {
    nama: req.body.nama,
    nip: req.body.nip,
    jabatan: req.body.jabatan,
    tempat_lahir: req.body.tempat_lahir,
    tanggal_lahir: req.body.tanggal_lahir,
    jenis_kelamin: req.body.jenis_kelamin,
    kewarganegaraan: req.body.kewarganegaraan,
    agama: req.body.agama,
    alamat: req.body.alamat,
    pekerjaan: req.body.pekerjaan,
    pendidikan: req.body.pendidikan,
    username: req.body.username,
  };
  if (!reqdata.ref_event_number && req.body.event_number) {
    reqdata.ref_event_number = req.body.event_number;
  }

  var now = moment(new Date()).format("yyyy-MM-DD HH:mm:ss");
  req
    .pool()
    .query(
      "INSERT INTO attendance (nama, nip, jabatan, tempat_lahir, tanggal_lahir, jenis_kelamin, kewarganegaraan, agama, alamat, pekerjaan, pendidikan, createdon, updatedon, createdby, updatedby) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)",
      [
        reqdata.nama,
        reqdata.nip,
        reqdata.jabatan,
        reqdata.tempat_lahir,
        reqdata.tanggal_lahir,
        reqdata.jenis_kelamin,
        reqdata.kewarganegaraan,
        reqdata.agama,
        reqdata.alamat,
        reqdata.pekerjaan,
        reqdata.pendidikan,
        now,
        now,
        reqdata.username,
        reqdata.username,
      ],
      function (err) {
        if (err) {
          res.send({ success: false, message: err.message });
        } else {
          res.send({ success: true, message: "Success", data: reqdata });
        }
      },
    );
};

const attendanceUpdate = async function (req, res) {
  let attendanceId = req.body.id ? req.body.id : null;
  let nama = req.body.nama || req.body.nama == 0 ? req.body.nama : null;
  let nip = req.body.nip || req.body.nip == 0 ? req.body.nip : null;
  let jabatan =
    req.body.jabatan || req.body.jabatan == 0 ? req.body.jabatan : null;
  let tempat_lahir =
    req.body.tempat_lahir || req.body.tempat_lahir == 0
      ? req.body.tempat_lahir
      : null;
  let tanggal_lahir =
    req.body.tanggal_lahir || req.body.tanggal_lahir == 0
      ? req.body.tanggal_lahir
      : null;
  let jenis_kelamin =
    req.body.jenis_kelamin || req.body.jenis_kelamin == 0
      ? req.body.jenis_kelamin
      : null;
  let kewarganegaraan =
    req.body.kewarganegaraan || req.body.kewarganegaraan == 0
      ? req.body.kewarganegaraan
      : null;
  let agama = req.body.agama || req.body.agama == 0 ? req.body.agama : null;
  let alamat = req.body.alamat || req.body.alamat == 0 ? req.body.alamat : null;
  let pekerjaan =
    req.body.pekerjaan || req.body.pekerjaan == 0 ? req.body.pekerjaan : null;
  let pendidikan =
    req.body.pendidikan || req.body.pendidikan == 0
      ? req.body.pendidikan
      : null;
  let username =
    req.body.username || req.body.username == 0 ? req.body.username : null;
  if (attendanceId != null) {
    if (
      nama != null ||
      nip != null ||
      jabatan != null ||
      tempat_lahir != null ||
      tanggal_lahir != null ||
      jenis_kelamin != null ||
      kewarganegaraan != null ||
      agama != null ||
      alamat != null ||
      pekerjaan != null ||
      pendidikan != null
    ) {
      let q = "update attendance set ";
      let qIdx = 1;
      let param = [];
      if (nama != null) {
        q += " nama = $" + qIdx + " ,";
        param.push(nama);
        qIdx++;
      }
      if (nip != null) {
        q += " nip = $" + qIdx + " ,";
        param.push(nip);
        qIdx++;
      }
      if (jabatan != null) {
        q += " jabatan = $" + qIdx + " ,";
        param.push(jabatan);
        qIdx++;
      }
      if (tempat_lahir != null) {
        q += " tempat_lahir = $" + qIdx + " ,";
        param.push(tempat_lahir);
        qIdx++;
      }
      if (tanggal_lahir != null) {
        q += " tanggal_lahir = $" + qIdx + " ,";
        param.push(tanggal_lahir);
        qIdx++;
      }
      if (jenis_kelamin != null) {
        q += " jenis_kelamin = $" + qIdx + " ,";
        param.push(jenis_kelamin);
        qIdx++;
      }
      if (kewarganegaraan != null) {
        q += " kewarganegaraan = $" + qIdx + " ,";
        param.push(kewarganegaraan);
        qIdx++;
      }
      if (agama != null) {
        q += " agama = $" + qIdx + " ,";
        param.push(agama);
        qIdx++;
      }
      if (alamat != null) {
        q += " alamat = $" + qIdx + " ,";
        param.push(alamat);
        qIdx++;
      }
      if (pekerjaan != null) {
        q += " pekerjaan = $" + qIdx + " ,";
        param.push(pekerjaan);
        qIdx++;
      }
      if (pendidikan != null) {
        q += " pendidikan = $" + qIdx + " ,";
        param.push(pendidikan);
        qIdx++;
      }
      if (username != null) {
        q += " updatedby = $" + qIdx + " ,";
        param.push(username);
        qIdx++;
      }
      q = q + " updatedon = $" + qIdx + " ";
      qIdx++;
      q = q + " where id = $" + qIdx + " ";
      qIdx++;
      var now = moment(new Date()).format("yyyy-MM-DD HH:mm:ss");
      param.push(now, attendanceId);

      req.pool().query(q, param, function (errUpdate) {
        if (errUpdate) {
          res.send({ success: false, message: "Failed" });

          return;
        }
        let q = "SELECT * from attendance e where 1=1 and deletedon IS NULL";
        q += " and e.id = " + attendanceId;
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
      message: "ID are Required",
      data: req.body,
    });
  }
};

const attendanceDelete = async function (req, res) {
  let attendanceId = req.body.id ? req.body.id : null;
  if (attendanceId != null) {
    let q = "update attendance set deletedon = $1, deletedby = $2, ";
    let param = [];
    q = q + " updatedon = $3 ";
    q = q + " where id = $4 ";
    var now = moment(new Date()).format("yyyy-MM-DD HH:mm:ss");
    param.push(now, req.body.username, now, attendanceId);
    req.pool().query(q, param, function (errUpdate) {
      if (errUpdate) {
        res.send({ success: false, message: "Failed" });
        return;
      }
      let q = "SELECT * from attendance e where 1=1";
      q += " and e.id = " + attendanceId;
      req.pool().query(q, function (err2, qres) {
        res.send({
          success: true,
          message: "Success",
          data: qres ? qres.rows : [][0],
        });
      });
    });
  } else {
    return res.send({
      success: false,
      message: "ID are Required",
      data: req.body,
    });
  }
};

const editAttendance = async function (req, res) {
  if (
    !req.body.attendance_id ||
    req.body.attendance_id == undefined ||
    req.body.attendance_id == null ||
    req.body.attendance_id == "null" ||
    req.body.attendance_id == ""
  ) {
    res.send({ success: false, message: "Attendance ID is Required" });
  } else {
    req
      .pool()
      .query(
        "UPDATE event_transcript set attendance = $1 where attendance_id = $2 ",
        [req.body.attendanceNew, req.body.attendance_id],
        function (err) {
          if (err) {
            res.send({ success: false, message: err.message });
          } else {
            req
              .pool()
              .query(
                "UPDATE event_attendance set name = $1 where id = $2 ",
                [req.body.attendanceNew, req.body.attendance_id],
                function (err) {
                  if (err) {
                    res.send({ success: false, message: err.message });
                  } else {
                    res.send({
                      success: true,
                      message: "success edit transcript",
                    });
                  }
                },
              );
          }
        },
      );
  }
};
const attendances = async function (req, res) {
  let eventId = req.query.eventId ? req.query.eventId : null;

  let q =
    "SELECT id, event_id, name, description FROM event_attendance where 1=1";
  if (eventId != null) {
    q += " and event_id = " + eventId;
    req.pool().query(q, function (err, qres) {
      res.send({
        success: true,
        message: "Success",
        data: qres ? qres.rows : [],
      });
    });
  } else {
    return res.send({
      success: false,
      message: "Event ID is Required",
      data: [],
    });
  }
};

module.exports = {
  attendanceCreate,
  attendanceUpdate,
  attendanceDelete,
  editAttendance,
  attendances,
};
