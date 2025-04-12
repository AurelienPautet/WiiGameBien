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
