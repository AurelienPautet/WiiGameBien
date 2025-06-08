rankings_content = document.getElementById("rankings_content");
personal_rank_content = document.getElementById("personal_rank_content");
current_ranking = "KILLS";

function show_rankings(ranking_type) {
  ////console.log("show_rankings", ranking_type);
  socket.emit("ranking", ranking_type);
  old_ranking = document.getElementById(`ranking_button_${current_ranking}`);
  old_ranking.classList.remove("bg-slate-700");
  old_ranking.classList.add("bg-slate-600");
  current_ranking = ranking_type;
  new_ranking = document.getElementById(`ranking_button_${current_ranking}`);
  new_ranking.classList.remove("bg-slate-600");
  new_ranking.classList.add("bg-slate-700");
  show_personal_rank();
}

socket.on("ranking", (ranking, ranking_type) => {
  remove_all_rank_cards();

  ranking.forEach((row, index) => {
    if (row.rank == 1) {
      add_rank_card(
        row.rank,
        row.username,
        row.total_data,
        ranking_type,
        "bg-yellow-500"
      );
    } else if (row.rank == 2) {
      add_rank_card(
        row.rank,
        row.username,
        row.total_data,
        ranking_type,
        "bg-zinc-500"
      );
    } else if (row.rank == 3) {
      add_rank_card(
        row.rank,
        row.username,
        row.total_data,
        ranking_type,
        "bg-yellow-700"
      );
    } else {
      add_rank_card(row.rank, row.username, row.total_data, ranking_type);
    }
  });
});

socket.on("personal_ranking", (data) => {
  let card = document.createElement("div");
  bg_color = "bg-slate-500";
  if (data.rank == 1) {
    bg_color = "bg-yellow-500";
  } else if (data.rank == 2) {
    bg_color = "bg-zinc-500";
  } else if (data.rank == 3) {
    bg_color = "bg-yellow-700";
  }
  card.className = `w-full h-14 rounded-lg ${bg_color} flex flex-row items-center mt-2 mb-2`;
  card.innerHTML = `
  <h1 class="mr-4 ml-2 text-2xl w-10 text-center">${data.rank}</h1>
  <img src="./icons/login.svg" class="w-10 h-10" />
  <h1 class="m-2">${data.username} (YOU)</h1>
  <h1 class="mr-10 ml-auto">${data.total_data} ${current_ranking}</h1>
`;
  personal_rank_content.innerHTML = "";
  personal_rank_content.appendChild(card);
});

function show_personal_rank() {
  //console.log("update_personal_rank", logged);
  if (logged) {
    socket.emit("personal_ranking", socket.id, current_ranking);
  } else {
    let card = document.createElement("div");
    card.className = `w-full h-14 rounded-lg bg-slate-500 flex flex-row items-center mt-2 mb-2`;
    card.innerHTML = `
    <h1 class="mr-4 ml-2 text-2xl w-10 text-center">XXX</h1>
    <img src="./icons/login.svg" class="w-10 h-10" />
    <h1 class="m-2">Login to see your own rank</h1>
    <h1 class="mr-10 ml-auto">XXX ${current_ranking}</h1>
  `;
    personal_rank_content.innerHTML = "";
    personal_rank_content.appendChild(card);
  }
}

function add_rank_card(
  rank,
  name,
  value,
  unity,
  special_color = "bg-slate-500"
) {
  let card = document.createElement("div");
  card.className = `w-full h-14 rounded-lg ${special_color} flex flex-row items-center mt-2 mb-2`;
  card.innerHTML = `
        <h1 class="mr-4 ml-2 text-2xl w-10 text-center">${rank}</h1>
        <img src="./icons/login.svg" class="w-10 h-10" />
        <h1 class="m-2">${name}</h1>
        <h1 class="mr-10 ml-auto">${value} ${unity}</h1>
    `;
  rankings_content.appendChild(card);
}

add_rank_card(1, "Player1", 1000, "kills", "bg-yellow-500");
add_rank_card(2, "Player2", 900, "kills", "bg-zinc-500");
add_rank_card(3, "Player3", 800, "kills", "bg-yellow-700");
add_rank_card(4, "Player4", 700, "kills");
add_rank_card(5, "Player5", 600, "kills");
add_rank_card(6, "Player6", 500, "kills");
add_rank_card(7, "Player7", 400, "kills");

function remove_all_rank_cards() {
  rankings_content.innerHTML = "";
}
