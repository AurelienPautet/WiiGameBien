const bcrypt = require("bcryptjs");
const { OAuth2Client } = require("google-auth-library");
const dotenv = require("dotenv");

dotenv.config();

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

async function signupbis(username, email, password) {
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);
}

async function verifyToken(idToken) {
  try {
    const ticket = await client.verifyIdToken({
      idToken: idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    const userId = payload["sub"];
    const name = payload["name"];
    const email = payload["email"];

    console.log("User ID:", userId);
    console.log("Name:", name);
    console.log("Email:", email);

    return { userId, name, email };
  } catch (error) {
    console.error("Error verifying ID token:", error);
    throw new Error("Invalid ID token");
  }
}

module.exports = {
  signupbis,
  verifyToken,
};
