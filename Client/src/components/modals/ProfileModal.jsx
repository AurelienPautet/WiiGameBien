import { useEffect, useState } from "react";
import {
  User,
  LogOut,
  Trophy,
  Activity,
  Swords,
  Skull,
  Target,
  Crosshair,
  TrendingUp,
  Scale,
  Bomb,
  Hammer,
} from "lucide-react";
import { useModal, useAuth, useSocket } from "../../contexts";

export const ProfileModal = () => {
  const { closeModal } = useModal();
  const { user, logout } = useAuth();
  const { socket } = useSocket();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (!socket) return;
    socket.emit("get_player_stats");
    const onStats = (data) => {
      setStats(data);
    };
    socket.on("player_stats", onStats);
    return () => {
      socket.off("player_stats", onStats);
    };
  }, [socket]);

  const handleLogout = () => {
    logout();
    closeModal();
  };

  const s = stats || {};
  const rounds = s.rounds_played || 0;
  const wins = s.wins || 0;
  const kills = s.kills || 0;
  const deaths = s.deaths || 0;
  const shots = s.shots || 0;
  const hits = s.hits || 0;
  const plants = s.plants || 0;
  const blocks = s.blocks_destroyed || 0;
  const winRate =
    rounds > 0 ? ((wins / rounds) * 100).toFixed(2) + "%" : "0.00%";
  const kdRatio = deaths > 0 ? (kills / deaths).toFixed(2) : kills.toFixed(2);
  const accuracy =
    shots > 0 ? ((hits / shots) * 100).toFixed(2) + "%" : "0.00%";

  return (
    <dialog className="modal modal-open">
      <div className="modal-box w-11/12 max-w-4xl bg-base-100 p-0 overflow-hidden">
        {/* Header */}
        {/* Header */}
        <div className="p-8 pb-4 flex flex-col items-center justify-center text-center gap-4">
          <div className="avatar placeholder">
            <div className="bg-primary text-primary-content rounded-full w-24 shadow-lg ring-4 ring-base-100 flex items-center justify-center">
              <User size={48} />
            </div>
          </div>

          <div className="flex flex-col items-center">
            <h2 className="text-4xl font-extrabold text-base-content mb-2">
              {user?.username || "Guest"}
            </h2>
            <p className="flex items-center gap-2">
              <span className="badge badge-lg badge-ghost gap-2">
                {user?.email || "No email"}
              </span>
            </p>
          </div>

          <button
            className="btn btn-error btn-sm btn-ghost gap-2 position-absolute top-4 right-4 absolute"
            onClick={handleLogout}
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>

        {/* content */}
        <div className="p-6 bg-base-100 max-h-[70vh] overflow-y-auto">
          <h3 className="text-lg font-bold mb-4 opacity-80 uppercase tracking-widest text-sm">
            Combat Statistics
          </h3>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <StatCard
              title="Rounds Played"
              value={rounds}
              icon={Activity}
              color="text-info"
            />
            <StatCard
              title="Wins"
              value={wins}
              icon={Trophy}
              color="text-warning"
            />
            <StatCard
              title="Win Rate"
              value={winRate}
              icon={TrendingUp}
              color="text-success"
            />

            <StatCard
              title="Kills"
              value={kills}
              icon={Swords}
              color="text-error"
            />
            <StatCard
              title="Deaths"
              value={deaths}
              icon={Skull}
              color="text-base-content"
            />
            <StatCard
              title="K/D Ratio"
              value={kdRatio}
              icon={Scale}
              color="text-secondary"
            />

            <StatCard
              title="Shots Fired"
              value={shots}
              icon={Crosshair}
              color="text-accent"
            />
            <StatCard
              title="Hits"
              value={hits}
              icon={Target}
              color="text-primary"
            />
            <StatCard
              title="Accuracy"
              value={accuracy}
              icon={Target}
              color="text-primary"
            />

            <StatCard
              title="Mines Planted"
              value={plants}
              icon={Bomb}
              color="text-error"
            />
            <StatCard
              title="Blocks Broken"
              value={blocks}
              icon={Hammer}
              color="text-warning"
            />
          </div>
        </div>

        <div className="modal-action p-6 pt-0 bg-base-100 mt-0">
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

const StatCard = ({ title, value, icon: Icon, color }) => (
  <div className="bg-base-200 p-4 rounded-xl flex items-center gap-4 transition-all hover:bg-base-300">
    <div className={`p-3 rounded-lg bg-base-100 ${color} bg-opacity-10`}>
      <Icon size={24} className={color} />
    </div>
    <div>
      <div className="stat-value text-xl">{value}</div>
      <div className="stat-title text-xs font-bold opacity-60 uppercase">
        {title}
      </div>
    </div>
  </div>
);
