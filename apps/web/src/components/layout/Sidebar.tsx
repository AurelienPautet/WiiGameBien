import { useId } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { LayoutGroup } from "motion/react";
import { useTranslation } from "react-i18next";
import {
  House,
  ChartNoAxesColumnIncreasing,
  PencilRuler,
  Settings,
  Shield,
  Store,
} from "lucide-react";
import {
  useModal,
  useAuth,
  useSocket,
  useSettings,
  MODALS,
} from "../../contexts";
import { tankColorsFrom } from "../../lib/settings";
import { useWallet } from "../../hooks/useWallet";
import { SelectionIndicator, TankAvatar, CoinChip } from "../ui/primitives";
import { cn } from "../../lib/cn";
import { tabPressHandlers } from "../../lib/tabPress";

export const OnlineStatus = () => {
  const { t } = useTranslation();
  const { onlineCount, isConnected } = useSocket();
  return (
    <div
      className="online-status"
      role="status"
      title={t(isConnected ? "topbar.connected" : "topbar.disconnected")}
    >
      <span className={cn("status-dot", isConnected ? "bg-green" : "bg-red")} />
      <span className="font-bold tabular-nums">{onlineCount}</span>
      <span className="uppercase tracking-wide">{t("topbar.online")}</span>
    </div>
  );
};

/** Shared menu navigation. Gameplay keeps its immersive, full-window stage. */
export const Sidebar = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { openModal, activeModal } = useModal();
  const { user } = useAuth();
  const { settings } = useSettings();
  const groupId = useId();
  // Sidebar lives inside SettingsProvider, so a tank change (or an account
  // hydrate) re-renders it without any extra storage reads.
  const colors = tankColorsFrom(settings.tank);
  const { equipped: paint, coins } = useWallet();

  const navClass = ({ isActive }: { isActive: boolean }) =>
    cn("sidebar-link tab-pressable", isActive && "is-active");
  const creationsActive =
    pathname === "/creations" ||
    pathname === "/editor" ||
    pathname === "/campaign-editor" ||
    activeModal === MODALS.MY_LEVELS ||
    activeModal === MODALS.MY_CAMPAIGNS;
  const items = [
    {
      to: "/",
      label: t("nav.home"),
      icon: House,
      active: !creationsActive && (pathname === "/" || pathname === "/levels"),
    },
    {
      to: "/rankings",
      label: t("nav.rankings"),
      icon: ChartNoAxesColumnIncreasing,
      active: !creationsActive && pathname === "/rankings",
    },
    {
      to:
        pathname === "/campaign-editor" || activeModal === MODALS.MY_CAMPAIGNS
          ? "/creations?tab=campaigns"
          : "/creations",
      label: t("nav.creations"),
      icon: PencilRuler,
      active: creationsActive,
    },
  ];
  return (
    <aside className="sidebar">
      <button
        type="button"
        onClick={() => navigate("/")}
        className="sidebar-brand"
        aria-label="OUI TANK"
      >
        <TankAvatar bodyColor="blue" turretColor="red" size={60} />
        <span className="brand-wordmark">
          OUI<span>TANK</span>
        </span>
      </button>

      <LayoutGroup id={groupId}>
        <nav className="sidebar-nav" aria-label={t("nav.mainNavigation")}>
          {items.map(({ to, label, icon: Icon, active }) => (
            <NavLink
              key={label}
              to={to}
              end
              className={navClass({ isActive: active })}
              {...tabPressHandlers<HTMLAnchorElement>()}
            >
              {active && <SelectionIndicator className="sidebar-selection" />}
              <Icon /> <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </LayoutGroup>

      <div className="sidebar-utilities">
        {user?.isAdmin && (
          <NavLink
            to="/admin"
            className={navClass}
            aria-label={t("nav.admin")}
            {...tabPressHandlers<HTMLAnchorElement>()}
          >
            <Shield /> <span>{t("nav.admin")}</span>
          </NavLink>
        )}
        <button
          type="button"
          className={cn(
            "sidebar-link sidebar-shop tab-pressable",
            activeModal === MODALS.SHOP && "is-active"
          )}
          onClick={() => openModal(MODALS.SHOP)}
          aria-label={t("shop.openWithBalance", { count: coins })}
          {...tabPressHandlers<HTMLButtonElement>()}
        >
          <Store /> <span>{t("nav.shop")}</span>
          <CoinChip coins={coins} className="ml-auto" />
        </button>
        <button
          type="button"
          className={cn(
            "sidebar-link tab-pressable",
            activeModal === MODALS.SETTINGS && "is-active"
          )}
          onClick={() => openModal(MODALS.SETTINGS)}
          aria-label={t("topbar.settings")}
          {...tabPressHandlers<HTMLButtonElement>()}
        >
          <Settings /> <span>{t("topbar.settings")}</span>
        </button>
      </div>

      <button
        type="button"
        className="sidebar-account"
        onClick={() => openModal(user ? MODALS.PROFILE : MODALS.AUTH)}
        title={t(user ? "topbar.profile" : "topbar.login")}
      >
        <TankAvatar
          bodyColor={colors.body}
          turretColor={colors.turret}
          paint={paint}
          size={48}
        />
        <span className="min-w-0 text-left">
          <span className="block truncate font-bold">
            {user?.username ?? t("topbar.login")}
          </span>
          {user && (
            <span className="sidebar-account-description mt-1 block text-xs text-ink-soft">
              {t("topbar.profile")}
            </span>
          )}
        </span>
      </button>
    </aside>
  );
};
