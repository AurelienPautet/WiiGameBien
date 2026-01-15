import { useSocket } from "../../contexts";

const OnlineIndicator = () => {
  const { onlineCount, isConnected } = useSocket();

  return (
    <div
      className="absolute top-3 right-3 flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-sm z-50"
      style={{
        background: "rgba(0, 0, 0, 0.5)",
        border: "1px solid rgba(255, 255, 255, 0.1)",
      }}
    >
      {/* Status dot */}
      <div
        className="w-2 h-2 rounded-full"
        style={{
          backgroundColor: isConnected ? "#22c55e" : "#ef4444",
          boxShadow: isConnected ? "0 0 6px #22c55e" : "0 0 6px #ef4444",
        }}
      />
      {/* Player count */}
      <span
        className="text-xs font-medium"
        style={{ color: "rgba(255, 255, 255, 0.8)" }}
      >
        {onlineCount} online
      </span>
    </div>
  );
};

export default OnlineIndicator;
