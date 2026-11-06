const globalService = require("../user/global-users.js");

const getUsers = async (req, res) => {
  const users = await globalService.getUsers(req);
  res.send({ users });
};

module.exports = { getUsers };
