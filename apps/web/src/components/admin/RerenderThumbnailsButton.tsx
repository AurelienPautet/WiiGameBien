import { useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "../ui/primitives";
import {
  useRerenderAdminLevelThumbnails,
  type ThumbnailRerenderProgress,
  type ThumbnailRerenderResult,
} from "../../hooks/api";

// The dialog is a little state machine: review the warning → watch the run →
// read the summary (or the error). Keeping it in one dialog means an admin
// never loses sight of a running job.
type Phase = "confirm" | "running" | "done" | "error";

const EMPTY_PROGRESS: ThumbnailRerenderProgress = {
  done: 0,
  total: 0,
  failed: 0,
};

// "12 thumbnails updated, 3 skipped." — plus a note when Stop cut the run.
const describeResult = (result: ThumbnailRerenderResult): string => {
  const updated = `${result.done} thumbnail${result.done === 1 ? "" : "s"} updated`;
  const skipped = result.failed > 0 ? `, ${result.failed} skipped` : "";
  if (result.stopped) return `Stopped early — ${updated}${skipped}.`;
  if (result.done === 0 && result.failed === 0)
    return "No levels found to re-render.";
  return `${updated}${skipped}.`;
};

// Content-tab action that rewrites every stored level thumbnail with the
// CURRENT renderer (the same one the editor saves with), then invalidates the
// level queries so the fresh images show up everywhere.
export const RerenderThumbnailsButton = () => {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("confirm");
  const [progress, setProgress] = useState(EMPTY_PROGRESS);
  const [result, setResult] = useState<ThumbnailRerenderResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stopping, setStopping] = useState(false);
  // A ref (not state) so the running job reads the latest value between items
  // without the mutation closure going stale.
  const stopRef = useRef(false);

  const rerender = useRerenderAdminLevelThumbnails();

  const handleOpenChange = (nextOpen: boolean) => {
    // While a run is in flight the only way out is the Stop button.
    if (!nextOpen && phase === "running") return;
    setOpen(nextOpen);
  };

  const openDialog = () => {
    setPhase("confirm");
    setProgress(EMPTY_PROGRESS);
    setResult(null);
    setError(null);
    setStopping(false);
    stopRef.current = false;
    setOpen(true);
  };

  const start = () => {
    setPhase("running");
    setProgress(EMPTY_PROGRESS);
    setStopping(false);
    stopRef.current = false;
    rerender.mutate(
      { onProgress: setProgress, shouldStop: () => stopRef.current },
      {
        onSuccess: (r) => {
          setResult(r);
          setPhase("done");
        },
        onError: (err) => {
          setError(err.message);
          setPhase("error");
        },
      }
    );
  };

  const requestStop = () => {
    stopRef.current = true;
    setStopping(true);
  };

  const pct =
    progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <>
      <Button
        variant="purple"
        size="sm"
        onClick={openDialog}
        aria-label="Re-render level thumbnails"
      >
        <RefreshCw size={16} strokeWidth={2.5} />
        Re-render thumbnails
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          widthClassName="w-[min(92vw,520px)]"
          showClose={phase !== "running"}
        >
          {phase === "confirm" && (
            <>
              <DialogTitle className="text-xl font-extrabold mb-2">
                Re-render every level thumbnail?
              </DialogTitle>
              <DialogDescription className="text-ink-soft text-sm mb-5">
                Redraws every level from its saved layout with the current
                visual style and replaces the stored thumbnail image. Handy
                after a rendering/style change; large catalogs can take a little
                while.
              </DialogDescription>
              <div className="flex justify-end gap-2.5">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </Button>
                <Button variant="purple" size="sm" onClick={start}>
                  Re-render all
                </Button>
              </div>
            </>
          )}

          {phase === "running" && (
            <>
              <DialogTitle className="text-xl font-extrabold mb-3">
                Re-rendering thumbnails…
              </DialogTitle>
              <div
                className="h-4 rounded-full border-2 border-ink bg-field overflow-hidden"
                role="progressbar"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Thumbnail re-render progress"
              >
                <div
                  className="h-full bg-purple transition-[width] duration-200"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <DialogDescription className="text-ink-soft text-sm mt-3 tabular-nums">
                {progress.total > 0
                  ? `${progress.done} of ${progress.total} saved${
                      progress.failed > 0 ? ` · ${progress.failed} skipped` : ""
                    }`
                  : "Loading levels…"}
              </DialogDescription>
              <div className="flex justify-end mt-5">
                <Button
                  variant="red"
                  size="sm"
                  onClick={requestStop}
                  disabled={stopping}
                >
                  {stopping ? "Stopping…" : "Stop"}
                </Button>
              </div>
            </>
          )}

          {phase === "done" && (
            <>
              <DialogTitle className="text-xl font-extrabold mb-2">
                {result?.stopped
                  ? "Re-render stopped"
                  : "Thumbnails re-rendered"}
              </DialogTitle>
              <DialogDescription className="text-ink-soft text-sm mb-5">
                {result
                  ? describeResult(result)
                  : "The run finished without a result."}
              </DialogDescription>
              <div className="flex justify-end">
                <Button size="sm" onClick={() => setOpen(false)}>
                  Close
                </Button>
              </div>
            </>
          )}

          {phase === "error" && (
            <>
              <DialogTitle className="text-xl font-extrabold mb-2">
                Re-render failed
              </DialogTitle>
              <DialogDescription className="text-ink-soft text-sm mb-5">
                {error ?? "Unknown error."}
              </DialogDescription>
              <div className="flex justify-end gap-2.5">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setOpen(false)}
                >
                  Close
                </Button>
                <Button variant="red" size="sm" onClick={start}>
                  Retry
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
