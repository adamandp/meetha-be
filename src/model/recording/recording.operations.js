const console = require("../../common/app-logger/console.js");
const ffmpeg = require("fluent-ffmpeg");

const fs = require("fs");

const streamLocalAudio = async (req, res) => {
  const filePath = req.query.audio_file_path;

  fs.stat(filePath, (err, stats) => {
    if (err) {
      console.error(err);
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("File not found");
      return;
    }
    const range = req.headers.range ? req.headers.range : 0;
    const fileSize = stats.size;
    const chunkSize = 1024 * 1024;
    const start = 0; //Number(range.replace(/\D/g, ""));
    const end = Math.min(start + chunkSize, fileSize - 1);
    const headers = {
      "Content-Type": "video/mp4",
      "Content-Length": end - start,
      "Content-Range": "bytes " + start + "-" + end + "/" + fileSize,
      "Accept-Ranges": "bytes",
    };
    res.writeHead(206, headers);
    const fileStream = fs.createReadStream(filePath, { start, end });
    const ffmpegStream = ffmpeg(fileStream)
      .noAudio()
      .videoCodec("libx264")
      .format("mp3")
      .outputOptions("-movflags frag_keyframe+empty_moov")
      .on("end", () => {})
      .on("error", (err) => {
        console.error(err);
      });
    ffmpegStream.pipe(res);
  });
};
const downloadLocalAudio = async (req, res) => {
  const filePath = req.query.audio_file_path;
  // console.log(filePath)
  res.download(filePath);
};

module.exports = { streamLocalAudio, downloadLocalAudio };
