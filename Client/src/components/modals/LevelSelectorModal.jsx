import { useState, useEffect } from "react";
import { Search, Gamepad2, Star } from "lucide-react";
import { useModal, useSocket } from "../../contexts";

export const LevelSelectorModal = () => {
  const { closeModal } = useModal();
  const { socket } = useSocket();
  const [levels, setLevels] = useState([]);
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [filter, setFilter] = useState({ name: "", maxPlayers: 0 });

  useEffect(() => {
    if (!socket) return;

    // Response comes as "recieve_levels" (typo in original server code)
    const handleLevels = (data) => {
      setLevels(data || []);
    };

    // Set up listener BEFORE emitting
    socket.on("recieve_levels", handleLevels);

    // Request levels - uses "search_levels" with (name, maxPlayers, type)
    // type "solo" for solo levels
    socket.emit("search_levels", filter.name, filter.maxPlayers, "solo");

    return () => {
      socket.off("recieve_levels", handleLevels);
    };
  }, [socket, filter]);

  const handlePlayLevel = () => {
    if (!selectedLevel) return;
    // TODO: Start solo game with selected level
    socket?.emit("play_solo", { levelId: selectedLevel });
    closeModal();
  };

  return (
    <dialog className="modal modal-open">
      <div className="modal-box bg-base-100 w-11/12 max-w-4xl h-3/4">
        <h2 className="text-2xl font-bold mb-4">Select Level</h2>

        {/* Filters */}
        <div className="flex gap-4 mb-4">
          <label className="input input-bordered flex items-center gap-2 flex-1 bg-base-200">
            <Search className="w-4 h-4 opacity-70" />
            <input
              type="text"
              className="grow bg-transparent"
              placeholder="Search level name..."
              value={filter.name}
              onChange={(e) => setFilter({ ...filter, name: e.target.value })}
            />
          </label>
          <select
            className="select select-bordered bg-base-200"
            value={filter.maxPlayers}
            onChange={(e) =>
              setFilter({ ...filter, maxPlayers: parseInt(e.target.value) })
            }
          >
            <option value={0}>Any players</option>
            <option value={1}>1 player</option>
            <option value={2}>2 players</option>
            <option value={3}>3 players</option>
            <option value={4}>4 players</option>
          </select>
        </div>

        {/* Level Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 overflow-y-auto h-[calc(100%-12rem)]">
          {levels.length === 0 ? (
            <div className="col-span-full text-center text-slate-400 py-8">
              <Gamepad2 className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>No levels found</p>
            </div>
          ) : (
            levels.map((level) => (
              <div
                key={level.level_id}
                className={`card bg-base-200 cursor-pointer hover:bg-base-300 transition-colors
                  ${
                    selectedLevel === level.level_id
                      ? "ring-4 ring-primary"
                      : ""
                  }`}
                onClick={() => setSelectedLevel(level.level_id)}
              >
                <figure className="h-32 bg-base-300 flex items-center justify-center overflow-hidden">
                  {level.level_img ? (
                    <img
                      src={`data:image/png;base64,${btoa(
                        level.level_img
                          .match(/.{1,2}/g)
                          .map((byte) =>
                            String.fromCharCode(parseInt(byte, 16))
                          )
                          .join("")
                      )}`}
                      alt={level.level_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Gamepad2 className="w-12 h-12 text-primary" />
                  )}
                </figure>
                <div className="card-body p-3">
                  <h3 className="card-title text-sm">{level.level_name}</h3>
                  <p className="text-xs text-slate-400">
                    by {level.level_creator_name}
                  </p>
                  <div className="flex gap-1 mt-1">
                    <span className="badge badge-sm">
                      {level.level_max_players}P
                    </span>
                    {level.level_rating && (
                      <span className="badge badge-sm badge-warning gap-1">
                        <Star className="w-3 h-3" />{" "}
                        {parseFloat(level.level_rating).toFixed(1)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="modal-action">
          <button className="btn" onClick={closeModal}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            disabled={!selectedLevel}
            onClick={handlePlayLevel}
          >
            Play
          </button>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button onClick={closeModal}>close</button>
      </form>
    </dialog>
  );
};
