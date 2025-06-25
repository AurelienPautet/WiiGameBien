const bcrypt = require("bcryptjs");
const { OAuth2Client } = require("google-auth-library");
const client = new OAuth2Client(
  "403445313450-kvueoci8r29rcpqk2p8jle1escfn6cc9.apps.googleusercontent.com"
); // Replace with your Google Client ID

async function signupbis(username, email, password) {
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);
}

async function verifyToken(idToken) {
  try {
    // Verify the ID token
    const ticket = await client.verifyIdToken({
      idToken: idToken,
      audience:
        "403445313450-kvueoci8r29rcpqk2p8jle1escfn6cc9.apps.googleusercontent.com", // Replace with your Google Client ID
    });

    // Get the payload (user information)
    const payload = ticket.getPayload();

    // Extract user information
    const userId = payload["sub"]; // Unique user ID
    const name = payload["name"]; // User's full name
    const email = payload["email"]; // User's email address

    console.log("User ID:", userId);
    console.log("Name:", name);
    console.log("Email:", email);

    // Return the user info
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
