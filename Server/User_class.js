const { db, schema } = require(__dirname + "/db");
const { players } = schema;
const { eq } = require("drizzle-orm");

async function get_user_info(email) {
  try {
    const res = await db.select().from(players).where(eq(players.email, email));

    if (res.length === 0) {
      return false;
    }
    return res[0];
  } catch (err) {
    console.error("Error executing query", err);
    return false;
  }
}

class User {
  constructor(email) {
    this.email = email;
    get_user_info(email).then((res) => {
      if (res) {
        this.username = res.username;
        this.id = res.id;
      }
    });
  }
}

module.exports = User;
