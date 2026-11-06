const httpStatus = require("../../utils/http-status.js");
const userService = require("../user/user.repository.js");
const ApiError = require("../../exceptions/api-error.js");
const { decryptData } = require("../../common/auth/token.js");
async function loginUserWithEmailAndPassword(req) {
  const { email, password } = req.body;
  const user = await userService.getUserByEmail(email);
  const isPasswordMatch = await decryptData(password, user.password);
  if (!user || !isPasswordMatch) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "Invalid email or password");
  }
  delete user.password;
  return user;
}
async function loginUserWithUsernameAndPassword(req) {
  const { username, password } = req.body;
  const user = await userService.getUserByUsername(username);
  if (!user) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "Invalid username");
  } else {
    const isPasswordMatch = await decryptData(
      password,
      user ? user.password : null,
    );
    if (!isPasswordMatch) {
      throw new ApiError(httpStatus.UNAUTHORIZED, "Invalid password");
    }
  }
  delete user.password;
  return user;
}
module.exports = {
  loginUserWithEmailAndPassword,
  loginUserWithUsernameAndPassword,
};
