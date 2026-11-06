const moment = require("moment");

const getSettings = async function (req, res) {
  let q = "SELECT * from settings where 1=1 and status = 1 order by id asc";

  req.pool().query(q, [], function (err, qres) {
    // console.log(err)
    res.send({
      success: true,
      message: "Success",
      data: qres ? qres.rows : [],
    });
  });
};

const updateSettings = async function (req, res) {
  if (!req.body) {
    res.send({ success: false, message: "Request cannot be processed" });
    return;
  }
  let userid = req.body.userid ? req.body.userid : null;
  let audioPlayback =
    req.body.audioPlayback || req.body.audioPlayback == 0
      ? req.body.audioPlayback
      : null;

  if (audioPlayback) {
    var now = moment(new Date()).format("yyyy-MM-DD HH:mm:ss");
    await req
      .pool()
      .query(
        "update settings set settings_value = $1, updatedon = $2, updatedby = $3 where settings_key = 'audioPlayback'",
        [audioPlayback, now, userid],
      );
  }

  res.send({ success: true, message: "Success" });
};

module.exports = { getSettings, updateSettings };
