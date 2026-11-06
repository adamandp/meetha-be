const users = require("./user.repository");
exports.getUsers = async (req) => {
  const result = await users.getUsers({
    ...req,
    query: { ...req.query, ufa: true },
  });
  result.rows.forEach((user) => delete user.username);
  return result;
};
