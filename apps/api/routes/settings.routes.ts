import express from "express";
import type { Request, Response } from "express";
const router = express.Router();
import { authMiddleware } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate.middleware";
import {
  SavePlayerSettingsRequestSchema,
  type SavePlayerSettingsRequest,
} from "@ouigame/shared/api";
import * as settingsService from "../services/settings.service";

// GET /api/settings — this player's saved preferences (null until first save).
router.get("/", authMiddleware, async (req: Request, res: Response) => {
  res.json(await settingsService.getSettings(req.user!.playerId));
});

// PUT /api/settings — create/update this player's preferences.
router.put(
  "/",
  authMiddleware,
  validate({ body: SavePlayerSettingsRequestSchema }),
  async (req: Request, res: Response) => {
    const { settings } = req.body as SavePlayerSettingsRequest;
    res.json(await settingsService.saveSettings(req.user!.playerId, settings));
  }
);

export default router;
