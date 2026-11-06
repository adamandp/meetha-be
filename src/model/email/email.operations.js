const email = require("../../common/email/email.js");

const shareMoMEmail = async function (req, res) {
  let eventId = req.body.id;
  let toEmail = req.body.toEmail;
  let senderEmail = req.body.senderEmail;
  let senderName = req.body.senderName;
  if (eventId != null) {
    let q =
      "SELECT e.* , NULL::interval as processing_time from event e where 1=1";
    q += " and e.id = " + eventId;

    req.pool().query(q, function (err, qres) {
      let event = qres && qres.rows ? qres.rows[0] : null;
      if (event) {
        let success = email.shareMoMEmail(
          event,
          toEmail,
          senderEmail,
          senderName,
        );
        if (success) {
          res.send({ success: true, message: "Success" });
        } else {
          return res.send({ success: false, message: "Unknown Error" });
        }
      } else {
        return res.send({
          success: false,
          message: "Event not Found",
          data: [],
        });
      }
    });
  } else {
    return res.send({ success: false, message: "ID is Required", data: [] });
  }
};

module.exports = { shareMoMEmail };
