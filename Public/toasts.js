//div that holds all the toast notifications
let notifications = document.getElementById("notif");

function createToast(type, icon, title, text) {
  //create a new toast notification
  //with the given type, icon, title and text
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

  //remove the toast after 5 seconds
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

socket.on("player-kill", (li, type) => {
  if (type == "bullet") {
    createToast(
      "bullet",
      `/image/${type}.svg`,
      `Kill`,
      ` ${li[0]} killed ${li[1]}`
    );
  } else if (type == "mine") {
    createToast(
      "mine",
      `/image/${type}.svg`,
      `Kill`,
      ` ${li[0]} exploded ${li[1]}`
    );
  }
});
