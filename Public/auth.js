function show_hide_pass(input_id, eye_id) {
  var x = document.getElementById(input_id);
  var y = document.getElementById(eye_id);
  if (x.type === "password") {
    x.type = "text";
    y.src = "/icons/eye.svg";
  } else {
    x.type = "password";
    y.src = "/icons/eye_closed.svg";
  }
}

content_login = document.getElementById("content_login");
content_signup = document.getElementById("content_signup");
current_onglet = content_login;
login_onglet = document.getElementById("login_onglet");
signup_onglet = document.getElementById("signup_onglet");

let logged = false;
let myusername = "";
let myemail = "";

function switch_onglet(onglet) {
  console.log(onglet, current_onglet);
  if (current_onglet != onglet) {
    if (onglet == content_login) {
      login_onglet.classList.add("bg-slate-400");
      login_onglet.classList.remove("bg-slate-300");
      signup_onglet.classList.remove("bg-slate-400");
      signup_onglet.classList.add("bg-slate-300");
    } else if (onglet == content_signup) {
      signup_onglet.classList.add("bg-slate-400");
      signup_onglet.classList.remove("bg-slate-300");
      login_onglet.classList.remove("bg-slate-400");
      login_onglet.classList.add("bg-slate-300");
    }
    current_onglet.classList.add("hidden");
    onglet.classList.remove("hidden");
    current_onglet = onglet;
  }
}

function signup() {
  document
    .getElementById("signup_username_input")
    .classList.remove("border-red-500");
  document
    .getElementById("signup_email_input")
    .classList.remove("border-red-500");

  username = document.getElementById("signup_username_input").value;
  if (username == "") {
    createToast("info", "/image/info.svg", "Error", "Enter a username ");
    return;
  }
  email = document.getElementById("signup_email_input").value;
  if (email == "") {
    createToast("info", "/image/info.svg", "Error", "Enter an email ");
    return;
  }
  password = document.getElementById("signup_password_input").value;
  if (password == "") {
    createToast("info", "/image/info.svg", "Error", "Enter a password ");
    return;
  }
  console.log(username, email, password, "signup");
  socket.emit("signup", username, email, password);
}

socket.on("signup_fail", (msg) => {
  if (msg == "username") {
    document
      .getElementById("signup_username_input")
      .classList.add("border-red-500");
    createToast("info", "/image/info.svg", "Error", "Username already taken");
  }
  if (msg == "email") {
    document
      .getElementById("signup_email_input")
      .classList.add("border-red-500");
    createToast("info", "/image/info.svg", "Error", "Email already taken");
  }
});
socket.on("signup_success", (username) => {
  console.log("signup success", username);
  logged = true;
  myusername = username;
  myemail = email;
  document.getElementById("profile_username").innerHTML =
    "Username: " + username;
  document.getElementById("profile_email").innerHTML = "Email: " + email;
  change_logged_status();
  createToast("info", "/image/info.svg", "Success", username + " created");
  return_home();
});

function login() {
  document
    .getElementById("login_email_input")
    .classList.remove("border-red-500");
  document
    .getElementById("login_password_input")
    .classList.remove("border-red-500");
  email = document.getElementById("login_email_input").value;
  if (email == "") {
    createToast("info", "/image/info.svg", "Error", "Enter an email ");
    return;
  }
  password = document.getElementById("login_password_input").value;
  if (password == "") {
    createToast("info", "/image/info.svg", "Error", "Enter a password ");
    return;
  }
  console.log(email, password, "login");
  socket.emit("login", email, password);
}
socket.on("login_fail", (msg) => {
  if (msg == "email") {
    document
      .getElementById("login_email_input")
      .classList.add("border-red-500");
    createToast("info", "/image/info.svg", "Error", "Email not found");
  }
  if (msg == "password") {
    document
      .getElementById("login_password_input")
      .classList.add("border-red-500");
    createToast("info", "/image/info.svg", "Error", "Invalid password");
  }
});
socket.on("login_success", (username) => {
  logged = true;
  myusername = username;
  myemail = email;
  change_logged_status();
  document.getElementById("profile_username").innerHTML =
    "Username: " + username;
  document.getElementById("profile_email").innerHTML = "Email: " + email;

  console.log("login success", username);
  createToast("info", "/image/info.svg", "Success", username + " logged in");
  return_home();
});

function change_logged_status() {
  if (logged) {
    document.getElementById("login_text").innerHTML = "Logged as " + myusername;
  } else {
    document.getElementById("login_text").innerHTML = "Not logged in";
  }
}

function logout() {
  socket.emit("logout");
  logged = false;
  change_logged_status();
  return_home();
  createToast("info", "/icons/logout.svg", "Success", "Logged out");
  console.log("logout success");
}
