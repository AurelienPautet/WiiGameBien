let notifications = document.getElementById("notif");

function createToast(type, icon, title, text) {
  let newToast = document.createElement("div");
  newToast.innerHTML = `
            <div class="toast select-none" id="${type}">
              <div class="header">
                <img src="${icon}" height="30px" width="30px" />
                <div class="title">${title}</div>
              </div>
                <span>${text}</span>
            </div>`;
  notifications.prepend(newToast);

  newToast.timeOut = setTimeout(() => newToast.remove(), 50000);
}

socket.on("player-connection", (name) => {
  //console.log(name);
  createToast(
    "connection",
    "/ressources/image/connection.svg",
    "Connection",
    name + " connected"
  );
});

socket.on("player-disconnection", (name) => {
  //console.log(name);
  createToast(
    "disconnection",
    "/ressources/image/disconnection.svg",
    "Disconnection",
    name + " disconnected"
  );
});

socket.on("player-kill", (data) => {
  let li = data.players;
  let type = data.type;
  if (type == "bullet") {
    createToast(
      "bullet",
      `/ressources/image/${type}.svg`,
      `Kill`,
      ` ${li[0]} 🔫 ${li[1]}`
    );
  } else if (type == "mine") {
    createToast(
      "mine",
      `/ressources/image/${type}.svg`,
      `Kill`,
      ` ${li[0]} 💣 ${li[1]}`
    );
  }
});
