// Admin content service — orchestration + shaping for the level catalog and
// campaign catalog the admin dashboard moderates. Builds the filter WHERE /
// sort expressions via the repo, runs the page + count queries, coerces
// aggregate counts/averages to plain numbers, serializes timestamps to ISO
// strings, and returns the exact wire DTOs the routes hand back. No req/res.
import type {
  AdminLevelsResponse,
  AdminCampaignsResponse,
  AdminLevelThumbnailsResponse,
} from "@ouigame/shared/api";
import * as repo from "../repositories/admin.content.repo";

// A page of levels matching the optional search (name) and status (up/down)
// filters, sorted by the requested column/order (default created desc).
async function listLevels({
  search,
  status,
  sort,
  order,
  page,
  pageSize,
}: {
  search: string | undefined;
  status: string | undefined;
  sort: string | undefined;
  order: string | undefined;
  page: number;
  pageSize: number;
}): Promise<AdminLevelsResponse> {
  const where = repo.levelsWhere(search, status);
  const orderBy = repo.levelsOrderBy(sort, order);
  const offset = (page - 1) * pageSize;
  const [rows, total] = await Promise.all([
    repo.listLevels(where, orderBy, pageSize, offset),
    repo.countLevels(where),
  ]);

  return {
    levels: rows.map((r) => ({
      id: r.id,
      name: r.name,
      type: r.type,
      status: r.status,
      maxPlayers: r.maxPlayers,
      creatorName: r.creatorName,
      createdAt: (r.createdAt ?? new Date(0)).toISOString(),
      plays: Number(r.plays) || 0,
      rating: r.rating === null ? null : Number(r.rating),
      ratingCount: Number(r.ratingCount) || 0,
    })),
    total: Number(total) || 0,
    page,
    pageSize,
  };
}

// Existence probe for the moderate/delete handlers. Returns the level's
// id/name/status, or null if it does not exist.
async function getLevel(levelId: number) {
  const rows = await repo.getLevelById(levelId);
  return rows[0] ?? null;
}

// A page of level thumbnail sources: every level's stored layout `content`
// (the raw json envelope the client re-renders from), in stable id order.
// All statuses are included — taking a level down doesn't change its preview.
async function listThumbnailSources({
  page,
  pageSize,
}: {
  page: number;
  pageSize: number;
}): Promise<AdminLevelThumbnailsResponse> {
  const offset = (page - 1) * pageSize;
  const [rows, total] = await Promise.all([
    repo.listThumbnailSources(pageSize, offset),
    repo.countLevels(undefined),
  ]);

  return {
    levels: rows.map((r) => ({
      id: r.id,
      name: r.name,
      content: r.content,
    })),
    total: Number(total) || 0,
    page,
    pageSize,
  };
}

// Replace one level's stored thumbnail with freshly rendered bytes (the route
// validates the hex first and probes the level's existence before calling).
async function setLevelThumbnail(levelId: number, hexData: string) {
  await repo.upsertLevelImg(levelId, hexData);
}

// Moderate a level: set its status (the route validates presence first).
async function setLevelStatus(levelId: number, status: string) {
  await repo.setLevelStatus(levelId, status);
}

// Delete a level (children cascade in the schema).
async function deleteLevel(levelId: number) {
  await repo.deleteLevel(levelId);
}

// A page of campaigns matching the optional search (name) filter, newest first.
async function listCampaigns({
  search,
  page,
  pageSize,
}: {
  search: string | undefined;
  page: number;
  pageSize: number;
}): Promise<AdminCampaignsResponse> {
  const where = repo.campaignsWhere(search);
  const offset = (page - 1) * pageSize;
  const [rows, total] = await Promise.all([
    repo.listCampaigns(where, pageSize, offset),
    repo.countCampaigns(where),
  ]);

  return {
    campaigns: rows.map((r) => ({
      id: r.id,
      name: r.name,
      creatorName: r.creatorName,
      createdAt: (r.createdAt ?? new Date(0)).toISOString(),
      levelCount: Number(r.levelCount) || 0,
      runs: Number(r.runs) || 0,
      completions: Number(r.completions) || 0,
    })),
    total: Number(total) || 0,
    page,
    pageSize,
  };
}

// Existence probe for the delete handler. Returns the campaign's id/name, or
// null if it does not exist.
async function getCampaign(campaignId: number) {
  const rows = await repo.getCampaignById(campaignId);
  return rows[0] ?? null;
}

// Delete a campaign (runs + level links cascade in the schema).
async function deleteCampaign(campaignId: number) {
  await repo.deleteCampaign(campaignId);
}

export {
  listLevels,
  getLevel,
  listThumbnailSources,
  setLevelThumbnail,
  setLevelStatus,
  deleteLevel,
  listCampaigns,
  getCampaign,
  deleteCampaign,
};
