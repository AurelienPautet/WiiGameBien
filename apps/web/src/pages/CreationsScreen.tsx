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

  return (
    <div className="pt-6">
      <header className="mb-6">
        <IoTitle as="h1" className="text-4xl">
          {t("nav.creations")}
        </IoTitle>
        <p className="mt-3 text-ink-soft font-medium">
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
        <Panel className="p-4 sm:p-6 h-[calc(100dvh-250px)] min-h-[460px]">
          <Tabs
            value={tab}
            onValueChange={(value) =>
              setSearchParams({ tab: value }, { replace: true })
            }
            className="h-full flex flex-col"
          >
            <TabsList aria-label={t("nav.creations")}>
              <TabsTrigger
                value="levels"
                className="flex items-center justify-center gap-2"
              >
                <PencilRuler size={20} />
                {t("creations.levels")}
              </TabsTrigger>
              <TabsTrigger
                value="campaigns"
                className="flex items-center justify-center gap-2"
              >
                <Flag size={20} />
                {t("creations.campaigns")}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="levels" className="flex-1 min-h-0 pt-5">
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
            <TabsContent value="campaigns" className="flex-1 min-h-0 pt-5">
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
