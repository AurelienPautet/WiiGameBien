let notifications = document.getElementById("notif");
console.log(notifications);

function createToast(type, title, text) {
  let newToast = document.createElement("div");
  newToast.innerHTML = `
            <div class="toast" id="${type}">
                <div class="title">${title}</div>
                <span>${text}</span>
            </div>`;
  notifications.prepend(newToast);
  console.log("sdfsdf");
  newToast.timeOut = setTimeout(() => newToast.remove(), 5000);
}

socket.on("player-connection", (name) => {
  console.log(name);
  createToast("connection", "Connection", name + " connected");
});

socket.on("player-disconnection", (name) => {
  console.log(name);
  createToast("disconnection", "Disconnection", name + " disconnected");
});

socket.on("player-kill", (li) => {
  createToast("kill", "Kill", li[0] + " killed " + li[1]);
});
