const console = require("../app-logger/console.js");
const handlebars = require("handlebars");
const fs = require("fs");
const axios = require("axios");
const config = require("../config/config.js");
const path = require("path");
const moment = require("moment");
const FormData = require("form-data");

const importNotificationTypes = {
  on_queue: {
    statusIconUrl:
      "https://stag-meetha-api.cakra.ai/static/images/pending-icon.png",
    notificationTitle: "Proses Transkripsi dalam Antrian",
    showButton: false,
    statusMessage:
      "Kami telah menerima file event Anda dan memasukkannya ke dalam antrean transkripsi.",
    description:
      "File audio Anda telah berhasil diunggah dan sekarang berada dalam antrean untuk ditranskripsi. Kami akan mulai memprosesnya sesegera mungkin.",
    showAccessLink: false,
  },
  on_progress: {
    statusIconUrl:
      "https://stag-meetha-api.cakra.ai/static/images/on-progress-icon.png",
    notificationTitle: "Proses Transkripsi Sedang Berlangsung",
    showButton: false,
    statusMessage: "Kami sedang mentranskripsikan file event Anda.",
    description:
      "File audio Anda sedang dalam proses transkripsi. Proses ini mungkin memakan waktu tergantung pada panjang dan kualitas audio. Kami akan memberi tahu Anda setelah selesai.",
    showAccessLink: false,
  },
  finished: {
    statusIconUrl:
      "https://stag-meetha-api.cakra.ai/static/images/success-icon.png",
    notificationTitle: "Proses Transkripsi Selesai",
    showButton: true,
    buttonColor: "#50cd89",
    buttonText: "Lihat Detail",
    buttonUrl: config.meetha.frontend_url + "event-transcript/",
    description: "File audio Anda telah berhasil ditranskripsi.",
    showAccessLink: true,
    accessLink: config.meetha.frontend_url + "event-transcript/",
  },
  failed: {
    statusIconUrl:
      "https://stag-meetha-api.cakra.ai/static/images/failed-icon.png",
    notificationTitle: "Proses Transkripsi Gagal",
    showButton: true,
    buttonColor: "#f1416c",
    buttonText: "Lihat Detail",
    buttonUrl: config.meetha.frontend_url + "event-transcript/",
    description:
      "Kami mengalami masalah saat mentranskripsikan file event Anda. Hal ini mungkin disebabkan oleh file yang rusak, format yang tidak didukung, atau kesulitan teknis lainnya.",
    showAccessLink: true,
    accessLink: config.meetha.frontend_url + "event-transcript/",
  },
};
const importNotificationTemplatePath = path.join(
  process.cwd(),
  "assets",
  "email_templates",
  "import_notification.hbs",
);
const shareNotificationTemplatePath = path.join(
  process.cwd(),
  "assets",
  "email_templates",
  "share_notification.hbs",
);

const generateImportNotificationEmail = (
  type,
  eventName,
  filename,
  eventId,
) => {
  const source = fs.readFileSync(importNotificationTemplatePath, "utf-8");
  const template = handlebars.compile(source);
  const data = {
    ...importNotificationTypes[type],
    eventName,
    filename,
    eventId,
  };

  return template(data);
};
const generateShareEmail = (
  eventName,
  eventDateTime,
  senderFullname,
  downloadLink,
  sendToMe,
) => {
  const source = fs.readFileSync(shareNotificationTemplatePath, "utf-8");
  const template = handlebars.compile(source);
  const data = {
    statusIconUrl:
      "https://stag-meetha-api.cakra.ai/static/images/success-icon.png",
    buttonColor: "#50cd89",
    sendToMe: sendToMe,
    eventName: eventName,
    eventDateTime: eventDateTime,
    senderFullname: senderFullname,
    downloadLink: downloadLink,
  };

  return template(data);
};
const sendImportNotificationEmail = async (notificationType, event) => {
  const { base_url, user_by_uuid_endpoint } = config.services.user;
  const user_uuid = event.data_user_uuid;
  const apiUrl = `${base_url}${user_by_uuid_endpoint}`;
  try {
    const { data: userDetailResponse } = await axios.get(
      `${apiUrl}${user_uuid}`,
    );
    if (userDetailResponse.status_code === 200 && event) {
      const user = userDetailResponse.data;
      if (user && user.email && user.fullname) {
        const emailHTML = generateImportNotificationEmail(
          notificationType,
          event.description,
          event.import_file_path,
          event.id,
        );

        let notification = importNotificationTypes[notificationType];
        sendEmail(
          user.email,
          user.fullname,
          notification.notificationTitle,
          emailHTML,
          "meetha.id",
        );
        return true;
      } else {
        console.log(
          `Error sending notification email for event ID ${event.id}: User detail not found`,
        );
        return false;
      }
    } else {
      console.log(
        `Error sending notification email for event ID ${event.id}: User not found`,
      );
      return false;
    }
  } catch (error) {
    console.log(
      `Error sending notification email for event ID ${event.id}: ${error.message}`,
    );
    return false;
  }
};
const shareMoMEmail = async (event, toEmail, senderEmail, senderName) => {
  console.log("sharing email", event.id, toEmail, senderEmail, senderName);
  if (!event || !event.real_transcript_path || !senderEmail || !senderName) {
    return false;
  }

  let dateTime = moment(event.timestart).format("DD-MM-YYYY HH:mm");
  let downloadLink = event.real_transcript_path;
  downloadLink = downloadLink.replaceAll(
    "/usr/src/app/events",
    config.meetha.backend_url + "v1/mom",
  );
  const emailHTML = generateShareEmail(
    event.description,
    dateTime,
    senderName,
    downloadLink,
    toEmail === senderEmail,
  );
  console.log(emailHTML);
  await sendEmail(toEmail, senderName, "MoM Meetha", emailHTML, "meetha.id");
  return true;
};
const sendEmail = async (to, name, subject, body, createdby) => {
  const { base_url } = config.services.email;
  const data = {
    key: "60012a3aef3bae691fc70c2b79829546",
    address: to,
    name: name,
    subject: subject,
    body: body,
    createdby: createdby,
  };
  var formData = new FormData();
  formData.append("key", "60012a3aef3bae691fc70c2b79829546");
  formData.append("address", to);
  formData.append("name", name);
  formData.append("subject", subject);
  formData.append("body", body);
  formData.append("createdby", createdby);
  let response = await axios.post(base_url, formData);
  // console.log(`Email Response: `, response);
};

module.exports = {
  shareMoMEmail,
  sendEmail,
  sendImportNotificationEmail,
};
