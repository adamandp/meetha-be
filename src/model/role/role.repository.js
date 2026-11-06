const ApiError = require("../../exceptions/api-error");
let prisma;
exports.configure = (client) => {
  prisma = client;
};
exports.getRoleById = (id) =>
  prisma.role.findUnique({ where: { id: Number(id) } });
exports.getRoles = async (req) => {
  const { page = 1, limit = 10 } = req.query;
  const [count, rows] = await Promise.all([
    prisma.role.count(),
    prisma.role.findMany({
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
      orderBy: [{ name: "asc" }, { createdon: "desc" }, { updatedon: "desc" }],
    }),
  ]);
  return { count, rows };
};
exports.createRole = async (req) => {
  const { name, description = "" } = req.body;
  if (await prisma.role.findFirst({ where: { name } }))
    throw new ApiError(409, "This role already exits");
  return prisma.role.create({
    data: {
      name,
      description,
      priority: 0,
      event_role: 0,
      status: 1,
      createdby: req.user.username,
      updatedby: req.user.username,
    },
  });
};
exports.updateRole = (req) =>
  prisma.role.update({
    where: { id: Number(req.params.roleId) },
    data: req.body,
  });
exports.deleteRoleById = async (req) => {
  const result = await prisma.role.deleteMany({
    where: { id: Number(req.params.roleId) },
  });
  if (!result.count) throw new ApiError(404, "Role not found");
  return result.count;
};
