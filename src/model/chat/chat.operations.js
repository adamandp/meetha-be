const console = require("../../common/app-logger/console.js");

const axios = require("axios");
const config = require("../../common/config/config.js");

const moment = require("moment");
const fs = require("fs");
const path = require("path");

const uploadfiletobot = async function (req, res) {
  const assignApiUrl = `${config.services.llm.api}${config.services.llm.assign_endpoint}`;
  const deleteApiUrl = `${config.services.llm.api}${config.services.llm.delete_endpoint}`;
  if (
    !req.query.event_id ||
    req.query.event_id == undefined ||
    req.query.event_id == null ||
    req.query.event_id == "null" ||
    req.query.event_id == ""
  ) {
    res.send({ success: false, message: "Event ID is Required" });
    return;
  } else {
    req
      .pool()
      .query(
        "select id, chatbot_uuid, real_transcript_path, long_summary from event WHERE id = $1",
        [req.query.event_id],
        async function (err, qres) {
          if (err) {
            res.send({
              success: false,
              message: "Error! Query tidak dapat dijalankan",
            });
            return;
          }
          if (
            !qres ||
            !qres.rows ||
            qres.rows.length == 0 ||
            !qres.rows[0].long_summary
          ) {
            res.send({ success: false, message: "Event not found" });
            return;
          } else {
            let chatbot_uuid = qres.rows[0].chatbot_uuid;
            let summaryPath = "";
            if (config.app_env === "production") {
              summaryPath = config.paths.summary;
            } else {
              summaryPath = config.paths.summary;
            }
            let filename = "summary_" + req.query.event_id + ".txt";
            if (chatbot_uuid) {
              let deleteResponse = await axios.get(
                deleteApiUrl + "?uuid=" + chatbot_uuid + "&path=" + filename,
              );
            }
            const options = {
              url: assignApiUrl + "?path=" + "meetha/summary/" + filename,
              method: "GET",
              headers: { "content-type": "multipart/form-data" },
            };
            axios(options)
              .then(function (response) {
                if (response && response.data && response.data.uuid) {
                  req
                    .pool()
                    .query(
                      "UPDATE event SET chatbot_uuid = $1 WHERE id = $2 ",
                      [response.data.uuid, req.query.event_id],
                      function (err) {
                        if (err) {
                          // console.log(err);
                        } else {
                        }
                      },
                    );
                  res.send({
                    success: true,
                    message: "Success! Your generated chat bot",
                    data: response.data.uuid,
                  });
                } else {
                  res
                    .status(401)
                    .send({
                      success: false,
                      message: "Failed to connect with chatbot",
                    });
                }
              })
              .catch((error) => {
                console.error("Error:", error);
                res.status(401).send({ success: false, message: "Error!" });
                return;
              });
          }
        },
      );
  }
};

const generateEventSummary = async function (req, res) {
  let now = moment(new Date()).format("yyyy-MM-DD HH:mm:ss.SSS");
  let nowcct = moment(new Date()).format("yyyyMMDDHHmmssSSS");
  if (
    !req.body.username ||
    req.body.username == undefined ||
    req.body.username == null ||
    req.body.username == "null" ||
    req.body.username == ""
  ) {
    res.send({ success: false, message: "User ID is Required" });
    return;
  }
  if (
    !req.body.event_id ||
    req.body.event_id == undefined ||
    req.body.event_id == null ||
    req.body.event_id == "null" ||
    req.body.event_id == ""
  ) {
    res.send({ success: false, message: "Event ID is Required" });
    return;
  } else {
    let trText = "";
    let q =
      "SELECT * FROM event_transcript where event_id = " +
      req.body.event_id +
      " order by seq, start, id";
    req.pool().query(q, function (failed, qres) {
      if (failed) {
        res.send({ success: false, message: failed.message });
        return;
      }
      let transcripts = qres.rows;
      let trJSON = [];
      if (transcripts && transcripts.length > 0) {
        for (let i = 0; i < transcripts.length; i++) {
          let txt = transcripts[i].transcript
            .replaceAll('"', "")
            .replaceAll("\n", "")
            .replaceAll("\r", "");
          trJSON.push({
            speaker: transcripts[i].attendance,
            second: transcripts[i].start,
            text: txt,
          });
        }
      }
      trText = JSON.stringify(trJSON);
      let summaryPath = "";
      if (config.app_env === "production") {
        summaryPath = config.paths.summary;
      } else {
        summaryPath = config.paths.summary;
      }
      let filename = "summary_" + req.body.event_id + ".txt";
      let filePath = path.join(summaryPath, filename);
      if (filePath && fs.existsSync(filePath)) {
        fs.rmSync(filePath, { recursive: true, force: true });
        // console.log("Removed: ", filePath)
      }
      var stream = fs.createWriteStream(filePath);
      stream.write(trText);
      const summaryApiUrl = `${config.services.llm.api}${config.services.llm.summary_endpoint}`;
      stream.on("close", () => {
        axios
          .post(summaryApiUrl, {
            path: "meetha/summary/" + filename,
            lang: req.body.lang,
          })
          .then(async function (response) {
            req
              .pool()
              .query("UPDATE event SET long_summary = $1 WHERE id = $2 ", [
                JSON.stringify(response.data),
                req.body.event_id,
              ]);
            await req
              .pool()
              .query(
                "insert into log_summary ( event_id, long_summary, created_by, created_on, updated_by, updated_on ) VALUES ($1, $2, $3, $4, $5, $6) ",
                [
                  req.body.event_id,
                  JSON.stringify(response.data),
                  req.body.username,
                  now,
                  req.body.username,
                  now,
                ],
              );
            let result = {
              text: trText,
              summary: response.data,
            };

            res.send({
              success: true,
              message: "Success! Your summary success generated",
              data: result,
            });
          })
          .catch((error) => {
            console.error("Error:", error);
            res.send({ success: false, message: error.message });
          });
      });
      stream.end();
    });
  }
};
const generateArticle = async function (req, res) {
  const generateArticleApiURL = `${config.services.llm.api}${config.services.llm.create_article_endpoint}`;
  if (
    !req.body.event_id ||
    req.body.event_id == undefined ||
    req.body.event_id == null ||
    req.body.event_id == "null" ||
    req.body.event_id == ""
  ) {
    res.send({ success: false, message: "Event ID is Required" });
    return;
  } else {
    req
      .pool()
      .query(
        "select id, generated_contents, real_transcript_path, long_summary from event WHERE id = $1",
        [req.body.event_id],
        async function (err, qres) {
          if (err) {
            res.send({
              success: false,
              message: "Error! Query tidak dapat dijalankan",
            });
            return;
          }
          if (
            !qres ||
            !qres.rows ||
            qres.rows.length == 0 ||
            !qres.rows[0].long_summary
          ) {
            res.send({ success: false, message: "Event not found" });
            return;
          } else {
            let generated_contents_str = qres.rows[0].generated_contents;
            let generated_contents = generated_contents_str
              ? JSON.parse(generated_contents_str)
              : [];
            let summaryPath = "";
            if (config.app_env === "production") {
              summaryPath = config.paths.summary;
            } else {
              summaryPath = config.paths.summary;
            }
            let filename = "summary_" + req.body.event_id + ".txt";
            let data = {
              path: "meetha/summary/" + filename,
              lang: req.body.lang || "id-ID",
              source: req.body.source || undefined,
              tone: req.body.tone || "Human Interest",
              seo: req.body.seo || [],
              num_words: req.body.num_words || 200,
              headline: req.body.headline || undefined,
              additonal_context: req.body.additonal_context || undefined,
            };
            const options = {
              url:
                generateArticleApiURL + "?path=" + "meetha/summary/" + filename,
              method: "POST",
              headers: { "content-type": "application/json" },
              data: data,
            };
            axios(options)
              .then(function (response) {
                if (
                  response.data &&
                  response.data.article_id &&
                  response.data.article
                ) {
                  let dbData = {
                    content_id: response.data.article_id,
                    title: extractHeadline(response.data.article) || "Untitled",
                  };
                  let respData = {
                    content_id: response.data.article_id,
                    text: response.data.article,
                    title: extractHeadline(response.data.article) || "Untitled",
                  };
                  generated_contents.push(dbData);
                  req
                    .pool()
                    .query(
                      "UPDATE event SET generated_contents = $1 WHERE id = $2 ",
                      [JSON.stringify(generated_contents), req.body.event_id],
                      function (err) {
                        if (err) {
                          // console.log(err);
                        } else {
                        }
                      },
                    );

                  res.send({
                    success: true,
                    message: "Success! Your article success generated",
                    data: respData,
                  });
                } else if (response.data.message) {
                  res
                    .status(401)
                    .send({ success: false, message: response.data.message });
                } else {
                  res
                    .status(401)
                    .send({
                      success: false,
                      message: "Failed to connect with article engine",
                    });
                }
              })
              .catch((error) => {
                console.error("Error:", error);
                res.status(401).send({ success: false, message: "Error!" });
                return;
              });
          }
        },
      );
  }
};
function extractHeadline(text) {
  let headlineStart = text.indexOf("Headline:");
  if (headlineStart === -1) {
    headlineStart = text.indexOf("HEADLINE:");
  }

  if (headlineStart !== -1) {
    const periodPosition = text.indexOf(".", headlineStart);
    const newlinePosition = text.indexOf("\\n", headlineStart);
    const starPosition = text.indexOf("**", headlineStart);

    const endPosition =
      periodPosition !== -1 && newlinePosition !== -1 && starPosition !== -1
        ? Math.min(periodPosition, Math.min(newlinePosition, starPosition))
        : periodPosition !== -1
          ? periodPosition
          : newlinePosition !== -1
            ? newlinePosition
            : starPosition;

    if (endPosition !== -1) {
      return text.slice(headlineStart + 9, endPosition).trim();
    }
  }

  return "";
}
const getGeneratedArticle = async function (req, res) {
  const getGeneratedArticleApiURL = `${config.services.llm.api}${config.services.llm.get_article_endpoint}`;

  if (req.query.id) {
    axios
      .get(getGeneratedArticleApiURL + req.query.id)
      .then(async (response) => {
        if (
          response.data &&
          response.data.article_id &&
          response.data.article
        ) {
          let respData = {
            content_id: response.data.article_id,
            text: response.data.article,
            title: extractHeadline(response.data.article) || "Untitled",
          };
          res.send({
            success: true,
            message: "Success! Your article success fetched",
            data: respData,
          });
        } else if (response.data.message) {
          res
            .status(401)
            .send({ success: false, message: response.data.message });
        } else {
          res
            .status(401)
            .send({
              success: false,
              message: "Failed to connect with article engine",
            });
        }
      })
      .catch((error) => {
        res.send({
          success: false,
          message: "Failed to connect with article engine",
        });
      });
  } else {
    res.send({ success: false, message: "ID is Required" });
    return;
  }
};
const directanswarequestion = async function (req, res) {
  const apiUrl = `${config.services.llm.api}${config.services.llm.chat_endpoint}`;
  const question = {
    uuid: req.body.chatbot_uuid,
    query: req.body.question,
  };
  axios
    .post(apiUrl, question)
    .then((response) => {
      let answare = response.data;

      res.send({
        success: true,
        message: "Success! Your generated chat bot",
        data: answare,
      });
    })
    .catch((error) => {
      console.error("Error:", error);
      res.send({
        success: false,
        message: "Something went wrong, please try again",
      });
    });
};

module.exports = {
  uploadfiletobot,
  generateEventSummary,
  generateArticle,
  extractHeadline,
  getGeneratedArticle,
  directanswarequestion,
};
