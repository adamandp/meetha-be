const { encryptData } = require("../../common/auth/token");
const ApiError = require("../../exceptions/api-error");
let prisma;
exports.configure = (client) => {
  prisma = client;
};
const flatten = async (user) => {
  if (!user) return null;
  const role = await prisma.role.findUnique({
    where: { id: Number(user.role_id) },
  });
  return {
    ...user,
    ...(user.satker_id !== undefined
      ? { satker_id: user.satker_id === null ? null : Number(user.satker_id) }
      : {}),
    role_id: Number(user.role_id),
    "role.id": role?.id ?? null,
    "role.name": role?.name ?? null,
  };
};
exports.getUserByEmail = async (email) =>
  flatten(await prisma.user.findFirst({ where: { email } }));
exports.getUserByUsername = async (username) =>
  username === undefined
    ? null
    : flatten(await prisma.user.findFirst({ where: { username } }));
exports.getUserById = async (id) =>
  flatten(await prisma.user.findUnique({ where: { id: Number(id) } }));
exports.createUser = async (data) => {
  if (await exports.getUserByEmail(data.email))
    throw new ApiError(409, "This email already exits");
  if (!(await prisma.role.findUnique({ where: { id: Number(data.roleId) } })))
    throw new ApiError(404, "Role not found");
  const created = await prisma.user.create({
    data: {
      fullname: data.fullname,
      email: data.email,
      username: data.username,
      user_uuid: data.user_uuid,
      role_id: Number(data.roleId),
      password: await encryptData(data.password),
      status: 1,
      createdby: data.username,
      updatedby: data.username,
    },
  });
  return {
    ...created,
    role_id: Number(created.role_id),
    satker_id: created.satker_id === null ? null : Number(created.satker_id),
  };
};
exports.getUsers = async (req) => {
  const { page = 1, limit = 10, ufa = false } = req.query;
  const where = ufa ? {} : { role_id: { not: 1 } };
  const [count, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
      orderBy: [
        { fullname: "asc" },
        { createdon: "desc" },
        { updatedon: "desc" },
      ],
      select: {
        id: true,
        role_id: true,
        fullname: true,
        username: true,
        email: true,
        createdon: true,
        updatedon: true,
      },
    }),
  ]);
  const rows = await Promise.all(
    users.map(async (user) => {
      const result = await flatten(user);
      delete result.role_id;
      return result;
    }),
  );
  return { count, rows };
};
exports.deleteUserById = async (id) => {
  const result = await prisma.user.deleteMany({ where: { id: Number(id) } });
  if (!result.count) throw new ApiError(404, "User not found");
  return result.count;
};
exports.updateUser = async (req) => {
  const fields = [
    "fullname",
    "username",
    "email",
    "password",
    "role_id",
    "satker_id",
    "user_uuid",
    "status",
    "createdby",
    "updatedby",
    "createdon",
    "updatedon",
  ];
  const data = Object.fromEntries(
    Object.entries(req.body).filter(([key]) => fields.includes(key)),
  );
  if (data.password) data.password = await encryptData(data.password);
  if (data.email && (await exports.getUserByEmail(data.email)))
    throw new ApiError(409, "This email is already exist");
  const id = Number(req.params.userId || req.body.id);
  if (!(await prisma.user.findUnique({ where: { id } }))) return null;
  const updated = await prisma.user.update({ where: { id }, data });
  return {
    ...updated,
    role_id: Number(updated.role_id),
    satker_id: updated.satker_id === null ? null : Number(updated.satker_id),
  };
};
