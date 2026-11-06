const httpStatus = require("../../utils/http-status.js");
const ApiError = require("../../exceptions/api-error");

const roleService = require("./role.repository");
const createRole = async (req, res) => {
  const role = await roleService.createRole(req);
  res.send({ role });
};
const getRoles = async (req, res) => {
  const roles = await roleService.getRoles(req);
  res.send({ roles });
};
const getRole = async (req, res) => {
  const role = await roleService.getRoleById(req.params.roleId);
  if (!role) {
    throw new ApiError(httpStatus.NOT_FOUND, "Role not found");
  }
  res.send({ role });
};
const deleteRole = async (req, res) => {
  await roleService.deleteRoleById(req);
  res.send({ success: true });
};
const updateRole = async (req, res) => {
  const role = await roleService.updateRole(req);
  res.send({ role });
};
module.exports = {
  createRole,
  getRoles,
  getRole,
  updateRole,
  deleteRole,
};
