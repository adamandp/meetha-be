const httpStatus = require("../../utils/http-status.js");

const ApiError = require("../../exceptions/api-error");
const userService = require("./user.repository");
const getUsers = async (req, res) => {
  const users = await userService.getUsers(req);
  res.send({ users });
};
const getUser = async (req, res) => {
  const user = await userService.getUserById(req.params.userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }
  delete user.password;
  res.send({ user });
};
const deleteUser = async (req, res) => {
  await userService.deleteUserById(req.body.id);
  res.send({ success: true });
};
const updateUser = async (req, res) => {
  const user = await userService.updateUser(req);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }
  delete user.password;
  res.send({ user });
};
module.exports = {
  getUsers,
  getUser,
  updateUser,
  deleteUser,
};
