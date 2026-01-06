import { useModal, useSocket, useAuth } from "../../contexts";
import { LevelSelector } from "../ui";

export const MyLevelsModal = () => {
  const { closeModal } = useModal();
  const { socket } = useSocket();
  const { user } = useAuth();

  const handleEdit = (levelId) => {
    // TODO: Open level editor with level data
    console.log("Edit level:", levelId);
    // For now, emit to server and close modal
    socket?.emit("load_level_editor", levelId);
    closeModal();
  };

  const handleDelete = (levelId) => {
    socket?.emit("delete_map", levelId);
  };

  const handleCreate = () => {
    // TODO: Open level editor with new level
    console.log("Create new level");
    closeModal();
  };

  if (!user) {
    return (
      <dialog className="modal modal-open">
        <div className="modal-box bg-base-100">
          <h2 className="text-2xl font-bold mb-4">Your Levels</h2>
          <p className="text-base-content/70">
            Please log in to view your levels.
          </p>
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
  }

  return (
    <dialog className="modal modal-open">
      <div className="modal-box bg-base-100 w-11/12 max-w-4xl h-3/4 flex flex-col">
        <h2 className="text-2xl font-bold mb-4">Your Levels</h2>

        <div className="flex-1 min-h-0">
          <LevelSelector
            mode="myLevels"
            onEdit={handleEdit}
            onDelete={handleDelete}
            onCreate={handleCreate}
          />
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
