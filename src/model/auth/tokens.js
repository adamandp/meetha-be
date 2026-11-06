const httpStatus = require("../../utils/http-status.js");
const config = require("../../common/config/config.js");
const userService = require("../user/user.repository.js");
const ApiError = require("../../exceptions/api-error.js");
const {
  generateToken,
  generateExpires,
} = require("../../common/auth/token.js");
async function generateResetPasswordToken(email) {
  const user = await userService.getUserByEmail(email);
  if (!user || !user.id) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found with this email");
  }
  const expiresMs = generateExpires(
    config.jwt.resetPasswordExpirationMinutes / 60,
  );
  const resetPasswordToken = generateToken({ id: user.id }, expiresMs);
  return resetPasswordToken;
}
async function generateAuthTokens({ userId, roleId, username }) {
  const refreshTokenExpires = generateExpires(
    config.jwt.refreshExpirationDays * 24,
  );
  const refreshToken = generateToken({ userId }, refreshTokenExpires);
  const accessTokenExpires = generateExpires(
    config.jwt.accessExpirationMinutes / 60,
  );
  const accessToken = generateToken(
    { userId, roleId, username },
    accessTokenExpires,
  );
  return {
    refresh: {
      token: refreshToken,
      expires: refreshTokenExpires,
    },
    access: {
      token: accessToken,
      expires: accessTokenExpires,
    },
  };
}
module.exports = {
  generateResetPasswordToken,
  generateAuthTokens,
};
