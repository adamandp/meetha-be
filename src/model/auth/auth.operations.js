const console = require("../../common/app-logger/console.js");
const httpStatus = require("../../utils/http-status.js");

const authService = require("./credentials");
const userService = require("../user/user.repository");
const tokenService = require("./tokens");
const { verifyToken } = require("../../common/auth/token.js");
const axios = require("axios");
const config = require("../../common/config/config.js");
const logger = require("../../common/app-logger/logger.js");
const moment = require("moment");

const register = async (req, res) => {
  const data = req.body;
  data.roleId = 2;
  const user = await userService.createUser(data);
  const tokens = await tokenService.generateAuthTokens({
    userId: user.id,
    roleId: user.role_id,
    username: user.username,
  });
  delete user.password;
  res.status(httpStatus.CREATED).send({
    success: true,
    message: "Registration Success",
    data: {
      id: user.id,
      username: user.username,
      email: user.email,
      user_uuid: user.user_uuid,
      api_key: "-",
      distributor_id: null,
      fullname: user.fullname,
      phone_number: "-",
      company_name: "-",
      created_at: user.createdon,
      billing: null,
      first_register_credit: null,
    },
  });
};
const centralizedRegister = async (req, res) => {
  const apiUrl =
    config.services.user.base_url + config.services.user.register_endpoint;
  const billingUserCreditApiUrl =
    config.services.billing.base_url + config.services.billing.credit_endpoint;
  const createTopupApiURL =
    config.services.billing.base_url +
    config.services.billing.create_topup_endpoint;
  const activateAppUserApiURL =
    config.services.billing.base_url +
    config.services.billing.activate_app_user_endpoint;
  const updateTopupApiURL =
    config.services.billing.base_url +
    config.services.billing.success_topup_endpoint;
  const perMinutePricing = config.services.pricing.staticPerMinutes;
  const firstRegisterBonus = config.services.pricing.firstRegisterBonus;
  const { email, phone_number, fullname, username, password, company_name } =
    req.body;
  const param = {
    username: username,
    email: email,
    password: password,
    fullname: fullname,
    phone_number: phone_number,
    company_name: company_name ? company_name : null,
    is_rootuser: true,
  };
  axios
    .post(apiUrl, param)
    .then(async (response) => {
      let reg_response = response.data;
      if (reg_response.status_code === 201) {
        let user_uuid = reg_response.data.user_uuid;
        await axios
          .post(activateAppUserApiURL, {
            user_uuid: user_uuid,
            app_id: config.services.billing.meetha_app_id,
          })
          .catch((error) => {
            console.log("Cannot Subscribe Meetha", error);
          });
        let respData = reg_response.data;
        axios
          .get(billingUserCreditApiUrl + user_uuid)
          .then(async (response) => {
            let billingUserResponse = response.data;
            if (billingUserResponse.status_code === 200) {
              let billing = billingUserResponse.data;
              respData.billing = billing;
              billing.per_minute_rate = perMinutePricing;
              if (firstRegisterBonus.active) {
                respData.first_register_credit = {
                  active: true,
                  amount: firstRegisterBonus.amount,
                };
                let today = new Date();
                var next24Hours = moment(today).add(24, "hours"); // see the cloning?
                var expiredDate = next24Hours.format("yyyy-MM-DD HH:mm:ss");
                let dataToSend = {
                  user_uuid: user_uuid,
                  amount: firstRegisterBonus.amount,
                  payment_expired: expiredDate,
                  app_name: "meetha",
                  app_id: config.services.billing.meetha_app_id,
                  topup_datetime: moment(today).format("yyyy-MM-DD HH:mm:ss"),
                };
                let wuser_uuid = user_uuid;
                // console.log("dataToSend", dataToSend)
                axios
                  .post(createTopupApiURL, dataToSend)
                  .then((response) => {
                    let topupResponse = response.data;
                    if (topupResponse.status_code === 201) {
                      let topupCode = topupResponse.data.topup_code;
                      let wRespData = respData;
                      axios
                        .put(updateTopupApiURL, {
                          user_uuid: wuser_uuid,
                          topup_code: topupCode,
                          paymentDate: moment(new Date()).format(
                            "yyyy-MM-DD HH:mm:ss",
                          ),
                        })
                        .then((response) => {
                          let updateTopupResponse = response.data;
                          if (updateTopupResponse.status_code === 200) {
                            wRespData.billing.credit =
                              Number(wRespData.billing.credit) +
                              Number(firstRegisterBonus.amount);
                            res.send({
                              success: true,
                              message: "Registration Success",
                              data: wRespData,
                            });
                          } else if (reg_response.messages) {
                            res.send({
                              success: false,
                              message:
                                "Registration Failed: " +
                                updateTopupResponse.messages,
                            });
                          } else {
                            res.send({
                              success: false,
                              message: "Registration Failed",
                            });
                          }
                        })
                        .catch((error) => {
                          console.error("Error:", error);
                          res.send({
                            success: false,
                            message: "Registration Error: " + error.message,
                          });
                        });
                    } else if (reg_response.messages) {
                      res.send({
                        success: false,
                        message:
                          "Registration Failed: " + topupResponse.messages,
                      });
                    } else {
                      res.send({
                        success: false,
                        message: "Registration Failed",
                      });
                    }
                  })
                  .catch((error) => {
                    console.error("Error:", error);
                    res.send({
                      success: false,
                      message: "Registration Error: " + error.message,
                    });
                  });
              } else {
                respData.first_register_credit = {
                  active: false,
                  amount: 0,
                };
                res.send({
                  success: true,
                  message: "Registration Error",
                  data: respData,
                });
              }
            } else if (reg_response.messages) {
              res.send({
                success: false,
                message: "Registration Failed: " + billingUserResponse.messages,
              });
            } else {
              res.send({ success: false, message: "Registration Failed" });
            }
          })
          .catch(async (error) => {
            console.error("Error:", error);
            res.send({
              success: false,
              message: "Login Error: " + error.message,
            });
          });
      } else if (reg_response.messages) {
        logger.error("User Service Error: ");
        // console.log(reg_response);
        res.send({
          success: false,
          message: "Registration Failed: " + reg_response.messages,
        });
      } else {
        logger.error("User Service Error: ");
        // console.log(reg_response);
        res.send({ success: false, message: "Registration Failed" });
      }
    })
    .catch((error) => {
      console.error("Error:", error);
      res.send({
        success: false,
        message: "Registration Error: " + error.message,
      });
    });
};
const login = async (req, res) => {
  try {
    const user = await authService.loginUserWithUsernameAndPassword(req);
    const tokens = await tokenService.generateAuthTokens({
      userId: user.id,
      roleId: user.role_id,
      username: user.username,
    });
    res.send({ user, tokens });
  } catch (ex) {
    // console.log('Internal User Login Failed: ' + ex.message);
    await ssoInternalLogin(req, res);
  }
};

const rapi_login = async (req, res) => {
  try {
    const user = await authService.loginUserWithUsernameAndPassword(req);
    const tokens = await tokenService.generateAuthTokens({
      userId: user.id,
      roleId: user.role_id,
      username: user.username,
    });
    res.send({
      user: {
        id: user.id,
        user_uuid: user.user_uuid,
        username: user.username,
        email: user.email,
        fullname: user.fullname,
        phone_number: "-",
        company_name: null,
        is_superuser: user.role_id == 1,
        is_rootuser: true,
        created_at: user.createdon,
        status: 1,
        RootAccount: {
          user_uuid: user.user_uuid,
          api_key: "-",
          credit: 999999999,
          coin: 0,
        },
        Member: null,
        Group: null,
        api_key: "-",
        credit: 999999999,
        coin: 0,
      },
      tokens: tokens,
      billing: {
        credit: 999999999,
        user_uuid: user.user_uuid,
        demo: false,
        id: 999999,
        coin: 0,
        updated_at: user.createdon,
        per_minute_rate: "700",
      },
    });
  } catch (ex) {
    // console.log('Internal User Login Failed: ' + ex.message);
    // await ssoInternalLogin(req, res)
    console.error("Error:", ex);
    res.send({ success: false, message: "Login Error: " + ex.message });
  }
};
const ssoInternalLogin = async (req, res) => {
  const billingUserCreditApiUrl =
    config.services.billing.base_url + config.services.billing.credit_endpoint;
  const apiUrl =
    config.services.sso.base_url + config.services.sso.login_endpoint;
  const perMinutePricing = config.services.pricing.staticPerMinutes;
  const activateAppUserApiURL =
    config.services.billing.base_url +
    config.services.billing.activate_app_user_endpoint;
  const { username, password } = req.body;
  const param = {
    username: username,
    password: password,
  };
  axios
    .post(apiUrl, param)
    .then((response) => {
      let reg_response = response.data;
      if (
        reg_response.success &&
        reg_response.data &&
        reg_response.data.RootAccount
      ) {
        reg_response.data.user_uuid = reg_response.data.RootAccount.user_uuid;
        reg_response.data.api_key = reg_response.data.RootAccount.api_key;
        reg_response.data.credit = reg_response.data.RootAccount.credit;
        reg_response.data.coin = reg_response.data.RootAccount.coin;
        let user_uuid = reg_response.data.user_uuid;
        axios
          .get(billingUserCreditApiUrl + user_uuid)
          .then(async (response) => {
            await axios
              .post(activateAppUserApiURL, {
                user_uuid: user_uuid,
                app_id: config.services.billing.meetha_app_id,
              })
              .catch((error) => {
                console.log("Cannot Subscribe Meetha", error);
              });
            let billingUserResponse = response.data;
            if (billingUserResponse.status_code === 200) {
              let billing = billingUserResponse.data;
              billing.per_minute_rate = perMinutePricing;
              res.send({
                user: reg_response.data,
                tokens: {
                  refresh: {
                    token: null,
                  },
                  access: {
                    token: reg_response.token,
                  },
                },
                billing: billing,
              });
            } else if (reg_response.messages) {
              res.send({
                success: false,
                message: "Registration Failed: " + billingUserResponse.messages,
              });
            } else {
              res.send({ success: false, message: "Registration Failed" });
            }
          })
          .catch(async (error) => {
            console.error("Error:", error);
            res.send({
              success: false,
              message: "Login Error: " + error.message,
            });
          });
      } else if (reg_response.messages) {
        res.send({
          success: false,
          message: "Login Failed: " + reg_response.messages,
        });
      } else {
        res.send({ success: false, message: "Login Failed" });
      }
    })
    .catch((error) => {
      console.error("Error:", error);
      res.send({ success: false, message: "Login Error: " + error.message });
    });
};
const ssoLogin = async (req, res) => {
  const apiUrl =
    config.services.sso.base_url + config.services.sso.login_endpoint;
  const { username, password } = req.body;
  const param = {
    username: username,
    password: password,
  };
  axios
    .post(apiUrl, param)
    .then((response) => {
      let reg_response = response.data;
      if (reg_response.success) {
        res.send({
          user: reg_response.data,
          tokens: {
            refresh: {
              token: null,
            },
            access: {
              token: reg_response.token,
            },
          },
        });
      } else if (reg_response.messages) {
        res.send({
          success: false,
          message: "Login Failed: " + reg_response.messages,
        });
      } else {
        res.send({ success: false, message: "Login Failed" });
      }
    })
    .catch((error) => {
      console.error("Error:", error);
      res.send({ success: false, message: "Login Error: " + error.message });
    });
};
// const forgotPassword = catchAsync(async (req, res) => {
// 	const resetPasswordToken = await tokenService.generateResetPasswordToken(
// 		req.body.email
// 	);
// 	await emailService.sendResetPasswordEmail(
// 		req.body.email,
// 		resetPasswordToken
// 	);
// 	res.send({ success: true });
// });
const resetPassword = async (req, res) => {
  const { ok, payload } = await verifyToken(req);
  if (!ok) {
    return res.send({ success: false, message: "Invalid Token" });
  }
  if (!payload.userId) {
    return res.send({ success: false, message: "Invalid User" });
  }
  if (!req.body.id) {
    req.body.id = payload.userId;
  }
  await userService.updateUser(req);
  res.send({ success: true });
};
module.exports = {
  register,
  login,
  rapi_login,
  resetPassword,
  centralizedRegister,
  ssoLogin,
};
