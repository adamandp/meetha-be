const console = require("../app-logger/console.js");
const axios = require("axios");
const jwt = require("jsonwebtoken");
const path = require("path");
const fs = require("fs");
const config = require("../config/config.js");

const ZOOM_API_BASE_URL = config.zoomBaseURL;
class ZoomBot {
  constructor(dbPool, core) {
    this.dbPool = dbPool;
    this.core = core;
    this.activeRecordings = new Map();
  }
  async handleZoomMeeting(meetingLink, userData) {
    try {
      console.log(`Handling Zoom meeting: ${meetingLink}`);
      const { meetingNumber } = this.parseMeetingLink(meetingLink);
      const oauthResponse = this.generateOAuthToken(meetingNumber, 0);
      if (!oauthResponse.success) {
        console.error(
          "Cannot authenticate with Zoom Bot API:",
          oauthResponse.error,
        );
        return { success: false, message: oauthResponse.error.message };
      }
      const joinOauthResponse = await this.getJoinOAuthToken();
      if (!joinOauthResponse.success) {
        console.error(
          "Cannot authenticate with Zoom API:",
          joinOauthResponse.error,
        );
        return { success: false, message: joinOauthResponse.error.message };
      }
      const meetingInfo = await this.getMeetingInfo(
        meetingNumber,
        joinOauthResponse.access_token,
      );
      meetingInfo.token = oauthResponse.token;
      meetingInfo.access_token = joinOauthResponse.access_token;
      meetingInfo.recordingToken = null;
      const recordingResponse = await this.getRecordingToken(
        meetingNumber,
        joinOauthResponse.access_token,
      );
      if (recordingResponse.success) {
        meetingInfo.recordingToken = recordingResponse.token;

        return {
          success: true,
          message: "Successfully started Zoom meeting recording.",
          meetingInfo,
        };
      } else {
        return {
          success: false,
          message: "Failed to start Zoom meeting recording.",
          error: recordingResponse.error,
        };
      }
    } catch (error) {
      console.error("Error handling Zoom meeting:", error);
      return { success: false, message: error.message };
    }
  }
  async getMeetingInfo(meetingNumber, access_token) {
    try {
      const response = await axios.get(
        `${ZOOM_API_BASE_URL}/v2/meetings/${meetingNumber}`,
        {
          headers: { Authorization: `Bearer ${access_token}` },
        },
      );
      return {
        meetingNumber,
        title: response.data.topic,
        startTime: new Date(response.data.start_time),
        duration: response.data.duration,
      };
    } catch (error) {
      console.error("Error fetching meeting info:", error);
      throw new Error("Failed to fetch meeting information");
    }
  }

  async insertInitialEventToDatabase(
    userData,
    meetingInfo,
    meetingLink,
    oauthToken,
    recordingToken,
  ) {
    const query = `
            INSERT INTO event (
                timestart, subject, description, status,
                third_party_key_1, third_party_key_2, third_party_key_3, online_meeting_link, createdby, createdon,
                updatedby, updatedon, pembicara, partisipan, language,
                sync_status, uploading, status_process_chunk, loading,
                datausername, data_user_uuid, ready_to_import
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
            RETURNING id
        `;
    const values = [
      meetingInfo.startTime,
      meetingInfo.title,
      meetingInfo.title,
      "1",
      userData.third_party_key_1,
      oauthToken,
      recordingToken,
      meetingLink,
      userData.username,
      new Date(),
      userData.username,
      new Date(),
      1,
      1,
      "id",
      0,
      0,
      0,
      0,
      userData.username,
      userData.user_uuid,
      0,
    ];
    try {
      const result = await this.dbPool.query(query, values);
      return result.rows[0].id;
    } catch (error) {
      console.error("Error inserting initial event to database:", error);
      throw new Error("Failed to create initial event in database");
    }
  }
  async updateEventWithRecordingInfo(eventId, audioFilePath, durationSec) {
    const query = `
            UPDATE event
            SET import_file_path = $1, duration_sec = $2, ready_to_import = 1
            WHERE id = $3
        `;
    const values = [path.basename(audioFilePath), durationSec, eventId];
    try {
      await this.dbPool.query(query, values);
      console.log(`Updated event ${eventId} with recording info`);
    } catch (error) {
      console.error("Error updating event with recording info:", error);
      throw new Error("Failed to update event with recording info");
    }
  }
  async updateEventStatus(eventId, status, message) {
    const query = `
            UPDATE event
            SET status = $1, import_message = $2
            WHERE id = $3
        `;
    const values = [status === "failed" ? "3" : "1", message, eventId];
    try {
      await this.dbPool.query(query, values);
      console.log(`Updated status for event ${eventId}`);
    } catch (error) {
      console.error("Error updating event status:", error);
    }
  }
  parseMeetingLink(meetingLink) {
    const url = new URL(meetingLink);
    const pathParts = url.pathname.split("/");
    return {
      meetingNumber: pathParts[pathParts.length - 1],
      password: url.searchParams.get("pwd") || "",
    };
  }
  generateOAuthToken(meetingNumber, role, expirationSeconds = 172800) {
    try {
      const iat = Math.floor(Date.now() / 1000);
      const exp = expirationSeconds
        ? iat + expirationSeconds
        : iat + 60 * 60 * 2;
      const oHeader = { alg: "HS256", typ: "JWT" };
      const oPayload = {
        appKey: config.zoomApiKey,
        sdkKey: config.zoomApiKey,
        mn: meetingNumber,
        role,
        iat,
        exp,
        tokenExp: exp,
      };
      const sHeader = JSON.stringify(oHeader);
      const sPayload = JSON.stringify(oPayload);
      const sdkJWT = jwt.sign(oPayload, config.zoomApiSecret, {
        algorithm: "HS256",
        header: oHeader,
      });
      return {
        success: true,
        token: sdkJWT,
        message: "Success obtain oauth token",
      };
    } catch (e) {
      return {
        success: false,
        message: "Failed obtain oauth token",
        error: e.message,
      };
    }
  }
  getJoinOAuthToken = async () => {
    try {
      const request = await axios.post(
        config.zoomOAuthURL,
        new URLSearchParams({
          grant_type: "account_credentials",
          account_id: config.zoomS2SAccountID,
        }).toString(),
        {
          headers: {
            Authorization: `Basic ${Buffer.from(`${config.zoomS2SApiKey}:${config.zoomS2SApiSecret}`).toString("base64")}`,
          },
        },
      );
      const { access_token, expires_in } = await request.data;

      return {
        success: true,
        access_token: access_token,
        expires_in: expires_in,
        message: "Success obtain oauth token",
      };
    } catch (error) {
      console.log(error);
      return { success: false, access_token: null, expires_in: null, error };
    }
  };
  async getRecordingToken(meetingId, oauthToken) {
    if (!oauthToken) {
      return { success: false, message: "Access token is required" };
    }
    try {
      const response = await axios.get(
        `${ZOOM_API_BASE_URL}/v2/meetings/${meetingId}/jointoken/local_recording`,
        {
          headers: {
            Authorization: `Bearer ${oauthToken}`,
            "Content-Type": "application/json",
          },
        },
      );
      console.log(response.data);
      if (response.data && response.data.token) {
        return {
          success: true,
          token: response.data.token,
          message: "Success obtain recoring token",
        };
      }
      return {
        success: false,
        token: response.data.token,
        message: "Failed obtain recoring token",
        error: "Empty Response from Zoom API",
      };
    } catch (error) {
      console.log(error);
      return {
        success: false,
        message: "Failed obtain recoring token",
        error: error.response ? error.response.data : error.message,
      };
    }
  }
}
module.exports = ZoomBot;
