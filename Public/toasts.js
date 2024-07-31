let notifications = document.getElementById("notif");

function createToast(type, icon, title, text) {
  let newToast = document.createElement("div");
  newToast.innerHTML = `
            <div class="toast" id="${type}">
              <div class="header">
                <img src="${icon}" height="30px" width="30px" />
                <div class="title">${title}</div>
              </div>
                <span>${text}</span>
            </div>`;
  notifications.prepend(newToast);

  newToast.timeOut = setTimeout(() => newToast.remove(), 5000);
}

socket.on("player-connection", (name) => {
  console.log(name);
  createToast(
    "connection",
    "/image/connection.svg",
    "Connection",
    name + " connected"
  );
});

socket.on("player-disconnection", (name) => {
  console.log(name);
  createToast(
    "disconnection",
    "/image/disconnection.svg",
    "Disconnection",
    name + " disconnected"
  );
});

socket.on("player-kill", (li) => {
  createToast("kill", "/image/bullet.svg", "Kill", li[0] + " killed " + li[1]);
});
