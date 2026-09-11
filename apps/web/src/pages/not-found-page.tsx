import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Button } from "../components/ui/button";

export function NotFoundPage() {
  const { t } = useTranslation();

  return (
    <div className="px-6 text-ink">
      <section className="mx-auto flex max-w-2xl flex-col items-center rounded-3xl border border-line bg-surface p-8 text-center shadow-sm sm:p-12">
        <h1 className="font-display text-4xl font-bold tracking-tight text-ink sm:text-5xl">{t("notFound.title")}</h1>
        <p className="mt-5 max-w-xl text-base leading-7 text-muted sm:text-lg">{t("notFound.description")}</p>
        <nav
          aria-label={t("notFound.navigationLabel")}
          className="mt-8 flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row"
        >
          <Button asChild>
            <Link to="/">{t("notFound.goToApplications")}</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/about">{t("notFound.about")}</Link>
          </Button>
        </nav>
      </section>
    </div>
  );
}
