const parseEventId = (value) => {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
};

const isAdmin = (user) => Number(user?.roleId) === 1;

const getEventAccess = async (req, value) => {
  const id = parseEventId(value);
  if (id === null)
    return { ok: false, status: 400, message: "Invalid event ID" };
  if (!isAdmin(req.user) && !req.user?.username)
    return { ok: false, status: 403, message: "Event access denied" };

  const params = isAdmin(req.user) ? [id] : [id, req.user.username];
  const condition = isAdmin(req.user) ? "" : " AND datausername = $2";
  const { rows } = await req
    .pool()
    .query(
      `SELECT id, uploading, import_message FROM event WHERE id = $1${condition} LIMIT 1`,
      params,
    );
  if (!rows?.length)
    return { ok: false, status: 404, message: "Event not found" };
  return {
    ok: true,
    id,
    uploading: rows[0].uploading,
    importMessage: rows[0].import_message,
  };
};

const rejectEventAccess = (res, access) => {
  res.status(access.status).send({ success: false, message: access.message });
};

module.exports = { parseEventId, isAdmin, getEventAccess, rejectEventAccess };
