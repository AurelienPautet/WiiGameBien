import { useState } from "react";
import { User } from "lucide-react";
import { useModal, useAuth } from "../../contexts";
import { Tabs } from "../ui";
import { useRankings, usePersonalRank } from "../../hooks/api";

const RANKING_TABS = [
  { value: "KILLS", label: "Kills" },
  { value: "WINS", label: "Wins" },
  { value: "ROUNDS_PLAYED", label: "Rounds Played" },
];

export const RankingsModal = () => {
  const { closeModal } = useModal();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("KILLS");

  // React Query hooks
  const { data: rankings = [], isLoading } = useRankings(activeTab);
  const { data: personalRank } = usePersonalRank(activeTab);

  const getRankBgClass = (rank) => {
    if (rank == 1) return "bg-yellow-500"; // Gold
    if (rank == 2) return "bg-zinc-500"; // Silver
    if (rank == 3) return "bg-yellow-700"; // Bronze
    return "bg-base-200";
  };

  const getRankTextClass = (rank) => {
    if (rank <= 3) return "text-white font-bold";
    return "";
  };

  return (
    <dialog className="modal modal-open">
      <div className="modal-box bg-base-200 w-11/12 max-w-3xl h-3/4 p-0 overflow-hidden flex flex-col">
        <h1 className="text-center py-4 text-3xl font-bold">Online Rankings</h1>

        {/* Tabs */}
        <Tabs
          tabs={RANKING_TABS}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        {/* Rankings List */}
        <div className="bg-base-100 flex-1 p-4 overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <span className="loading loading-spinner loading-lg"></span>
            </div>
          ) : rankings.length === 0 ? (
            <p className="text-center text-slate-400">No rankings available</p>
          ) : (
            <div className="space-y-2">
              {rankings.map((player) => (
                <div
                  key={player.username}
                  className={`flex items-center rounded-lg p-3 ${getRankBgClass(
                    player.rank,
                  )} ${getRankTextClass(player.rank)}`}
                >
                  <span className="text-2xl w-12 text-center font-bold">
                    {player.rank}
                  </span>
                  <User className="w-10 h-10 mx-2" />
                  <span className="flex-1 font-semibold">
                    {player.username}
                  </span>
                  <span className="font-bold mr-4">
                    {player.total_data} {activeTab.replace("_", " ")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Personal Rank Section */}
        <div className="bg-base-100 px-4 pb-4">
          <div className="divider my-2"></div>
          {user && personalRank ? (
            <div
              className={`flex items-center rounded-lg p-3 ${getRankBgClass(
                personalRank.rank,
              )} ${getRankTextClass(personalRank.rank)}`}
            >
              <span className="text-2xl w-12 text-center font-bold">
                {personalRank.rank}
              </span>
              <User className="w-10 h-10 mx-2" />
              <span className="flex-1 font-semibold">
                {personalRank.username} (YOU)
              </span>
              <span className="font-bold mr-4">
                {personalRank.total_data} {activeTab.replace("_", " ")}
              </span>
            </div>
          ) : (
            <div className="flex items-center bg-base-200 rounded-lg p-3">
              <span className="text-2xl w-12 text-center font-bold">XXX</span>
              <User className="w-10 h-10 mx-2 text-base-content/50" />
              <span className="flex-1 font-semibold text-base-content/70">
                Login to see your own rank
              </span>
              <span className="font-bold mr-4 text-base-content/50">
                XXX {activeTab.replace("_", " ")}
              </span>
            </div>
          )}
        </div>

        <div className="bg-base-100 p-4 flex justify-center">
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
