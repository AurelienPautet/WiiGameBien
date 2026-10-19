import { useTranslation } from "react-i18next";
import { Mail, ExternalLink, Github } from "lucide-react";

export const HomeFooter = () => {
  const { t } = useTranslation();
  return (
    <footer className="home-footer">
      <div>
        <a
          href="https://aurelien.pautet.net/contact"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Mail size={16} />
          {t("landing.contact")}
        </a>
        <a
          href="https://aurelien.pautet.net/"
          target="_blank"
          rel="noopener noreferrer"
        >
          <ExternalLink size={16} />
          {t("landing.about")}
        </a>
        <a
          href="https://github.com/AurelienPautet/WiiGameBien"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Github size={16} />
          {t("landing.github")}
        </a>
      </div>
      <p>{t("landing.copyright")}</p>
    </footer>
  );
};
