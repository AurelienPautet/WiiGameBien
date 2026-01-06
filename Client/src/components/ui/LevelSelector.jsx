import { useState, useEffect } from "react";
import { Search, Gamepad2, Plus, Pencil, Trash2 } from "lucide-react";
import { useSocket, useAuth } from "../../contexts";
import { LevelCard } from "./LevelCard";
import { hexToDataUrl } from "../../utils/levelUtils";

/**
 * LevelSelector - Reusable level selection component
 *
 * @param {Object} props
 * @param {"solo" | "room" | "myLevels"} props.mode - Selection mode
 * @param {Function} props.onSelect - Called with levelId when level is selected (solo mode)
 * @param {Function} props.onMultiSelect - Called with array of levelIds (room mode)
 * @param {Function} props.onEdit - Called with levelId for editing (myLevels mode)
 * @param {Function} props.onDelete - Called with levelId for deletion (myLevels mode)
 * @param {Function} props.onCreate - Called when "Create New" is clicked (myLevels mode)
 */
export function LevelSelector({
  mode = "solo",
  onSelect,
  onMultiSelect,
  onEdit,
  onDelete,
  onCreate,
}) {
  const { socket } = useSocket();
  const { user } = useAuth();
  const [levels, setLevels] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [searchName, setSearchName] = useState("");
  const [maxPlayers, setMaxPlayers] = useState(0);

  // Determine API parameters based on mode
  const showPlayerFilter = mode === "room" || mode === "myLevels";
  const isMultiSelect = mode === "room";
  const showActions = mode === "myLevels";
  const levelType = mode === "solo" ? "solo" : "online";

  useEffect(() => {
    if (!socket) return;

    const handleLevels = (data) => {
      setLevels(data || []);
    };

    // Different API endpoints per mode
    if (mode === "myLevels") {
      socket.on("recieve_my_levels", handleLevels);
      socket.emit("search_my_levels", searchName, maxPlayers);
    } else {
      socket.on("recieve_levels", handleLevels);
      socket.emit("search_levels", searchName, maxPlayers, levelType);
    }

    return () => {
      socket.off("recieve_levels", handleLevels);
      socket.off("recieve_my_levels", handleLevels);
    };
  }, [socket, searchName, maxPlayers, mode, levelType]);

  const handleCardClick = (levelId) => {
    if (showActions) return; // myLevels mode uses buttons instead

    if (isMultiSelect) {
      // Toggle selection for room mode
      setSelectedIds((prev) =>
        prev.includes(levelId)
          ? prev.filter((id) => id !== levelId)
          : [...prev, levelId]
      );
    } else {
      // Single select for solo mode
      setSelectedIds([levelId]);
      onSelect?.(levelId);
    }
  };

  // Notify parent of multi-selection changes
  useEffect(() => {
    if (isMultiSelect) {
      onMultiSelect?.(selectedIds);
    }
  }, [selectedIds, isMultiSelect, onMultiSelect]);

  const handleDelete = (levelId, e) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this level?")) {
      onDelete?.(levelId);
    }
  };

  const handleEdit = (levelId, e) => {
    e.stopPropagation();
    onEdit?.(levelId);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header with filters */}
      <div className="flex gap-4 mb-4">
        <label className="input input-bordered flex items-center gap-2 flex-1 bg-base-200">
          <Search className="w-4 h-4 opacity-70" />
          <input
            type="text"
            className="grow bg-transparent"
            placeholder="Search level name..."
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
          />
        </label>

        {showPlayerFilter && (
          <select
            className="select select-bordered bg-base-200"
            value={maxPlayers}
            onChange={(e) => setMaxPlayers(parseInt(e.target.value))}
          >
            <option value={0}>Any players</option>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <option key={n} value={n}>
                {n} player{n > 1 ? "s" : ""}
              </option>
            ))}
          </select>
        )}

        {mode === "myLevels" && onCreate && (
          <button className="btn btn-primary gap-2" onClick={onCreate}>
            <Plus className="w-5 h-5" />
            New Level
          </button>
        )}
      </div>

      {/* Selection info for room mode */}
      {isMultiSelect && selectedIds.length > 0 && (
        <div className="alert alert-info mb-4 py-2">
          <span>{selectedIds.length} level(s) selected</span>
          <button
            className="btn btn-sm btn-ghost"
            onClick={() => setSelectedIds([])}
          >
            Clear
          </button>
        </div>
      )}

      {/* Level List */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-2">
        {levels.length === 0 ? (
          <div className="text-center text-base-content/50 py-8">
            <Gamepad2 className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p>
              {mode === "myLevels"
                ? "No levels yet. Create your first level!"
                : "No levels found"}
            </p>
          </div>
        ) : (
          levels.map((level) => (
            <div key={level.level_id} className="relative group">
              <LevelCard
                levelId={level.level_id}
                levelName={level.level_name}
                levelJson={level.level_json?.data || []}
                rating={level.level_rating || 0}
                thumbnailSrc={hexToDataUrl(level.level_img)}
                onClick={() => handleCardClick(level.level_id)}
                selected={selectedIds.includes(level.level_id)}
              />

              {/* Action buttons for myLevels mode */}
              {showActions && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    className="btn btn-sm btn-primary gap-1"
                    onClick={(e) => handleEdit(level.level_id, e)}
                  >
                    <Pencil className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    className="btn btn-sm btn-error btn-outline gap-1"
                    onClick={(e) => handleDelete(level.level_id, e)}
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
