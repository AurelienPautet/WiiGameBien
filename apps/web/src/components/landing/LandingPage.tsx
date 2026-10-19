import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Play, Gamepad2, Flag, ArrowRight, Star, Heart } from "lucide-react";
import { useModal, useAuth, useSocket, MODALS } from "../../contexts";
import { colorFromIndex } from "../../constants/tankColors";
import { storage } from "../../lib/storage";
import { useRankings } from "../../hooks/api";
import {
  Button,
  Panel,
  DarkPanel,
  IoTitle,
  SectionLabel,
  Input,
  TankAvatar,
} from "../ui/primitives";
import { OnlineStatus } from "../layout/Sidebar";
import { FloatY } from "../../lib/motionComponents";

// Keep the quiet-lobby recommendation in one place. This is the live socket
// count, so the hierarchy updates without reloading when the lobby fills up.
const MULTIPLAYER_FEATURE_THRESHOLD = 100;
const LEADER_COLORS = ["blue", "red", "green", "purple"];

type PlayMode = "campaign" | "online" | "solo";

/** Decorative arena built from the same tanks used throughout the game. */
function ArenaIllustration({ campaign }: { campaign: boolean }) {
  return (
    <div className="home-arena" aria-hidden="true">
      {campaign && (
        <svg className="arena-path" viewBox="0 0 240 220">
          <path
            d="M45 175 H135 Q165 175 165 145 V100 Q165 75 195 75 H220"
            fill="none"
            stroke="currentColor"
            strokeWidth="5"
            strokeDasharray="8 10"
            strokeLinecap="round"
          />
        </svg>
      )}
      <span className="arena-block arena-block--one" />
      <span className="arena-block arena-block--two" />
      <span className="arena-tank arena-tank--one">
        <TankAvatar
          bodyColor="blue"
          turretColor="red"
          size={116}
          angle={-0.7}
        />
      </span>
      {campaign ? (
        <span className="arena-flag">
          <Flag size={58} strokeWidth={3} />
        </span>
      ) : (
        <span className="arena-tank arena-tank--two">
          <TankAvatar
            bodyColor="yellow"
            turretColor="red"
            size={100}
            angle={-1.15}
          />
        </span>
      )}
      {campaign && (
        <span className="arena-lives">
          <Heart />
          <Heart />
          <Heart />
        </span>
      )}
      {!campaign && (
        <>
          <span className="arena-bullet arena-bullet--one" />
          <span className="arena-bullet arena-bullet--two" />
        </>
      )}
    </div>
  );
}

export const LandingPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { openModal, activeModal } = useModal();
  const { user } = useAuth();
  const { onlineCount } = useSocket();
  const { data: topPlayers = [] } = useRankings("KILLS");
  const [playerName, setPlayerName] = useState(
    () => storage.getPlayerName() || ""
  );
  const [tankColors, setTankColors] = useState(() => ({
    body: colorFromIndex(storage.getBodyIndex()),
    turret: colorFromIndex(storage.getTurretIndex()),
  }));

  useEffect(() => {
    if (user?.username) {
      storage.setPlayerName(user.username);
      setPlayerName(user.username);
    }
  }, [user]);

  useEffect(() => {
    setTankColors({
      body: colorFromIndex(storage.getBodyIndex()),
      turret: colorFromIndex(storage.getTurretIndex()),
    });
  }, [activeModal]);

  const campaignFeatured = onlineCount < MULTIPLAYER_FEATURE_THRESHOLD;
  const featured: PlayMode = campaignFeatured ? "campaign" : "online";
  const secondary: PlayMode = campaignFeatured ? "online" : "campaign";
  const modes = {
    campaign: {
      title: t("landing.campaignTitle"),
      sub: t("landing.playCampaignSub"),
      icon: Flag,
      action: () => openModal(MODALS.CAMPAIGN_SELECTOR),
    },
    online: {
      title: t("landing.onlineTitle"),
      sub: t("landing.playOnlineSub"),
      icon: Play,
      action: () => openModal(MODALS.ROOM_SELECTOR),
    },
    solo: {
      title: t("landing.soloTitle"),
      sub: t("landing.playSoloSub"),
      icon: Gamepad2,
      action: () => navigate("/levels"),
    },
  };
  const main = modes[featured];
  const leaders = topPlayers.slice(0, 4);

  return (
    <div className="home-page">
      <header className="home-heading">
        <div>
          <IoTitle as="h1">
            {user
              ? t("landing.hello", { name: user.username })
              : t("landing.helloGuest")}
          </IoTitle>
          <p>{t("landing.ready")}</p>
        </div>
        <OnlineStatus />
      </header>

      <div className="home-grid">
        <div className="home-play-modes">
          <Panel
            className={`home-feature home-mode--${featured}`}
            data-featured-mode={featured}
          >
            <div className="home-feature-copy">
              <SectionLabel>{t("landing.featured")}</SectionLabel>
              <IoTitle as="h2">{main.title}</IoTitle>
              <p>
                {campaignFeatured
                  ? t("landing.campaignIntro")
                  : t("landing.onlineIntro")}
              </p>
              <Button
                variant="ghost"
                size="lg"
                className="home-play-button"
                onClick={main.action}
              >
                <Play className="fill-current" size={24} />
                {t("landing.play")}
                <ArrowRight size={25} />
              </Button>
            </div>
            <ArenaIllustration campaign={campaignFeatured} />
          </Panel>
          <div className="home-secondary-modes">
            {(["solo", secondary] as const).map((mode) => {
              const item = modes[mode];
              const Icon = item.icon;
              return (
                <button
                  key={mode}
                  type="button"
                  className={`home-mode-card home-mode--${mode}`}
                  onClick={item.action}
                >
                  <Icon size={34} strokeWidth={2.7} />
                  <IoTitle as="h2">{item.title}</IoTitle>
                  <span className="home-mode-description">{item.sub}</span>
                  <ArrowRight
                    className="home-mode-arrow"
                    size={26}
                    strokeWidth={3}
                  />
                </button>
              );
            })}
          </div>
        </div>

        <div className="home-aside">
          <Panel className="home-tank-panel">
            <SectionLabel>{t("landing.yourTank")}</SectionLabel>
            <div className="home-tank-preview">
              <FloatY distance={5}>
                <TankAvatar
                  bodyColor={tankColors.body}
                  turretColor={tankColors.turret}
                  size={user ? 230 : 200}
                />
              </FloatY>
            </div>
            <div className="home-tank-controls">
              {!user && (
                <div className="home-guest-name">
                  <label htmlFor="player-name">{t("landing.yourName")}</label>
                  <Input
                    id="player-name"
                    autoComplete="nickname"
                    placeholder={t("landing.namePlaceholder")}
                    maxLength={20}
                    value={playerName}
                    onChange={(e) => {
                      setPlayerName(e.target.value);
                      storage.setPlayerName(e.target.value);
                    }}
                  />
                </div>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => openModal(MODALS.TANK_SELECT)}
              >
                {t("landing.customize")}
              </Button>
            </div>
          </Panel>
          <DarkPanel className="home-leaderboard">
            <button
              type="button"
              className="home-leaderboard-heading"
              onClick={() => navigate("/rankings")}
            >
              <Star size={22} className="fill-yellow text-yellow" />
              <span>{t("landing.leaderboard")}</span>
              <ArrowRight size={18} />
            </button>
            {leaders.length === 0 ? (
              <p className="text-white/70 text-sm py-4">
                {t("landing.noRankings")}
              </p>
            ) : (
              <ol>
                {leaders.map((p, i) => (
                  <li
                    key={p.username}
                    className={p.username === user?.username ? "is-you" : ""}
                  >
                    <span className="home-rank">{i + 1}</span>
                    <TankAvatar
                      bodyColor={LEADER_COLORS[i] ?? "blue"}
                      turretColor="red"
                      size={30}
                    />
                    <span className="home-leader-name">{p.username}</span>
                    <span className="tabular-nums">{p.total_data}</span>
                  </li>
                ))}
              </ol>
            )}
          </DarkPanel>
        </div>
      </div>
    </div>
  );
};
