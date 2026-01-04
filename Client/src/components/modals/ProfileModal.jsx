import { User, LogOut } from "lucide-react";
import { useModal, useAuth } from "../../contexts";

export const ProfileModal = () => {
  const { closeModal } = useModal();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    closeModal();
  };

  return (
    <dialog className="modal modal-open">
      <div className="modal-box bg-base-100">
        {/* Header */}
        <div className="bg-neutral rounded-t-md p-4 flex items-center justify-between -m-6 mb-4">
          <div className="flex items-center font-extrabold text-white">
            <User className="w-16 h-16 text-primary" />
            <div className="ml-4">
              <h2 className="text-xl">Username: {user?.username}</h2>
              <p className="text-sm opacity-70">Email: {user?.email}</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="stats stats-vertical w-full bg-base-200 mt-6">
          <div className="stat">
            <div className="stat-title">Kills</div>
            <div className="stat-value text-primary">
              {user?.stats?.kills || 0}
            </div>
          </div>
          <div className="stat">
            <div className="stat-title">Wins</div>
            <div className="stat-value text-primary">
              {user?.stats?.wins || 0}
            </div>
          </div>
          <div className="stat">
            <div className="stat-title">Rounds Played</div>
            <div className="stat-value text-primary">
              {user?.stats?.rounds || 0}
            </div>
          </div>
        </div>

        <div className="modal-action">
          <button className="btn btn-error gap-2" onClick={handleLogout}>
            <LogOut className="w-5 h-5" />
            Logout
          </button>
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
