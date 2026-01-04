import { useState, useEffect } from "react";
import { Lock, Plus } from "lucide-react";
import { useModal, useSocket } from "../../contexts";

export const RoomSelectorModal = () => {
  const { closeModal } = useModal();
  const { socket } = useSocket();
  const [rooms, setRooms] = useState([]);
  const [roomName, setRoomName] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (!socket) return;

    socket.emit("get_rooms");

    socket.on("rooms_list", (data) => {
      setRooms(data.rooms || []);
    });

    return () => {
      socket.off("rooms_list");
    };
  }, [socket]);

  const handleJoinRoom = (roomId) => {
    socket?.emit("join_room", { roomId, password });
    closeModal();
  };

  const handleCreateRoom = () => {
    if (!roomName) return;
    socket?.emit("create_room", { name: roomName, password });
    closeModal();
  };

  return (
    <dialog className="modal modal-open">
      <div className="modal-box bg-base-100 w-11/12 max-w-3xl">
        <h2 className="text-2xl font-bold mb-4">Join a Room</h2>

        {/* Room List */}
        <div className="bg-base-200 rounded-md p-4 max-h-64 overflow-y-auto mb-4">
          {rooms.length === 0 ? (
            <p className="text-center text-slate-400">No rooms available</p>
          ) : (
            <div className="space-y-2">
              {rooms.map((room) => (
                <div
                  key={room.id}
                  className="flex items-center justify-between bg-base-100 rounded-lg p-3 hover:bg-base-300 cursor-pointer transition-colors"
                  onClick={() => handleJoinRoom(room.id)}
                >
                  <div>
                    <span className="font-semibold">{room.name}</span>
                    <span className="text-sm text-slate-400 ml-2">
                      by {room.creator}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="badge badge-primary">
                      {room.players}/{room.maxPlayers}
                    </span>
                    {room.hasPassword && (
                      <Lock className="w-4 h-4 text-warning" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="divider">OR CREATE</div>

        {/* Create Room */}
        <div className="flex gap-2">
          <input
            type="text"
            className="input input-bordered flex-1 bg-base-300"
            placeholder="Room name"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
          />
          <input
            type="password"
            className="input input-bordered w-32 bg-base-300"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button className="btn btn-primary gap-1" onClick={handleCreateRoom}>
            <Plus className="w-5 h-5" />
            Create
          </button>
        </div>

        <div className="modal-action">
          <button className="btn" onClick={closeModal}>
            Cancel
          </button>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button onClick={closeModal}>close</button>
      </form>
    </dialog>
  );
};
