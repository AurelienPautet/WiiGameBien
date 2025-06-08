function get_player_stats() {
  //console.log("Requesting player stats");
  socket.emit("get_player_stats");
}

socket.on("player_stats", (stats) => {
  //console.log("Received player stats:", stats);
  const player_stats_div = document.getElementById("player_stats");

  const kills = stats.kills || 0;
  const deaths = stats.deaths || 0;
  const wins = stats.wins || 0;
  const shots = stats.shots || 0;
  const hits = stats.hits || 0;
  const plants = stats.plants || 0;
  const blocks_destroyed = stats.blocks_destroyed || 0;
  const rounds_played = stats.rounds_played || 0;

  const win_rate =
    stats.rounds_played > 0
      ? ((stats.wins / stats.rounds_played) * 100).toFixed(2)
      : "0.00";
  const kd_ratio = deaths > 0 ? (kills / deaths).toFixed(2) : kills.toFixed(2);
  const accuracy = shots > 0 ? ((hits / shots) * 100).toFixed(2) : "0.00";

  player_stats_div.innerHTML = `
      <div class="grid md:grid-cols-3 sm:grid-cols-2 grid-cols-1 gap-4 p-4 w-full">
        ${create_stats_card(
          "Rounds Played",
          rounds_played,
          "",
          "/assets/icons/rounds.png"
        )}
        ${create_stats_card("Wins", wins, "", "/assets/icons/wins.png")}
        ${create_stats_card(
          "Win Rate",
          win_rate,
          "%",
          "/assets/icons/winrate.png"
        )}
        ${create_stats_card("Kills", kills, "", "/assets/icons/kills.png")}
        ${create_stats_card("Deaths", deaths, "", "/assets/icons/deaths.png")}
        ${create_stats_card("K/D Ratio", kd_ratio, "", "/assets/icons/kd.png")}
        ${create_stats_card("Shots", shots, "", "/assets/icons/shots.png")}
        ${create_stats_card("Hits", hits, "", "/assets/icons/hits.png")}
        ${create_stats_card(
          "Accuracy",
          accuracy,
          "%",
          "/assets/icons/accuracy.png"
        )}
        ${create_stats_card("Plants", plants, "", "/assets/icons/plants.png")}
        ${create_stats_card(
          "Blocks Destroyed",
          blocks_destroyed,
          "",
          "/assets/icons/blocks.png"
        )}
      </div>
    `;
});

function create_stats_card(stat_name, stat_value, stat_unity, stat_icon) {
  return `
      <div class="bg-slate-500 h-48 w-full flex flex-col items-center justify-center rounded-md shadow">
        <!-- <img src="${stat_icon}" class="w-10 h-10 mb-2" alt="${stat_name} icon"> -->
        <div class="text-center">
          <h3 class="text-xl font-bold text-white">${stat_name}</h3>
          <p class="text-white text-lg">${stat_value} ${stat_unity}</p>
        </div>
      </div>`;
}
