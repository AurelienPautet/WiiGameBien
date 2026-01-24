import { useEffect, useRef, useCallback, useState } from "react";
import { useGame, useSocket, useModal, MODALS } from "../../contexts";
import { GameEngine } from "../../engine/GameEngine";
import { EndGameScreen } from "./EndGameScreen";
import { CountdownOverlay } from "./CountdownOverlay";
import { useSubmitSoloRound } from "../../hooks/api";

export const GameCanvas = ({ scale = 1 }) => {
  const canvasRef = useRef(null);
  const fadingCanvasRef = useRef(null);
  const engineRef = useRef(null);
  const [isEndGameVisible, setIsEndGameVisible] = useState(false);
  const [soloResult, setSoloResult] = useState(null);
  const [showCountdown, setShowCountdown] = useState(false);

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
    theme,
  } = useGame();
  const { socket } = useSocket();
  const { openModal } = useModal();

  // Mutation for submitting solo rounds
  const submitSoloRoundMutation = useSubmitSoloRound();

  // Refs for stable access in effect
  const playerNameRef = useRef(playerName);
  const tankColorsRef = useRef(tankColors);

  useEffect(() => {
    playerNameRef.current = playerName;
    tankColorsRef.current = tankColors;
  }, [playerName, tankColors]);

  // Listen for winner event to blur canvases (online mode)
  useEffect(() => {
    if (!socket) return;

    const handleWinner = (data) => {
      setIsEndGameVisible(true);
      // Hide after waiting time - countdown will be triggered by server
      setTimeout(() => {
        setIsEndGameVisible(false);
      }, data.waitingtime);
    };

    // Listen for countdown start from server (after respawn in multiplayer)
    const handleCountdownStartServer = () => {
      setShowCountdown(true);
      // Server controls the timing, client just shows the UI
    };

    socket.on("winner", handleWinner);
    socket.on("countdown_start", handleCountdownStartServer);

    return () => {
      socket.off("winner", handleWinner);
      socket.off("countdown_start", handleCountdownStartServer);
    };
  }, [socket]);

  // Handle countdown start callback from engine
  const handleCountdownStart = useCallback(() => {
    setShowCountdown(true);
  }, []);

  // Handle countdown complete - tell engine to start gameplay
  const handleCountdownComplete = useCallback(() => {
    setShowCountdown(false);
    if (engineRef.current) {
      engineRef.current.endCountdown();
    }
  }, []);

  // Handle Solo Game Over callback - submit round to server
  const handleSoloGameOver = useCallback(
    (result) => {
      setSoloResult(result);
      setIsEndGameVisible(true);

      // Submit solo round to server for stats tracking
      if (levelId) {
        submitSoloRoundMutation.mutate({
          levelId,
          success: result.result === "win",
          timeMs: (result.timeElapsed || 0) * 1000,
          kills: result.stats?.kills || 0,
          deaths: result.stats?.deaths || 0,
          shots: result.stats?.shots || 0,
          hits: result.stats?.hits || 0,
          plants: result.stats?.plants || 0,
          blocksDestroyed: result.stats?.blocksDestroyed || 0,
        });
      }
    },
    [levelId, submitSoloRoundMutation],
  );

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
    [isPaused, pauseGame, resumeGame],
  );

  // Handle quit
  const handleQuit = useCallback(() => {
    const wasSolo = mode === "solo";
    setSoloResult(null);
    setIsEndGameVisible(false);
    setShowCountdown(false);
    engineRef.current?.quit();
    quitGame();

    if (wasSolo) {
      openModal(MODALS.LEVEL_SELECTOR);
    }
  }, [quitGame, mode, openModal]);

  // Handle replay - creates fresh engine instance
  const handleReplay = useCallback(() => {
    setSoloResult(null);
    setIsEndGameVisible(false);
    setShowCountdown(false);

    // Cleanup old engine completely
    if (engineRef.current) {
      engineRef.current.quit();
      engineRef.current = null;
    }

    // Create a fresh engine
    if (canvasRef.current && fadingCanvasRef.current && socket) {
      const engine = new GameEngine(
        canvasRef.current,
        fadingCanvasRef.current,
        socket,
      );
      engineRef.current = engine;

      // Set callbacks
      engine.onPause = () => handlePause();
      engine.onQuit = handleQuit;
      engine.onGameOver = handleSoloGameOver;
      engine.onCountdownStart = handleCountdownStart;
      engine.setScale(scale);

      // Start the game (countdown will be triggered by engine)
      engine.startSolo(levelId, playerNameRef.current, tankColorsRef.current);
    }
  }, [
    levelId,
    socket,
    scale,
    handlePause,
    handleQuit,
    handleSoloGameOver,
    handleCountdownStart,
  ]);

  // Update engine scale when window is resized
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setScale(scale);
    }
  }, [scale]);

  // Update engine theme
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setTheme(theme);
    }
  }, [theme]);

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
      socket,
    );
    engineRef.current = engine;

    // Start the appropriate game mode
    const startGame = async () => {
      try {
        if (mode === "solo" && levelId) {
          await engine.startSolo(
            levelId,
            playerNameRef.current,
            tankColorsRef.current,
          );
        } else if (mode === "online" && roomId) {
          await engine.startOnline(
            roomId,
            playerNameRef.current,
            tankColorsRef.current,
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
      engineRef.current.onPause = () => handlePause();
      engineRef.current.onQuit = handleQuit;
      engineRef.current.onGameOver = handleSoloGameOver;
      engineRef.current.onCountdownStart = handleCountdownStart;
    }
  }, [handlePause, handleQuit, handleSoloGameOver, handleCountdownStart]);

  // Handle ESC key for pause (but not during countdown)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === "Escape" && !showCountdown) {
        if (e.repeat) return;
        e.preventDefault();
        e.stopPropagation();
        handlePause();
      } else if (e.key === "Shift" && !e.repeat) {
        engineRef.current?.toggleDebug();
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [handlePause, showCountdown]);

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

      {/* Countdown overlay */}
      <CountdownOverlay
        isActive={showCountdown}
        onComplete={handleCountdownComplete}
      />

      {/* Pause overlay */}
      {isPaused && !showCountdown && (
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
      <EndGameScreen
        externalResult={soloResult}
        onReplay={handleReplay}
        onQuit={handleQuit}
        levelId={levelId}
      />
    </div>
  );
};
