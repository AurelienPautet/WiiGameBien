import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Flag, PencilRuler } from "lucide-react";
import { useAuth, useGame, useModal, useToast, MODALS } from "../contexts";
import { useDeleteLevel, useDeleteCampaign } from "../hooks/api";
import { useStartCampaign } from "../hooks/useStartCampaign";
import { LevelSelector, CampaignSelector } from "../components/ui";
import {
  Button,
  IoTitle,
  Panel,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "../components/ui/primitives";

/** A single destination for the player's levels and campaigns. */
export const CreationsScreen = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") === "campaigns" ? "campaigns" : "levels";
  const { user, isLoading } = useAuth();
  const { openModal } = useModal();
  const { startSoloGame } = useGame();
  const { addToast, TOAST_TYPES } = useToast();
  const deleteLevel = useDeleteLevel();
  const deleteCampaign = useDeleteCampaign();
  const { start: startCampaign } = useStartCampaign();

  // LevelSelector already confirms level deletion. Campaign cards delegate
  // confirmation to their owner, as they do in MyCampaignsModal.
  const handleDeleteLevel = (id: number) => {
    deleteLevel.mutate(id, {
      onError: () =>
        addToast(
          TOAST_TYPES.ERROR,
          t("common.error"),
          t("myLevels.failedDelete")
        ),
    });
  };
  const handleDeleteCampaign = (id: number) => {
    if (!window.confirm(t("myCampaigns.confirmDelete"))) return;
    deleteCampaign.mutate(id, {
      onError: () =>
        addToast(
          TOAST_TYPES.ERROR,
          t("common.error"),
          t("myCampaigns.failedDelete")
        ),
    });
  };

  // On desktop the page is pinned to the viewport (shell padding + the main
  // column's own padding), so the panel claims the leftover height and its list
  // scrolls inside the card instead of pushing the page past the fold.
  return (
    <div className="pt-6 flex flex-col lg:h-[calc(100dvh-112px)] min-[1600px]:h-[calc(100dvh-128px)]">
      <header className="mb-5 shrink-0">
        <IoTitle as="h1" className="text-4xl">
          {t("nav.creations")}
        </IoTitle>
        <p className="mt-2 text-ink-soft font-medium">
          {t("creations.subtitle")}
        </p>
      </header>
      {isLoading ? (
        <Panel className="p-8 text-center text-ink-soft">
          {t("common.loading")}
        </Panel>
      ) : !user ? (
        <Panel className="p-8 flex flex-col items-center text-center gap-5">
          <PencilRuler size={48} strokeWidth={2} className="text-blue-d" />
          <p className="text-ink-soft font-medium">
            {t("creations.loginToManage")}
          </p>
          <Button onClick={() => openModal(MODALS.AUTH)}>
            {t("topbar.login")}
          </Button>
        </Panel>
      ) : (
        <Panel className="flex flex-col flex-1 min-h-[520px] lg:min-h-0 p-4 sm:p-5">
          <Tabs
            value={tab}
            onValueChange={(value) =>
              setSearchParams({ tab: value }, { replace: true })
            }
            className="h-full min-h-0 flex flex-col"
          >
            <TabsList
              aria-label={t("nav.creations")}
              className="shrink-0 gap-1.5 rounded-[14px] border-[3px] border-ink bg-field p-1.5"
            >
              <TabsTrigger
                value="levels"
                variant="segmented"
                className="min-w-0 px-2 text-sm sm:px-4 sm:text-base"
              >
                <PencilRuler size={20} />
                {t("creations.levels")}
              </TabsTrigger>
              <TabsTrigger
                value="campaigns"
                variant="segmented"
                className="min-w-0 px-2 text-sm sm:px-4 sm:text-base"
              >
                <Flag size={20} />
                {t("creations.campaigns")}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="levels" className="flex-1 min-h-0 pt-4">
              <LevelSelector
                mode="myLevels"
                onCreate={() => navigate("/editor")}
                onEdit={(id) => navigate(`/editor?id=${id}`)}
                onPlay={(id) => {
                  startSoloGame(id);
                  navigate("/");
                }}
                onDelete={handleDeleteLevel}
              />
            </TabsContent>
            <TabsContent value="campaigns" className="flex-1 min-h-0 pt-4">
              <CampaignSelector
                mode="my"
                onCreate={() => navigate("/campaign-editor")}
                onEdit={(id) => navigate(`/campaign-editor?id=${id}`)}
                onPlay={(id) => {
                  void startCampaign(id, () => navigate("/"));
                }}
                onDelete={handleDeleteCampaign}
              />
            </TabsContent>
          </Tabs>
        </Panel>
      )}
    </div>
  );
};
