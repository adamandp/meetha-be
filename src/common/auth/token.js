const jwt = require("jsonwebtoken");
const bycrypt = require("bcrypt");
const config = require("../config/config.js");

// Store invalidated tokens
const invalidatedTokens = new Set();

function generateToken(data, expiresMs, secret = config.jwt.secret) {
  const token = jwt.sign(
    { exp: Math.floor(expiresMs / 1000), ...data },
    secret,
  );
  return token;
}

async function verifyToken(req) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return { ok: false };
    }

    if (!authHeader.startsWith("Bearer ")) {
      return { ok: false };
    }

    const token = authHeader.split(" ")[1];

    // Check if token is invalidated
    if (invalidatedTokens.has(token)) {
      return { ok: false, message: "Token has been invalidated" };
    }

    const payload = jwt.verify(token, config.jwt.secret);
    return { ok: true, payload: payload };
  } catch (err) {
    return { ok: false };
  }
}

function renewToken(oldToken, expiresMs) {
  try {
    // Verify and decode old token
    const payload = jwt.verify(oldToken, config.jwt.secret);

    // Remove exp from payload before generating new token
    const { exp, ...data } = payload;

    // Generate new token
    const newToken = generateToken(data, expiresMs);

    // Invalidate old token
    invalidatedTokens.add(oldToken);

    return { ok: true, token: newToken };
  } catch (err) {
    return { ok: false, message: "Invalid token" };
  }
}

function invalidateToken(token) {
  invalidatedTokens.add(token);
  return { ok: true, message: "Token invalidated" };
}

async function encryptData(string) {
  const salt = await bycrypt.genSalt(10);
  const hashedString = await bycrypt.hash(string, salt);
  return hashedString;
}

async function decryptData(string, hashedString) {
  const isValid = await bycrypt.compare(string, hashedString);
  return isValid;
}

function setCookie(res, cookieName, cookieValue, expiresMs) {
  res.cookie(cookieName, cookieValue, {
    httpOnly: true,
    expires: new Date(expiresMs),
  });
}

function generateExpires(hours) {
  const ms = Math.floor(Date.now() + hours * 60 * 60 * 1000);
  return ms;
}

module.exports = {
  generateToken,
  generateExpires,
  verifyToken,
  encryptData,
  decryptData,
  setCookie,
  renewToken,
  invalidateToken,
};
