import { useState, useEffect } from "react";
import { Search, Plus, Pencil, Trash2, Gamepad2 } from "lucide-react";
import { useModal, useSocket, useAuth } from "../../contexts";

export const MyLevelsModal = () => {
  const { closeModal } = useModal();
  const { socket } = useSocket();
  const { user } = useAuth();
  const [levels, setLevels] = useState([]);
  const [filter, setFilter] = useState({ name: "", maxPlayers: 0 });

  useEffect(() => {
    if (!socket || !user) return;

    socket.emit("get_my_levels", filter);

    socket.on("my_levels_list", (data) => {
      setLevels(data.levels || []);
    });

    return () => {
      socket.off("my_levels_list");
    };
  }, [socket, user, filter]);

  const handleEditLevel = (levelId) => {
    // TODO: Open level editor with level data
    console.log("Edit level:", levelId);
  };

  const handleCreateNew = () => {
    // TODO: Open level editor with new level
    console.log("Create new level");
  };

  const handleDeleteLevel = (levelId) => {
    if (confirm("Are you sure you want to delete this level?")) {
      socket?.emit("delete_level", { levelId });
    }
  };

  return (
    <dialog className="modal modal-open">
      <div className="modal-box bg-base-100 w-11/12 max-w-4xl h-3/4">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Your Levels</h2>
          <button className="btn btn-primary gap-2" onClick={handleCreateNew}>
            <Plus className="w-5 h-5" />
            New Level
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-4 mb-4">
          <label className="input input-bordered flex items-center gap-2 flex-1 bg-base-300">
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
            className="select select-bordered bg-base-300"
            value={filter.maxPlayers}
            onChange={(e) =>
              setFilter({ ...filter, maxPlayers: parseInt(e.target.value) })
            }
          >
            <option value={0}>Any players</option>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <option key={n} value={n}>
                {n} player{n > 1 ? "s" : ""}
              </option>
            ))}
          </select>
        </div>

        {/* Level List */}
        <div className="space-y-4 overflow-y-auto h-[calc(100%-12rem)]">
          {levels.length === 0 ? (
            <div className="text-center text-slate-400 py-8">
              <Gamepad2 className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>No levels yet. Create your first level!</p>
            </div>
          ) : (
            levels.map((level) => (
              <div
                key={level.id}
                className="flex items-center bg-base-200 rounded-lg p-4 hover:bg-base-300 transition-colors"
              >
                <div className="w-24 h-16 bg-base-300 rounded mr-4 flex items-center justify-center">
                  {level.thumbnail ? (
                    <img
                      src={level.thumbnail}
                      alt={level.name}
                      className="w-full h-full object-cover rounded"
                    />
                  ) : (
                    <Gamepad2 className="w-8 h-8 text-primary" />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="font-bold">{level.name}</h3>
                  <div className="flex gap-2 mt-1">
                    <span className="badge badge-sm">{level.maxPlayers}P</span>
                    <span className="badge badge-sm badge-secondary">
                      {level.mode || "online"}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    className="btn btn-sm btn-primary gap-1"
                    onClick={() => handleEditLevel(level.id)}
                  >
                    <Pencil className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    className="btn btn-sm btn-error btn-outline gap-1"
                    onClick={() => handleDeleteLevel(level.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="modal-action">
          <button className="btn" onClick={closeModal}>
            Close
          </button>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button onClick={closeModal}>close</button>
      </form>
    </dialog>
  );
};
