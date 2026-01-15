import { useEffect, useRef, useCallback, useState } from "react";
import { useGame, useSocket, useModal } from "../../contexts";
import { GameEngine } from "../../engine/GameEngine";
import { EndGameScreen } from "./EndGameScreen";

export const GameCanvas = ({ scale = 1 }) => {
  const canvasRef = useRef(null);
  const fadingCanvasRef = useRef(null);
  const engineRef = useRef(null);
  const [isEndGameVisible, setIsEndGameVisible] = useState(false);

  const {
    mode,
    levelId,
    roomId,
    playerName,
    tankColors,
    pauseGame,
    quitGame,
    isPaused,
    resumeGame,
  } = useGame();
  const { socket } = useSocket();
  const { openModal } = useModal();

  // Listen for winner event to blur canvases
  useEffect(() => {
    if (!socket) return;

    const handleWinner = (data) => {
      setIsEndGameVisible(true);
      // Hide after waiting time
      setTimeout(() => {
        setIsEndGameVisible(false);
      }, data.waitingtime);
    };

    socket.on("winner", handleWinner);
    return () => socket.off("winner", handleWinner);
  }, [socket]);

  // Update engine scale when window is resized
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setScale(scale);
    }
  }, [scale]);

  // Refs for stable access in effect
  const playerNameRef = useRef(playerName);
  const tankColorsRef = useRef(tankColors);

  useEffect(() => {
    playerNameRef.current = playerName;
    tankColorsRef.current = tankColors;
  }, [playerName, tankColors]);

  // Handle pause toggle
  const handlePause = useCallback(
    (e) => {
      // Prevent event propagation if triggered by click
      if (e && e.stopPropagation) e.stopPropagation();

      if (isPaused) {
        resumeGame();
        engineRef.current?.resume();
      } else {
        pauseGame();
        engineRef.current?.pause();
      }
    },
    [isPaused, pauseGame, resumeGame]
  );

  // Handle quit
  const handleQuit = useCallback(() => {
    engineRef.current?.quit();
    quitGame();
  }, [quitGame]);

  // Initialize engine when game starts
  useEffect(() => {
    if (!canvasRef.current || !socket) return;

    // Cleanup previous engine if exists
    if (engineRef.current) {
      engineRef.current.quit();
    }

    const engine = new GameEngine(
      canvasRef.current,
      fadingCanvasRef.current,
      socket
    );
    engineRef.current = engine;

    // Start the appropriate game mode
    const startGame = async () => {
      try {
        if (mode === "solo" && levelId) {
          await engine.startSolo(
            levelId,
            playerNameRef.current,
            tankColorsRef.current
          );
        } else if (mode === "online" && roomId) {
          await engine.startOnline(
            roomId,
            playerNameRef.current,
            tankColorsRef.current
          );
        }
      } catch (err) {
        console.error("Failed to start game:", err);
      }
    };

    startGame();

    // Cleanup on unmount
    return () => {
      engine.quit();
      engineRef.current = null;
    };
  }, [mode, levelId, roomId, socket]);

  // Update engine callbacks separately
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.onPause = () => handlePause(); // Wrap to avoid passing event obj
      engineRef.current.onQuit = handleQuit;
    }
  }, [handlePause, handleQuit]);

  // Handle ESC key for pause
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === "Escape") {
        if (e.repeat) return; // Prevent flickering when holding key
        e.preventDefault();
        e.stopPropagation();
        handlePause();
      }
    };

    window.addEventListener("keydown", handleKeyDown, true); // Use capture to ensure priority
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [handlePause]);

  // Canvas blur style when end game is visible
  const canvasBlurStyle = isEndGameVisible ? { filter: "blur(4px)" } : {};

  return (
    <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-black">
      {/* Fading canvas for track trails */}
      <canvas
        ref={fadingCanvasRef}
        className="absolute"
        style={{ width: 1150, height: 800, ...canvasBlurStyle }}
      />
      {/* Main game canvas */}
      <canvas
        ref={canvasRef}
        className="absolute z-10"
        style={{ width: 1150, height: 800, ...canvasBlurStyle }}
      />

      {/* Pause overlay */}
      {isPaused && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-50 bg-black/50">
          <h2 className="text-4xl font-bold text-white mb-8">PAUSED</h2>
          <div className="flex gap-4">
            <button className="btn btn-primary btn-lg" onClick={handlePause}>
              Resume
            </button>
            <button className="btn btn-error btn-lg" onClick={handleQuit}>
              Quit
            </button>
          </div>
        </div>
      )}

      {/* End game screen overlay */}
      <EndGameScreen />
    </div>
  );
};
