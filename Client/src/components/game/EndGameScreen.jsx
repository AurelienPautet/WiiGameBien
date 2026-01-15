import { useState, useEffect, useCallback } from "react";
import { useSocket, useAuth, useToast, TOAST_TYPES } from "../../contexts";
import { hexToDataUrl } from "../../utils/levelUtils";

export const EndGameScreen = () => {
  const { socket } = useSocket();
  const { user } = useAuth();
  const { addToast } = useToast();

  const [visible, setVisible] = useState(false);
  const [result, setResult] = useState(null); // 'win' | 'lose' | 'draw'
  const [resultName, setResultName] = useState(""); // Winner's name for lose case
  const [scores, setScores] = useState([]);

  // Level info from level_change_info event (not winner event)
  const [levelInfo, setLevelInfo] = useState({
    id: null,
    name: "",
    creator: "",
    thumbnail: null,
  });

  const [stars, setStars] = useState([0, 0, 0, 0, 0]);
  const [hoveredStar, setHoveredStar] = useState(-1);

  // Listen to level_change_info to get level info from DB
  useEffect(() => {
    if (!socket) return;

    const handleLevelChangeInfo = (levels) => {
      if (levels && levels.length > 0) {
        const level = levels[0];
        setLevelInfo({
          id: level.level_id || level.id,
          name: level.level_name || "Unknown",
          creator: level.level_creator_name || "Unknown",
          thumbnail: level.level_img ? hexToDataUrl(level.level_img) : null,
        });
        // Reset stars when level changes
        setStars([0, 0, 0, 0, 0]);
      }
    };

    socket.on("level_change_info", handleLevelChangeInfo);

    return () => {
      socket.off("level_change_info", handleLevelChangeInfo);
    };
  }, [socket]);

  // Handle winner event from server
  useEffect(() => {
    if (!socket) return;

    const handleWinner = (data) => {
      const { socketid, waitingtime, player_scores, ids_to_name } = data;

      // Determine result
      let resultType;
      let winnerName = "";
      if (socketid === -1) {
        resultType = "draw";
      } else if (socketid === socket.id) {
        resultType = "win";
      } else {
        resultType = "lose";
        winnerName = ids_to_name[socketid] || "Unknown";
      }
      setResult(resultType);
      setResultName(winnerName);

      // Process scores - sort by wins
      const highestWins = Math.max(
        ...Object.values(player_scores).map((s) => s.wins)
      );
      const highestKills = Math.max(
        ...Object.values(player_scores).map((s) => s.kills)
      );
      const highestDeaths = Math.max(
        ...Object.values(player_scores).map((s) => s.deaths)
      );

      const sortedScores = Object.entries(player_scores)
        .map(([id, score]) => ({
          id,
          name: ids_to_name[id],
          wins: score.wins,
          kills: score.kills,
          deaths: score.deaths,
          isWinner: score.wins === highestWins,
          hasHighestKills: score.kills === highestKills,
          hasHighestDeaths: score.deaths === highestDeaths,
        }))
        .sort((a, b) => b.wins - a.wins);

      setScores(sortedScores);
      setVisible(true);

      // Auto-hide after waiting time
      setTimeout(() => {
        setVisible(false);
        setResult(null);
        setResultName("");
        setScores([]);
      }, waitingtime);
    };

    // Get current rating when level info is loaded
    // Server sends a number (e.g., 3) representing star count
    const handleYourRating = (serverStars) => {
      if (typeof serverStars === "number" && serverStars > 0) {
        // Convert number to array: 3 -> [1, 1, 1, 0, 0]
        const starsArray = [0, 1, 2, 3, 4].map((i) =>
          i < serverStars ? 1 : 0
        );
        setStars(starsArray);
      } else if (Array.isArray(serverStars)) {
        setStars(serverStars);
      }
    };

    const handleRateSuccess = (rate) => {
      addToast(
        TOAST_TYPES.SUCCESS,
        "Success",
        `You rated the level with ${rate} stars`
      );
    };

    const handleRateFail = (reason) => {
      addToast(TOAST_TYPES.ERROR, "Error", `Can't rate: ${reason}`);
    };

    socket.on("winner", handleWinner);
    socket.on("your_level_rating", handleYourRating);
    socket.on("rate_success", handleRateSuccess);
    socket.on("rate_fail", handleRateFail);

    return () => {
      socket.off("winner", handleWinner);
      socket.off("your_level_rating", handleYourRating);
      socket.off("rate_success", handleRateSuccess);
      socket.off("rate_fail", handleRateFail);
    };
  }, [socket, addToast]);

  // Star hover handler
  const handleStarHover = useCallback(
    (index) => {
      if (!user) return;
      setHoveredStar(index);
    },
    [user]
  );

  // Star click handler
  const handleStarClick = useCallback(
    (index) => {
      if (!user) {
        addToast(
          TOAST_TYPES.ERROR,
          "Error",
          "You need to be logged in to rate a level"
        );
        return;
      }
      if (!levelInfo.id) {
        addToast(TOAST_TYPES.ERROR, "Error", "No level to rate");
        return;
      }

      // Update local state
      const newStars = [0, 0, 0, 0, 0].map((_, i) => (i <= index ? 1 : 0));
      setStars(newStars);

      // Send rating to server
      socket?.emit("rate_lvl", index + 1, levelInfo.id);
    },
    [user, levelInfo.id, socket, addToast]
  );

  // Get displayed stars (either hovered or actual)
  const getDisplayedStars = useCallback(() => {
    if (hoveredStar >= 0) {
      return [0, 1, 2, 3, 4].map((i) => i <= hoveredStar);
    }
    return stars.map((s) => s === 1);
  }, [hoveredStar, stars]);

  if (!visible) return null;

  const resultText = {
    win: "You Won!",
    lose: resultName ? `${resultName} Won :(` : "You Lost :(",
    draw: "Draw",
  }[result];

  const resultColor = {
    win: "text-green-500",
    lose: "text-red-500",
    draw: "text-yellow-500",
  }[result];

  const borderColor = {
    win: "border-green-500",
    lose: "border-red-500",
    draw: "border-yellow-500",
  }[result];

  const displayedStars = getDisplayedStars();

  return (
    <div
      className={`absolute inset-0 z-60 flex flex-col items-center justify-evenly border-8 ${borderColor} pointer-events-auto`}
    >
      {/* Result text */}
      <div className={`text-4xl font-bold ${resultColor}`}>{resultText}</div>

      {/* Scores table */}
      <div className="flex flex-col items-center justify-center w-full max-w-2xl gap-2">
        {scores.map((score, index) => (
          <div
            key={score.id}
            className="w-full text-xl font-bold flex items-center justify-center gap-2 animate-[scoreCascade_0.5s_ease-out_forwards] opacity-0"
            style={{ animationDelay: `${index * 0.15}s` }}
          >
            <span className={score.isWinner ? "text-yellow-500" : "text-white"}>
              {score.name} : {score.wins}
            </span>
            <span className="text-gray-400">............</span>
            <span className="text-white">kills : </span>
            <span
              className={
                score.hasHighestKills ? "text-green-500" : "text-white"
              }
            >
              {score.kills}
            </span>
            <span className="text-white ml-2">deaths : </span>
            <span
              className={score.hasHighestDeaths ? "text-red-500" : "text-white"}
            >
              {score.deaths}
            </span>
          </div>
        ))}
      </div>

      {/* Level info and rating */}
      <div className="flex items-center justify-center gap-4 text-white text-xl font-bold">
        {levelInfo.thumbnail && (
          <img
            src={levelInfo.thumbnail}
            alt="Level thumbnail"
            className="w-32 h-20 rounded object-cover"
          />
        )}
        <span>{levelInfo.name}</span>
        <span className="text-gray-400">by</span>
        <span>{levelInfo.creator}</span>

        {/* Star rating */}
        <div className="flex gap-1" onMouseLeave={() => setHoveredStar(-1)}>
          {[0, 1, 2, 3, 4].map((i) => (
            <span
              key={i}
              className={`text-3xl cursor-pointer transition-all duration-150 hover:scale-110 ${
                displayedStars[i] ? "text-yellow-400" : "text-gray-500"
              } ${!user ? "cursor-not-allowed opacity-60" : ""}`}
              onMouseEnter={() => handleStarHover(i)}
              onClick={() => handleStarClick(i)}
            >
              ★
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
