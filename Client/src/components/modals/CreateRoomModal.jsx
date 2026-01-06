import { useState, useCallback } from "react";
import { useModal, useSocket } from "../../contexts";
import { LevelSelector } from "../ui";

export const CreateRoomModal = () => {
  const { closeModal } = useModal();
  const { socket } = useSocket();
  const [selectedLevels, setSelectedLevels] = useState([]);
  const [roomName, setRoomName] = useState("");
  const [password, setPassword] = useState("");
  const [rounds, setRounds] = useState(10);

  const handleMultiSelect = useCallback((levelIds) => {
    setSelectedLevels(levelIds);
  }, []);

  const handleCreateRoom = () => {
    if (!roomName || selectedLevels.length === 0) return;

    socket?.emit("create_room", {
      name: roomName,
      password,
      rounds,
      levels: selectedLevels,
    });
    closeModal();
  };

  return (
    <dialog className="modal modal-open">
      <div className="modal-box bg-base-100 w-11/12 max-w-4xl h-3/4 flex flex-col">
        <h2 className="text-2xl font-bold mb-4">Create Room</h2>

        {/* Room settings */}
        <div className="flex gap-4 mb-4">
          <input
            type="text"
            className="input input-bordered flex-1 bg-base-200"
            placeholder="Room name"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
          />
          <input
            type="password"
            className="input input-bordered w-32 bg-base-200"
            placeholder="Password (optional)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <div className="flex items-center gap-2">
            <span className="text-sm">Rounds:</span>
            <input
              type="number"
              className="input input-bordered w-20 bg-base-200"
              min={1}
              max={99}
              value={rounds}
              onChange={(e) => setRounds(parseInt(e.target.value) || 1)}
            />
          </div>
        </div>

        {/* Level selector */}
        <div className="flex-1 min-h-0">
          <LevelSelector mode="room" onMultiSelect={handleMultiSelect} />
        </div>

        <div className="modal-action">
          <button className="btn" onClick={closeModal}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            disabled={!roomName || selectedLevels.length === 0}
            onClick={handleCreateRoom}
          >
            Create Room ({selectedLevels.length} levels)
          </button>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button onClick={closeModal}>close</button>
      </form>
    </dialog>
  );
};
