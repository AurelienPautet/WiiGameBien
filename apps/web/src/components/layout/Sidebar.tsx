import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  House,
  ChartNoAxesColumnIncreasing,
  PencilRuler,
  Settings,
  Shield,
} from "lucide-react";
import { useModal, useAuth, useSocket, MODALS } from "../../contexts";
import { storage } from "../../lib/storage";
import { colorFromIndex } from "../../constants/tankColors";
import { TankAvatar } from "../ui/primitives";
import { cn } from "../../lib/cn";

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
  const { isConnected } = useSocket();
  // ModalContext rerenders this shell when customization closes, so read the
  // saved colors directly rather than keeping a second copy in local state.
  const colors = {
    body: colorFromIndex(storage.getBodyIndex()),
    turret: colorFromIndex(storage.getTurretIndex()),
  };

  const navClass = ({ isActive }: { isActive: boolean }) =>
    cn("sidebar-link", isActive && "is-active");
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

      <nav className="sidebar-nav" aria-label={t("nav.mainNavigation")}>
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            navClass({ isActive: isActive || pathname === "/levels" })
          }
        >
          <House /> <span>{t("nav.home")}</span>
        </NavLink>
        <NavLink to="/rankings" className={navClass}>
          <ChartNoAxesColumnIncreasing /> <span>{t("nav.rankings")}</span>
        </NavLink>
        <NavLink
          to={
            pathname === "/campaign-editor" ||
            activeModal === MODALS.MY_CAMPAIGNS
              ? "/creations?tab=campaigns"
              : "/creations"
          }
          className={({ isActive }) =>
            navClass({
              isActive:
                isActive ||
                pathname === "/editor" ||
                pathname === "/campaign-editor" ||
                activeModal === MODALS.MY_LEVELS ||
                activeModal === MODALS.MY_CAMPAIGNS,
            })
          }
        >
          <PencilRuler /> <span>{t("nav.creations")}</span>
        </NavLink>
      </nav>

      <div className="sidebar-utilities">
        {user?.isAdmin && (
          <NavLink to="/admin" className={navClass} aria-label={t("nav.admin")}>
            <Shield /> <span>{t("nav.admin")}</span>
          </NavLink>
        )}
        <button
          type="button"
          className={cn(
            "sidebar-link",
            activeModal === MODALS.SETTINGS && "is-active"
          )}
          onClick={() => openModal(MODALS.SETTINGS)}
          aria-label={t("topbar.settings")}
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
          size={48}
        />
        <span className="min-w-0 text-left">
          <span className="block truncate font-bold">
            {user?.username ?? t("topbar.login")}
          </span>
          <span className="mt-1 flex items-center gap-1.5 text-xs text-ink-soft">
            <span
              className={cn("status-dot", isConnected ? "bg-green" : "bg-red")}
            />
            {t(isConnected ? "topbar.connected" : "topbar.disconnected")}
          </span>
        </span>
      </button>
    </aside>
  );
};
