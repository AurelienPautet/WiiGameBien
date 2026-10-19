import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Sidebar } from "./Sidebar";
import { ModalRenderer } from "../modals/ModalRenderer";
import { ToastContainer } from "../ui";

interface MenuLayoutProps {
  children: ReactNode;
  /** Disable for editor stages, which fit the remaining viewport. */
  contained?: boolean;
  /** Optional full-width footer, below both navigation and page content. */
  footer?: ReactNode;
}

/**
 * Shell for the (responsive, scrollable) menu screens — Home, Level Select,
 * Rankings and editors. Gameplay keeps its full-window stage.
 */
export const MenuLayout = ({
  children,
  contained = true,
  footer,
}: MenuLayoutProps) => {
  const { t } = useTranslation();
  return (
    <div
      className={`menu-shell graph-paper${footer ? " menu-shell--with-footer" : ""}`}
    >
      <a
        href="#main-content"
        className="skip-link"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById("main-content")?.focus();
        }}
      >
        {t("nav.skipToContent")}
      </a>
      <Sidebar />
      <main
        id="main-content"
        tabIndex={-1}
        className={contained ? "menu-main" : "menu-main menu-main--stage"}
      >
        {children}
      </main>
      {footer && <div className="menu-footer">{footer}</div>}
      <ModalRenderer />
      <ToastContainer />
    </div>
  );
};
