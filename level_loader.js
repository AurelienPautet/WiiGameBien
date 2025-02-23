const { get_json_from_id } = require(__dirname + "/database_stuff.js");

const {
  Player,
  CollisonsBox,
  Bullet,
  Block,
  Frontend_Player,
  Mine,
} = require(__dirname + "/class.js");

async function loadlevel(level_id, room) {
  //load the level from the json file and create the blocks and the spawns for the players and the collision boxes
  return new Promise((resolve) => {
    get_json_from_id(level_id).then((blocklist) => {
      room.blocklist = blocklist;
      room.blocks = [];
      room.spawns = [];

      for (let l = 0; l <= 16; l++) {
        for (let c = 0; c <= 23; c++) {
          if (room.blocklist[l * 23 + c] == 1) {
            room.blocks.push(new Block({ x: c * 50, y: l * 50 }, 1));
          }
          if (room.blocklist[l * 23 + c] == 2) {
            room.blocks.push(new Block({ x: c * 50, y: l * 50 }, 2));
          }
          if (room.blocklist[l * 23 + c] == 3) {
            room.spawns.push({ x: c * 50, y: l * 50 });
          }
        }
      }
      generateBcollision(room);
      resolve();
    });
  });
}

function generateBcollision(room) {
  //generate the collision boxes for the blocks in the level and merge them if they are touching each other to reduce the number of collision boxes to check
  boxed = [];
  i = 0;
  room.Bcollision = [];
  //generate the collision boxes for the blocks
  while (i < room.blocklist.length) {
    l = 1;
    col = 1;
    if (
      (room.blocklist[i] == 1 || room.blocklist[i] == 2) &&
      boxed.includes(i) == false
    ) {
      while (
        (room.blocklist[i + l] == 1 || room.blocklist[i + l] == 2) &&
        (i % 23) + l < 23 &&
        boxed.includes(i + l) == false
      ) {
        l++;
      }
      while (
        (room.blocklist[i + 23 * col] == 1 ||
          room.blocklist[i + 23 * col] == 2) &&
        Math.floor(i / 23) + col < 16 &&
        boxed.includes(i + 23 * col) == false
      ) {
        col++;
      }
      if (col > l) {
        l = 1;
        for (let b = 0; b < col; b++) {
          boxed.push(i + b * 23);
        }
      } else {
        col = 1;
        for (let b = 0; b < l; b++) {
          boxed.push(i + b);
        }
      }
      room.Bcollision.push(
        new CollisonsBox(
          { x: (i % 23) * 50, y: Math.floor(i / 23) * 50 },
          { w: l * 50, h: col * 50 }
        )
      );
    }
    i++;
  }
  boxed = [];
  //merge the collision boxes that are touching each other on the y axis
  for (let i = 0; i < room.Bcollision.length; i++) {
    for (let e = 0; e < room.Bcollision.length; e++) {
      if (
        i != e &&
        room.Bcollision[i].position.x === room.Bcollision[e].position.x &&
        room.Bcollision[i].position.y + room.Bcollision[i].size.h ===
          room.Bcollision[e].position.y &&
        room.Bcollision[i].size.w === room.Bcollision[e].size.w
      ) {
        room.Bcollision.push(
          new CollisonsBox(
            {
              x: room.Bcollision[i].position.x,
              y: room.Bcollision[i].position.y,
            },
            {
              w: room.Bcollision[i].size.w,
              h: room.Bcollision[i].size.h + room.Bcollision[e].size.h,
            }
          )
        );
        if (i > e) {
          room.Bcollision.splice(i, 1);
          room.Bcollision.splice(e, 1);
        } else {
          room.Bcollision.splice(e, 1);
          room.Bcollision.splice(i, 1);
        }
        i = 0;
        e = 0;
      }
    }
  }
  //merge the collision boxes that are touching each other on the x axis
  for (let i = 0; i < room.Bcollision.length; i++) {
    for (let e = 0; e < room.Bcollision.length; e++) {
      if (
        i != e &&
        room.Bcollision[i].position.y === room.Bcollision[e].position.y &&
        room.Bcollision[i].position.x + room.Bcollision[i].size.w ===
          room.Bcollision[e].position.x &&
        room.Bcollision[i].size.h === room.Bcollision[e].size.h
      ) {
        room.Bcollision.push(
          new CollisonsBox(
            {
              x: room.Bcollision[i].position.x,
              y: room.Bcollision[i].position.y,
            },
            {
              w: room.Bcollision[i].size.w + room.Bcollision[e].size.w,
              h: room.Bcollision[i].size.h,
            }
          )
        );
        if (i > e) {
          room.Bcollision.splice(i, 1);
          room.Bcollision.splice(e, 1);
        } else {
          room.Bcollision.splice(e, 1);
          room.Bcollision.splice(i, 1);
        }
        i = 0;
        e = 0;
      }
    }
  }
  //remove the collision boxes that are the same if they are any
  for (let i = 0; i < room.Bcollision.length; i++) {
    for (let e = 0; e < room.Bcollision.length; e++) {
      if (
        i != e &&
        room.Bcollision[i].position.x === room.Bcollision[e].position.x &&
        room.Bcollision[i].position.y === room.Bcollision[e].position.y &&
        room.Bcollision[i].size.w === room.Bcollision[e].size.w &&
        room.Bcollision[i].size.h === room.Bcollision[e].size.h
      ) {
        if (i > e) {
          room.Bcollision.splice(i, 1);
          room.Bcollision.splice(e, 1);
        } else {
          room.Bcollision.splice(e, 1);
          room.Bcollision.splice(i, 1);
        }
        i = 0;
        e = 0;
      }
    }
  }
}

module.exports = {
  loadlevel,
  generateBcollision,
};
