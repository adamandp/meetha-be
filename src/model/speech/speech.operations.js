const axios = require("axios");
const fs = require("fs").promises;
const path = require("path");
const config = require("../../common/config/config.js");

// Guard concurrent clicks across API replicas using the existing PostgreSQL connection.
const handler = (check) => async (req, res) => {
  const eventId = Number(req.params.eventId);
  const version =
    req.query.version === undefined ? undefined : Number(req.query.version);
  if (
    !Number.isSafeInteger(eventId) ||
    eventId < 1 ||
    eventId > 2147483647 ||
    (version !== undefined && (!Number.isSafeInteger(version) || version < 1))
  ) {
    return res
      .status(400)
      .json({ message: "ID event atau versi tidak valid." });
  }
  const { rows } = await req
    .pool()
    .query(
      "SELECT id, language FROM event WHERE id = $1 AND ($2::boolean OR datausername = $3)",
      [eventId, String(req.user.roleId) === "1", req.user.username],
    );
  if (!rows.length)
    return res.status(404).json({ message: "Event tidak ditemukan." });
  const baseURL = (config.services.llm.api || "").replace(/\/+$/, "");
  if (!baseURL)
    return res.status(503).json({ message: "LLM_SERVER belum dikonfigurasi." });
  let client;
  let locked = false;
  try {
    if (!check) {
      const response = await axios.get(
        `${baseURL}/inappropriate-speech/${eventId}`,
        {
          params: { version },
          timeout: 30000,
        },
      );
      return res.json(response.data);
    }
    client = await req.pool().connect();
    const lock = await client.query(
      "SELECT pg_try_advisory_lock(72631, $1) AS locked",
      [eventId],
    );
    locked = lock.rows[0].locked;
    if (!locked)
      return res
        .status(409)
        .json({ message: "Pemeriksaan event ini sedang berlangsung." });
    const transcripts = await client.query(
      "SELECT attendance, start, transcript FROM event_transcript WHERE event_id = $1 ORDER BY seq, start, id",
      [eventId],
    );
    const entries = transcripts.rows.map((row) => ({
      speaker: row.attendance || "Pembicara",
      second: Number(row.start),
      text: String(row.transcript || ""),
    }));
    if (!entries.length || entries.every((entry) => !entry.text.trim())) {
      return res.status(422).json({ message: "Transkrip belum tersedia." });
    }
    if (
      entries.some(
        (entry) => !Number.isFinite(entry.second) || entry.second < 0,
      )
    ) {
      return res
        .status(422)
        .json({ message: "Waktu pada transkrip tidak valid." });
    }
    const directory = config.paths.summary;
    const filename = `inappropriate_${eventId}.txt`;
    await fs.mkdir(directory, { recursive: true });
    await fs.writeFile(
      path.join(directory, filename),
      JSON.stringify(entries),
      "utf8",
    );
    const response = await axios.post(
      `${baseURL}/inappropriate-speech`,
      {
        event_id: eventId,
        path: `meetha/summary/${filename}`,
        lang: rows[0].language || "id-ID",
      },
      { timeout: 600000 },
    );
    return res.json(response.data);
  } catch (error) {
    const status = error.response && error.response.status;
    if (!check && status === 404)
      return res
        .status(404)
        .json({ code: "NOT_CHECKED", message: "Belum diperiksa." });
    if (check && status === 404)
      return res
        .status(422)
        .json({
          message:
            "File transkrip tidak ditemukan oleh AI. Periksa mount folder summary.",
        });
    if (status === 422 || status === 400)
      return res
        .status(422)
        .json({
          message:
            "File transkrip belum bisa diperiksa. Periksa isi dan mount folder summary di AI.",
        });
    return res.status(error.code === "ECONNABORTED" ? 504 : 502).json({
      message:
        error.code === "ECONNABORTED"
          ? "Batas waktu terlewati. Muat ulang hasil sebelum mencoba pemeriksaan lagi."
          : "Layanan AI belum dapat dihubungi. Muat ulang hasil sebelum mencoba lagi.",
    });
  } finally {
    if (client) {
      try {
        if (locked)
          await client.query("SELECT pg_advisory_unlock(72631, $1)", [eventId]);
      } catch (unlockError) {
        // Discard this connection so a failed unlock cannot leave a session lock in the pool.
        client.release(unlockError);
        client = null;
      } finally {
        if (client) client.release();
      }
    }
  }
};
module.exports = { get: handler(false), check: handler(true) };
