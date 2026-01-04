import { useState, useEffect } from "react";
import { User } from "lucide-react";
import { useModal, useSocket } from "../../contexts";
import { Tabs } from "../ui";

const RANKING_TABS = [
  { value: "KILLS", label: "Kills" },
  { value: "WINS", label: "Wins" },
  { value: "ROUNDS_PLAYED", label: "Rounds Played" },
];

export const RankingsModal = () => {
  const { closeModal } = useModal();
  const { socket } = useSocket();
  const [activeTab, setActiveTab] = useState("KILLS");
  const [rankings, setRankings] = useState([]);
  const [personalRank, setPersonalRank] = useState(null);

  useEffect(() => {
    if (!socket) return;

    socket.emit("get_rankings", { type: activeTab });

    socket.on("rankings_response", (data) => {
      setRankings(data.rankings || []);
      setPersonalRank(data.personalRank || null);
    });

    return () => {
      socket.off("rankings_response");
    };
  }, [socket, activeTab]);

  const getRankStyle = (index) => {
    if (index === 0) return "text-yellow-400 font-bold";
    if (index === 1) return "text-gray-300 font-bold";
    if (index === 2) return "text-amber-600 font-bold";
    return "";
  };

  return (
    <dialog className="modal modal-open">
      <div className="modal-box bg-base-200 w-11/12 max-w-3xl h-3/4 p-0 overflow-hidden flex flex-col">
        <h1 className="text-center py-4 text-3xl font-bold">Rankings</h1>

        {/* Custom Tabs - no background, sits directly on modal */}
        <Tabs
          tabs={RANKING_TABS}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        {/* Rankings List - bg matches active tab */}
        <div className="bg-base-100 flex-1 p-4 overflow-y-auto">
          {rankings.length === 0 ? (
            <p className="text-center text-slate-400">No rankings available</p>
          ) : (
            <div className="space-y-2">
              {rankings.map((player, index) => (
                <div
                  key={player.id || index}
                  className="flex items-center bg-base-200 rounded-lg p-3"
                >
                  <span className={`text-2xl w-12 ${getRankStyle(index)}`}>
                    #{index + 1}
                  </span>
                  <User className="w-10 h-10 mx-2 text-primary" />
                  <span className="flex-1 font-semibold">
                    {player.username}
                  </span>
                  <span className="font-bold text-primary">
                    {player.value} {activeTab.replace("_", " ")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Personal Rank */}
        {personalRank && (
          <div className="bg-base-100 px-4 pb-4">
            <div className="divider my-2"></div>
            <div className="flex items-center bg-base-200 rounded-lg p-3">
              <span className="text-2xl font-bold w-12">
                #{personalRank.rank}
              </span>
              <User className="w-10 h-10 mx-2 text-primary" />
              <span className="flex-1 font-semibold">
                {personalRank.username}
              </span>
              <span className="font-bold text-primary">
                {personalRank.value} {activeTab.replace("_", " ")}
              </span>
            </div>
          </div>
        )}

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
