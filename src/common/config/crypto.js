const console = require("../app-logger/console.js");
const crypto = require("crypto");

const EK = process.env.SQL_PASSWORD_ENCRYPTION_KEY;
const ALGORITHM = "aes-256-cbc";

function decrypt(encryptedData) {
  try {
    // Split the encrypted text into components
    const [ivHex, encryptedBase64] = encryptedData.split(":");

    // Convert hex string to buffer for IV
    const iv = Buffer.from(ivHex, "hex");

    // Create decipher
    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      Buffer.from(EK, "hex"),
      iv,
    );

    // Decrypt
    let decrypted = decipher.update(Buffer.from(encryptedBase64, "base64"));
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted.toString("utf8");
  } catch (error) {
    console.error("Decryption failed:", error);
    throw new Error("Failed to decrypt database password");
  }
}

module.exports = { decrypt };
