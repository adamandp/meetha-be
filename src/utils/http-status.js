module.exports = {
  ...require("@nestjs/common").HttpStatus,
  ...require("node:http").STATUS_CODES,
};
