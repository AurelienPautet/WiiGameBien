const editor_canvas = document.getElementById("editor_canvas");
const editor_c = editor_canvas.getContext("2d");
const selectedGameMode = document.querySelector(
  'input[name="game_mode"]:checked'
);

editor_canvas.width = 920;
editor_canvas.height = 640;

selected_block = 1;

current_level_id = -1;

current_mode = "online";

function toggle_editor_mode() {
  console.log(
    "Toggling editor mode with current mode:",
    current_mode,
    "and selected mode:",
    document.querySelector('input[name="game_mode"]:checked').value
  );
  if (current_mode === "online") {
    document.getElementById("editor_block11").classList.remove("hidden");
    document.getElementById("editor_block12").classList.remove("hidden");
    document.getElementById("editor_block13").classList.remove("hidden");
    document.getElementById("editor_block14").classList.remove("hidden");
  } else {
    document.getElementById("editor_block11").classList.add("hidden");
    document.getElementById("editor_block12").classList.add("hidden");
    document.getElementById("editor_block13").classList.add("hidden");
    document.getElementById("editor_block14").classList.add("hidden");
    for (let i = 0; i < level_layout.length; i++) {
      if (level_layout[i] >= 10) {
        level_layout[i] = -1;
      }
    }
  }
  current_mode = document.querySelector(
    'input[name="game_mode"]:checked'
  ).value;
}

function select_block(block_number) {
  document
    .getElementById("editor_block" + selected_block)
    .classList.remove("left-3");
  selected_block = block_number;
  document
    .getElementById("editor_block" + selected_block)
    .classList.add("left-3");
}

level_layout = new Array(368).fill(-1);

function clear_layout() {
  level_layout = new Array(368).fill(-1);

  for (let i = 0; i < level_layout.length; i++) {
    if (i < 23) {
      level_layout[i] = 1;
    } else if (i >= 345) {
      level_layout[i] = 1;
    } else if (i % 23 === 0) {
      level_layout[i] = 1;
    } else if (i % 23 === 22) {
      level_layout[i] = 1;
    }
  }
}

function load_level_in_editor(level_id) {
  current_level_id = level_id;
  //console.log("Loading level with ID:", level_id);
  if (level_id === -1) {
    clear_layout();
    return;
  }
  //console.log("Requesting level with ID:", level_id);
  socket.emit("load_level_editor", level_id);
}

socket.on("recieve_level_from_id", (levels) => {
  if (levels && levels.length > 0) {
    level_layout = levels[0].level_json.data;
    level_name = levels[0].level_name;
    document.getElementById("editor_level_name_input").value = level_name;
  }
});

clear_layout();
let mouse_gridX = 0;
let mouse_gridY = 0;
let editor_mouseX = 0;
let editor_mouseY = 0;
mouse_grid_index = 0;

function editor_draw() {
  window.requestAnimationFrame(editor_draw);
  editor_c.drawImage(bg, 0, 0, editor_canvas.width, editor_canvas.height);

  for (let i = 0; i < level_layout.length; i++) {
    if (level_layout[i] >= 0) {
      let x = (i % 23) * 40;
      let y = Math.floor(i / 23) * 40;
      draw_block(level_layout[i], x, y);
    }
  }
  editor_c.globalAlpha = 0.5;
  draw_block(selected_block, mouse_gridX * 40, mouse_gridY * 40);
  editor_c.globalAlpha = 1.0;
}

editor_draw();

function draw_block(block_number, x, y) {
  switch (block_number) {
    case 1:
      editor_c.drawImage(block1, x, y, 40, 40);
      break;
    case 2:
      editor_c.drawImage(block2, x, y, 40, 40);
      break;
    case 3:
      editor_c.drawImage(flag, x, y, 40, 40);

      break;
    case 4:
      editor_c.drawImage(hole, x, y, 40, 40);
      break;
    case 11:
      editor_c.drawImage(body_blue, x, y, 40, 40);
      editor_c.drawImage(turret_blue, x - 6, y + 3, 40, 25);
      break;
    case 12:
      editor_c.drawImage(body_green, x, y, 40, 40);
      editor_c.drawImage(turret_green, x - 6, y + 3, 40, 25);
      break;
    case 13:
      editor_c.drawImage(body_orange, x, y, 40, 40);
      editor_c.drawImage(turret_orange, x - 6, y + 3, 40, 25);
      break;
    case 14:
      editor_c.drawImage(body_red, x, y, 40, 40);
      editor_c.drawImage(turret_red, x - 6, y + 3, 40, 25);
      break;
  }
}

editor_canvas.addEventListener("mousemove", function (e) {
  const rect = editor_canvas.getBoundingClientRect();
  editor_mouseX = e.clientX - rect.left;
  editor_mouseY = e.clientY - rect.top;
  mouse_gridY = Math.floor(editor_mouseY / 60);
  mouse_gridX = Math.floor(editor_mouseX / 60);
  mouse_grid_index = mouse_gridY * 23 + mouse_gridX;
});
let isMouseDown = false;
let mouseButton = null;

editor_canvas.addEventListener("mousedown", function (e) {
  isMouseDown = true;
  mouseButton = e.button;
  handleEditorMouseAction(e);
});

editor_canvas.addEventListener("mouseup", function (e) {
  isMouseDown = false;
  mouseButton = null;
});

editor_canvas.addEventListener("mouseleave", function (e) {
  isMouseDown = false;
  mouseButton = null;
});

editor_canvas.addEventListener("mousemove", function (e) {
  const rect = editor_canvas.getBoundingClientRect();
  editor_mouseX = e.clientX - rect.left;
  editor_mouseY = e.clientY - rect.top;
  mouse_gridY = Math.floor(editor_mouseY / (40 * scale));
  mouse_gridX = Math.floor(editor_mouseX / (40 * scale));
  mouse_grid_index = mouse_gridY * 23 + mouse_gridX;

  if (isMouseDown) {
    handleEditorMouseAction(e);
  }
});

function handleEditorMouseAction(e) {
  if (
    mouse_gridX > 0 &&
    mouse_gridX < 22 &&
    mouse_gridY > 0 &&
    mouse_gridY < 15 &&
    mouse_grid_index >= 0 &&
    mouse_grid_index < level_layout.length
  ) {
    if (mouseButton === 0) {
      level_layout[mouse_grid_index] = selected_block;
    }
    if (mouseButton === 2) {
      level_layout[mouse_grid_index] = -1;
    }
  }
  if (mouseButton === 2) {
    e.preventDefault();
  }
}

editor_canvas.addEventListener("contextmenu", function (e) {
  e.preventDefault();
});

function save_level() {
  save_canvas_as_thumbnail();
}

function save_canvas_as_thumbnail() {
  const lowQuality = editor_canvas.toDataURL("image/jpeg", 0.1);
  const base64Data = lowQuality.split(",")[1];
  const hexData = base64ToHex(base64Data);
  level_name = document.getElementById("editor_level_name_input").value;
  max_players = level_layout.reduce(
    (count, val) => (val === 3 ? count + 1 : count),
    0
  );

  if (max_players === 0) {
    createToast(
      "error",
      "/ressources/image/error.svg",
      "Error",
      "You need at least one spawn point for players!"
    );
    return;
  }
  if (max_players > 8) {
    createToast(
      "error",
      "/ressources/image/error.svg",
      "Error",
      "You cannot have more than 8 spawn points for players!"
    );
    return;
  }

  if (level_name.trim() === "") {
    createToast(
      "error",
      "/ressources/image/error.svg",
      "Error",
      "Level name cannot be empty!"
    );
    return;
  }
  if (level_name.length > 30) {
    createToast(
      "error",
      "/ressources/image/error.svg",
      "Error",
      "Level name cannot be longer than 30 characters!"
    );
    return;
  }

  const levelData = {
    data: level_layout,
  };

  socket.emit(
    "save_level",
    current_level_id,
    levelData,
    hexData,
    level_name,
    max_players
  );
}

socket.on("save_level_success", (level_id) => {
  //console.log("Level saved successfully with ID:", level_id);
  createToast(
    "info",
    "/ressources/image/info.svg",
    "Success",
    "Level saved successfully with name: " + level_name
  );
  show_ui_element("my_level_selector");
});

socket.on("save_level_fail", (reason) => {
  //console.log("Level save failed:", reason);
  createToast(
    "error",
    "/ressources/image/error.svg",
    "Error",
    "Failed to save level: " + reason
  );
});

function base64ToHex(base64) {
  const binary = atob(base64);
  let hex = "";
  for (let i = 0; i < binary.length; i++) {
    hex += binary.charCodeAt(i).toString(16).padStart(2, "0");
  }
  return hex;
}

function HexToJpeg(hex) {
  const binary = [];
  for (let i = 0; i < hex.length; i += 2) {
    binary.push(String.fromCharCode(parseInt(hex.substr(i, 2), 16)));
  }
  const base64 = btoa(binary.join(""));
  const dataUrl = "data:image/jpeg;base64," + base64;

  /*   const link = document.createElement("a");
  link.href = dataUrl;
  link.download = "level_thumbnail.jpg";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
 */
  return dataUrl;
}
