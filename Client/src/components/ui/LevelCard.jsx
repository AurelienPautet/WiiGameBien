import { Star } from "lucide-react";
import { extractBotCounts, getBotColor } from "../../utils/levelUtils";

/**
 * LevelCard - Displays a level preview card with thumbnail, title, rating, and bot counts
 *
 * @param {Object} props
 * @param {number} props.levelId - Level ID
 * @param {string} props.levelName - Level name
 * @param {Array} props.levelJson - Level data for extracting bot counts
 * @param {number} props.rating - Star rating (0-5)
 * @param {string} props.thumbnailSrc - Thumbnail image URL
 * @param {Function} props.onClick - Click handler
 * @param {boolean} props.selected - Whether card is selected
 * @param {boolean} props.locked - Whether level is locked
 * @param {string} props.author - Level author name
 */
export function LevelCard({
  levelId,
  levelName,
  levelJson,
  rating = 0,
  thumbnailSrc,
  onClick,
  selected = false,
  locked = false,
  author,
}) {
  const botCounts = extractBotCounts(levelJson);

  // Generate star rating display
  const stars = [];
  for (let i = 0; i < 5; i++) {
    stars.push(i < rating);
  }

  return (
    <div
      className={`
        relative flex gap-4 p-4 rounded-lg cursor-pointer
        transition-all duration-200
        bg-base-300
        border-4 border-base-300
        ${selected ? "border-primary bg-base-300" : "hover:bg-base-200"}
        ${locked ? "opacity-70" : ""}
      `}
      onClick={locked ? undefined : onClick}
    >
      {/* Lock overlay */}
      {locked && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/30 rounded-lg">
          <span className="text-white text-xl font-bold flex items-center gap-2">
            🔒 Level {levelId} Locked
          </span>
          <p className="text-white/80 text-sm">
            Complete previous levels to unlock
          </p>
        </div>
      )}

      {/* Thumbnail */}
      <div className={`flex-shrink-0 ${locked ? "blur-sm" : ""}`}>
        <img
          src={thumbnailSrc || "ressources/image/minia/test.png"}
          alt={`Level ${levelId} preview`}
          className="w-32 h-24 object-cover rounded border-2 border-base-content/20"
        />
      </div>

      {/* Content */}
      <div
        className={`flex-1 flex flex-col justify-between ${
          locked ? "blur-sm" : ""
        }`}
      >
        {/* Title row */}
        <div className="flex justify-between items-start">
          <div className="flex flex-col">
            <h3 className="text-lg font-bold">
              <span className="text-base-content/60">level {levelId}:</span>
              <span className="ml-2">{levelName}</span>
            </h3>
            <span className="text-xs text-base-content/50">
              by {author || "Unknown"}
            </span>
          </div>

          {/* Star rating */}
          <div className="flex gap-0.5">
            {stars.map((filled, i) => (
              <Star
                key={i}
                size={16}
                className={
                  filled ? "fill-warning text-warning" : "text-base-content/30"
                }
              />
            ))}
          </div>
        </div>

        {/* Bot counts */}
        <div className="flex flex-wrap gap-2 mt-2">
          {Object.entries(botCounts).map(([botType, count]) => (
            <BotBadge key={botType} botType={Number(botType)} count={count} />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * BotBadge - Displays a bot count with tank icon
 */
function BotBadge({ botType, count }) {
  const color = getBotColor(botType);

  return (
    <div className="flex items-center gap-1 bg-base-100 border border-base-content/10 px-2 py-1 rounded">
      <span className="text-sm font-medium">{count}*</span>
      <div className="relative w-8 h-6">
        <img
          src={`ressources/image/tank_player/body_${color}.png`}
          alt=""
          className="absolute w-6 h-6"
        />
        <img
          src={`ressources/image/tank_player/turret_${color}.png`}
          alt=""
          className="absolute w-8 h-5 -left-3"
        />
      </div>
    </div>
  );
}
