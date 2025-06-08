const {
  rectanglesSeTouchent,
  rectRect,
  distance,
} = require("../../Shared/scripts/check_collision.js");

const { generateBcollision } = require("../../Shared/scripts/level_loader.js");
const Player = require("../../Shared/class/Player.js");

class Room {
  constructor(name, rounds, levels, creator, io = null) {
    this.io = io;
    this.name = name;
    this.waitingrespawn = false;
    this.atleast2 = false;
    this.maxplayernb = 0;
    this.levels = levels;
    this.rounds = rounds;
    this.creator = creator;
    this.sounds = {
      plant: false,
      kill: false,
      shoot: false,
      ricochet: false,
      explose: false,
    };
    this.levelid = 0;
    this.players = {};
    this.ids = [];
    this.ids_to_names = {};
    this.blocks = [];
    this.Bcollision = [];
    this.bullets = [];
    this.mines = [];
    this.spawns = [];
    this.nbliving = 0;
    this.tick = 0;
    this.timetoeplode = 300;
    this.mines_explsion_radius = 90;
    this.waitingtime = 5000;
  }

  spawn_new_player(playerName, turretc, bodyc, socketid) {
    let new_player = new Player(
      { x: 0, y: 0 },
      socketid,
      playerName,
      turretc,
      bodyc
    );
    this.players[new_player.socketid] = new_player;
    this.ids.push(new_player.socketid);
    this.ids_to_names[new_player.socketid] = new_player.name;
    this.spawn_player(new_player);
  }

  spawn_player(player) {
    player.alive = true;
    player.minecount = 0;
    player.bulletcount = 0;
    let spawnid = Math.floor(Math.random() * this.spawns.length);
    player.position = structuredClone(this.spawns[spawnid]);
    //console.log("caca:", this.spawns, "at spawn id:", this.spawns[spawnid]);
    this.nbliving += 1;
    player.spawnpos = this.spawns[spawnid];
    this.spawns.splice(spawnid, 1);
    player.spawn();
  }

  update() {
    this.tick++;
    //console.log("Updating room:", this.name, "tick:", this.tick);
    this.update_bullets();
    this.update_mines();
    this.update_players();
    //console.log(this.players);
    this.emit_to_room("tick", {
      players: this.players,
      bullets: this.bullets,
      mines: this.mines,
      name: this.name,
      tick: this.tick,
    });
    this.emit_to_room("tick_sounds", this.sounds);
    this.sounds = {
      plant: false,
      kill: false,
      shoot: false,
      ricochet: false,
      explose: false,
    };
    return this.check_for_winns_and_load_next_level();
  }

  emit_to_room(string, data) {
    //console.log("caca", this.io);
    if (this.io != null) {
      this.io.to(this.name).emit(string, data);
    } else {
      //console.error("No io instance available to emit to this:", this.name);
    }
  }

  check_for_winns_and_load_next_level() {
    if (this.waitingrespawn == false && this.nbliving <= 1) {
      if (Object.keys(this.players).length >= 2) {
        if (this.nbliving == 1) {
          for (let socketid in this.players) {
            let player = this.players[socketid];
            if (player.alive) {
              player.round_stats.stats.wins++;
              this.emit_to_room("winner", {
                socketid: socketid,
                waitingtime: this.waitingtime,
                player_scores: this.get_all_player_stats(),
                ids_to_name: this.ids_to_names,
              });
            }
          }
        } else {
          this.emit_to_room("winner", {
            socketid: -1,
            waitingtime: waitingtime,
            player_scores: this.scores,
            ids_to_name: this.ids_to_names,
          });
        }
        this.waitingrespawn = true;
        return true;
      }
    }
    return false;
  }

  delete_player(socketid) {
    if (this.players[socketid]) {
      let player = this.players[socketid];
      this.emit_to_room("player-disconnection", player.name);
      delete this.players[socketid];
      this.ids.splice(this.ids.indexOf(socketid), 1);
      delete this.ids_to_names[socketid];
      this.spawns.push(player.spawnpos);
      if (player.alive) {
        this.nbliving--;
      }
      if (this.nbliving <= 0) {
        this.respawn_the_room();
      }
    }
  }

  respawn_the_room() {
    this.bullets = [];
    this.mines = [];
    this.emit_to_room("level_change", {
      blocks: this.blocks,
      Bcollision: this.Bcollision,
      level_id: this.levels[this.levelid],
    });
    for (let socketid in this.players) {
      let player = this.players[socketid];
      this.spawn_player(player);
    }
    this.nbliving = Object.keys(this.players).length;
    this.waitingrespawn = false;

    if (this.levelid < this.levels.length - 1) {
      this.levelid++;
    } else {
      this.levelid = 0;
    }
  }

  update_players() {
    //console.log("Updating players in room:", this.players);
    for (let sckid in this.players) {
      this.players[sckid].update(this, fps_corector);
    }
  }

  update_bullets() {
    bulleting: for (let i = 0; i < this.bullets.length; i++) {
      this.bullets[i].update(this, fps_corector);
      if (this.bullets[i].bounce >= 3) {
        this.emit_to_room("bullet_explosion", {
          position: {
            x: this.bullets[i].position.x,
            y: this.bullets[i].position.y,
          },
        });
        this.bullets[i].emitter.bulletcount--;
        this.bullets.splice(i, 1);
        i -= 1;
        continue bulleting;
      }
      for (let e = 0; e < this.mines.length; e++) {
        if (
          rectanglesSeTouchent(
            this.mines[e].position.x - this.mines[e].radius,
            this.mines[e].position.y - this.mines[e].radius,
            this.mines[e].radius * 2,
            this.mines[e].radius * 2,
            this.bullets[i].position.x,
            this.bullets[i].position.y,
            this.bullets[i].size.w,
            this.bullets[i].size.h
          )
        ) {
          this.mines[e].timealive = this.timetoeplode;
          this.bullets[i].emitter.bulletcount--;
          this.bullets[i].emitter.round_stats.stats.hits++;
          this.bullets.splice(i, 1);
          i -= 1;
          continue bulleting;
        }
      }
      for (let e = 0; e < this.bullets.length; e++) {
        if (
          rectRect(
            this.bullets[i].position.x,
            this.bullets[i].position.y,
            this.bullets[i].size.w,
            this.bullets[i].size.h,
            this.bullets[e].position.x,
            this.bullets[e].position.y,
            this.bullets[e].size.w,
            this.bullets[e].size.h
          ) &&
          i != e
        ) {
          this.bullets[i].emitter.bulletcount--;
          this.bullets[i].emitter.round_stats.stats.hits++;
          this.bullets[e].emitter.bulletcount--;
          this.bullets[e].emitter.round_stats.stats.hits++;
          this.emit_to_room("bullet_explosion", {
            position: {
              x: this.bullets[i].position.x,
              y: this.bullets[i].position.y,
            },
          });
          if (e < i) {
            this.bullets.splice(i, 1);
            this.bullets.splice(e, 1);
            i -= 2;
          } else {
            this.bullets.splice(e, 1);
            this.bullets.splice(i, 1);
            i -= 1;
          }

          continue bulleting;
        }
      }
      for (let socketid in this.players) {
        if (
          this.players[socketid].BulletCollision(this.bullets[i]) &&
          this.players[socketid].alive
        ) {
          this.bullets[i].emitter.bulletcount--;
          this.bullets[i].emitter.round_stats.stats.hits++;

          this.kill(this.bullets[i].emitter, this.players[socketid], "bullet");
          this.bullets.splice(i, 1);
          i -= 1;

          continue bulleting;
        }
      }
    }
  }
  update_mines() {
    //update the mines
    mining: for (let i = 0; i < this.mines.length; i++) {
      this.mines[i].update();
      if (this.mines[i].timealive > this.timetoeplode) {
        for (let m = 0; m < this.blocks.length; m++) {
          if (this.blocks[m].type == 2) {
            if (
              distance(
                this.mines[i].position,
                { w: this.mines[i].radius * 2, h: this.mines[i].radius * 2 },
                this.blocks[m].position,
                this.blocks[m].size
              ) <=
              this.mines_explsion_radius ** 2
            ) {
              this.mines[i].emitter.round_stats.stats.blocks_destroyed++;
              this.blocklist[
                (this.blocks[m].position.y / 50) * 23 +
                  this.blocks[m].position.x / 50
              ] = 10;
              generateBcollision(this);
              this.blocks.splice(m, 1);
              this.io.to(this.name).emit("level_change", {
                blocks: this.blocks,
                Bcollision: this.Bcollision,
                level_id: this.levels[this.levelid],
              });

              m -= 1;
            }
          }
        }
        for (let e = 0; e < this.mines.length; e++) {
          if (
            distance(
              this.mines[i].position,
              { w: this.mines[i].radius * 2, h: this.mines[i].radius * 2 },
              this.mines[e].position,
              { w: this.mines[e].radius * 2, h: this.mines[e].radius * 2 }
            ) <=
            this.mines_explsion_radius ** 2
          ) {
            this.mines[e].timealive = this.timetoeplode;
          }
        }
        for (let socketid in this.players) {
          if (
            distance(
              this.mines[i].position,
              { w: this.mines[i].radius * 2, h: this.mines[i].radius * 2 },
              this.players[socketid].position,
              this.players[socketid].size
            ) <=
              this.mines_explsion_radius ** 2 &&
            this.players[socketid].alive
          ) {
            this.kill(this.mines[i].emitter, this.players[socketid], "mine");
          }
        }

        this.emit_to_room("mine_explosion", {
          position: {
            x: this.mines[i].position.x + this.mines[i].radius / 2,
            y: this.mines[i].position.y + this.mines[i].radius / 2,
          },
        });
        this.sounds.explose = true;
        this.mines[i].emitter.minecount--;
        this.mines.splice(i, 1);
        i -= 1;
        continue mining;
      }
    }
  }
  kill(killer, killed, type) {
    killed.alive = false;
    killer.round_stats.stats.kills++;
    killed.round_stats.stats.deaths++;
    this.nbliving--;
    this.sounds.kill = true;
    this.emit_to_room("player-kill", {
      players: [killer.name, killed.name],
      type: type,
    });
    this.emit_to_room("player_explosion", {
      position: {
        x: killed.position.x + killed.size.w / 2,
        y: killed.position.y + killed.size.h / 2,
      },
    });
  }

  get_all_player_stats() {
    let stats = {};
    for (let socketid in this.players) {
      let player = this.players[socketid];
      stats[socketid] = player.round_stats.stats;
    }
    return stats;
  }
}

try {
  module.exports = Room;
} catch (error) {
  console.error("Error exporting Room class:", error);
}
