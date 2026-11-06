const handleZoomMeeting = async (req, res) => {
  const { meetingLink, username, user_uuid, third_party_key_1 } = req.body;
  if (!meetingLink) {
    return res
      .status(400)
      .json({ success: false, message: "Meeting link is required" });
  }
  const userData = {
    username: username || "default",
    user_uuid: user_uuid || "default",
    third_party_key_1,
  };
  const result = await req.zoomBot.handleZoomMeeting(meetingLink, userData);
  if (result.success) {
    res.json({
      success: true,
      message: "Successfully started Zoom meeting recording",
      data: { meetingInfo: result.meetingInfo },
    });
  } else {
    res.status(500).json({
      success: false,
      message: result.message,
    });
  }
};
module.exports = {
  handleZoomMeeting,
};
