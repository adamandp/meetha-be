const console = require("../../common/app-logger/console.js");

const axios = require("axios");
const config = require("../../common/config/config.js");

const moment = require("moment");

const getUserBillingInfo = async function (req, res) {
  const apiUrl =
    config.services.billing.base_url + config.services.billing.credit_endpoint;
  const perMinutePricing = config.services.pricing.staticPerMinutes;
  const { user_uuid } = req.query;
  axios
    .get(apiUrl + user_uuid)
    .then((response) => {
      let billingUserResponse = response.data;
      if (billingUserResponse.status_code === 200) {
        let billing = billingUserResponse.data;
        billing.per_minute_rate = perMinutePricing;
        res.send({ success: true, message: "Success", data: billing });
      } else if (billingUserResponse.messages) {
        res.send({
          success: false,
          message: "Registration Failed: " + billingUserResponse.messages,
        });
      } else {
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
const getUserBillingLogList = async function (req, res) {
  const apiUrl =
    config.services.billing.base_url +
    config.services.billing.billing_log_endpoint;
  const { user_uuid } = req.query;
  axios
    .get(apiUrl + user_uuid)
    .then((response) => {
      let topupResponse = response.data;
      if (topupResponse.status_code === 200) {
        let list = topupResponse.data;
        res.send({ success: true, message: "Success", data: list });
      } else if (topupResponse.messages) {
        res.send({
          success: false,
          message: "Failed: " + topupResponse.messages,
        });
      } else {
        res.send({ success: false, message: "Failed" });
      }
    })
    .catch((error) => {
      res.send({ success: false, message: "Error: " + error.message });
    });
};
const getUserTopupList = async function (req, res) {
  const apiUrl =
    config.services.billing.base_url +
    config.services.billing.topup_list_endpoint;
  const { user_uuid } = req.query;
  axios
    .get(apiUrl + user_uuid)
    .then((response) => {
      let topupResponse = response.data;
      if (topupResponse.status_code === 200) {
        let list = topupResponse.data;
        res.send({ success: true, message: "Success", data: list });
      } else if (topupResponse.messages) {
        res.send({
          success: false,
          message: "Failed: " + topupResponse.messages,
        });
      } else {
        res.send({ success: false, message: "Failed" });
      }
    })
    .catch((error) => {
      console.error("Error:", error);
      res.send({ success: false, message: "Error: " + error.message });
    });
};
const createTopup = async function (req, res) {
  const apiUrl =
    config.services.billing.base_url +
    config.services.billing.create_topup_endpoint;
  const apiSnapUpdateUrl =
    config.services.billing.base_url +
    config.services.billing.snap_topup_endpoint;
  const perMinutePricing = config.services.pricing.staticPerMinutes;
  const { user_uuid, amount } = req.body;
  console.log("TOPUP REQUEST");
  let today = moment().tz("Asia/Jakarta");

  var next24Hours = moment(today).add(1, "hours");

  var expiredDate = next24Hours.format("YYYY-MM-DDTHH:mm:ss[Z]");
  let dataToSend = {
    user_uuid: user_uuid,
    amount: parseInt(amount),
    payment_expired: expiredDate,
    app_name: "meetha",
    app_id: parseInt(config.services.billing.meetha_app_id),
    topup_datetime: today.format("YYYY-MM-DDTHH:mm:ss[Z]"),
  };

  axios
    .post(apiUrl, dataToSend)
    .then(async function (response) {
      let topupResponse = response.data;
      if (topupResponse.status_code === 201) {
        let transaction_details = {
          order_id: topupResponse.data.topup_code,
          gross_amount: amount,
        };
        let credit_card = {
          secure: true,
        };
        let expiry = {
          unit: "hour",
          duration: 1,
        };

        let item_details = [
          {
            id: "meetha_credit_topup",
            price: amount,
            quantity: 1,
            name: "Meetha Quota Topup",
            brand: "Meetha Cakra AI",
            category: "Utilities",
            merchant_name: "Meetha",
            url: "https://meetha.cakra.ai",
          },
        ];
        let customer_details = {
          first_name: "Meetha Customer",
        };
        let param = {
          transaction_details: transaction_details,
          credit_card: credit_card,
          expiry: expiry,
          item_details: item_details,
          customer_details: customer_details,
        };
        let snapResult = await req.midtrans_snap.createTransaction(param);
        console.log("snapResult: ");
        console.log(snapResult);
        axios
          .put(apiSnapUpdateUrl, {
            user_uuid: user_uuid,
            topup_code: topupResponse.data.topup_code,
            snap_token: snapResult.token,
          })
          .then((response) => {
            console.log(response);
            let snapResponse = response.data;
            console.log("snapResponse:");
            console.log(snapResponse);
            if (snapResponse.status_code === 200) {
              res.send({
                success: true,
                message: "Success",
                data: snapResponse.data,
              });
            } else if (snapResponse.messages) {
              res.send({
                success: false,
                message: "Failed: " + snapResponse.messages,
              });
            } else {
              res.send({ success: false, message: "Failed" });
            }
          })
          .catch((error) => {
            console.error("Error:", error);
            res.send({ success: false, message: "Error: " + error.message });
          });
      } else if (topupResponse.messages) {
        res.send({
          success: false,
          message: "Failed: " + topupResponse.messages,
        });
      } else {
        res.send({ success: false, message: "Failed" });
      }
    })
    .catch((error) => {
      console.error("Error:", error);
      res.send({ success: false, message: "Error: " + error.message });
    });
};
const cancelTopup = async function (req, res) {
  const apiUrl =
    config.services.billing.base_url +
    config.services.billing.cancel_topup_endpoint;
  const { user_uuid, topup_code } = req.body;
  axios
    .put(apiUrl, {
      user_uuid: user_uuid,
      topup_code: topup_code,
    })
    .then((response) => {
      let topupResponse = response.data;
      if (topupResponse.status_code === 200) {
        res.send({
          success: true,
          message: "Success",
          data: topupResponse.data,
        });
      } else if (topupResponse.messages) {
        res.send({
          success: false,
          message: "Failed: " + topupResponse.messages,
        });
      } else {
        res.send({ success: false, message: "Failed" });
      }
    })
    .catch((error) => {
      console.error("Error:", error);
      res.send({ success: false, message: "Error: " + error.message });
    });
};
const setExpiredTopup = async function (req, res) {
  const apiUrl =
    config.services.billing.base_url +
    config.services.billing.expire_topup_endpoint;
  const { user_uuid, topup_code } = req.body;
  axios
    .put(apiUrl, {
      user_uuid: user_uuid,
      topup_code: topup_code,
    })
    .then((response) => {
      let topupResponse = response.data;
      if (topupResponse.status_code === 200) {
        res.send({
          success: true,
          message: "Success",
          data: topupResponse.data,
        });
      } else if (topupResponse.messages) {
        res.send({
          success: false,
          message: "Failed: " + topupResponse.messages,
        });
      } else {
        res.send({ success: false, message: "Failed" });
      }
    })
    .catch((error) => {
      console.error("Error:", error);
      res.send({ success: false, message: "Error: " + error.message });
    });
};
const successTopup = async function (req, res) {
  const apiUrl =
    config.services.billing.base_url +
    config.services.billing.success_topup_endpoint;
  const { user_uuid, topup_code, credit_now } = req.body;
  axios
    .put(apiUrl, {
      user_uuid: user_uuid,
      topup_code: topup_code,
      credit_now: credit_now,
    })
    .then((response) => {
      let topupResponse = response.data;
      if (topupResponse.status_code === 200) {
        res.send({
          success: true,
          message: "Success",
          data: topupResponse.data,
        });
      } else if (topupResponse.messages) {
        res.send({
          success: false,
          message: "Failed: " + topupResponse.messages,
        });
      } else {
        res.send({ success: false, message: "Failed" });
      }
    })
    .catch((error) => {
      console.error("Error:", error);
      res.send({ success: false, message: "Error: " + error.message });
    });
};
const applyBilling = async function (req, res) {
  const apiUrl =
    config.services.billing.base_url +
    config.services.billing.create_billing_log_endpoint;
  const successApiUrl =
    config.services.billing.base_url +
    config.services.billing.success_billing_log_endpoint;
  const { api_key, amount, description } = req.body;
  axios
    .post(apiUrl, {
      app_id: config.services.billing.meetha_app_id,
      api_key: api_key,
      amount: amount,
      description: description,
      app_name: "meetha",
      billing_type: "pre",
    })
    .then(async function (response) {
      let billingLogResponse = response.data;
      if (billingLogResponse.status_code === 201) {
        await axios.put(successApiUrl, {
          id: billingLogResponse.data.id,
        });
        res.send({
          success: true,
          message: "Success",
          data: billingLogResponse.data,
        });
      } else if (billingLogResponse.messages) {
        res.send({
          success: false,
          message: "Failed: " + billingLogResponse.messages,
        });
      } else {
        res.send({ success: false, message: "Failed" });
      }
    })
    .catch((error) => {
      console.error("Error:", error);
      res.send({ success: false, message: "Error: " + error.message });
    });
};

module.exports = {
  getUserBillingInfo,
  getUserBillingLogList,
  getUserTopupList,
  createTopup,
  cancelTopup,
  setExpiredTopup,
  successTopup,
  applyBilling,
};
