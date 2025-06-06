const client = require(__dirname + "/db_client.js");

async function get_user_info(email) {
  return new Promise((resolve, reject) => {
    client.query(
      "SELECT * FROM players WHERE email = $1",
      [email],
      (err, res) => {
        if (err) {
          console.error("Error executing query", err.stack);
          resolve(false);
        } else if (res.rows.length == 0) {
          resolve(false);
        } else {
          const user = res.rows[0];
          resolve(user);
        }
      }
    );
  });
}
class User {
  constructor(email) {
    this.email = email;
    get_user_info(email).then((res) => {
      this.username = res.username;
      this.id = res.id;
    });
  }
}

module.exports = User;
