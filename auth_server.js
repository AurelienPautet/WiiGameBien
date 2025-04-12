const bcrypt = require("bcryptjs");

async function signup(username, email, password) {
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);
}
