import { useTranslation } from "react-i18next";
import { useDispatch } from "react-redux";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuthMutations, useCurrentUser } from "../lib/queries";
import { cn } from "../lib/utils";
import { closeDrawer, openCreateDrawer } from "../store";
import { LanguageSelector } from "./language-selector";
import { ThemeSelector } from "./theme-selector";
import { Button } from "./ui/button";

function navigationLinkClassName({ isActive }: { isActive: boolean }) {
  return cn(
    "rounded-lg px-3 py-2 text-sm transition-colors",
    isActive ? "bg-accent-soft font-semibold text-accent" : "text-muted hover:bg-accent-hover hover:text-accent",
  );
}

const navigationLinks = [
  { to: "/", labelKey: "navigation.applications", authOnly: true, end: true },
  { to: "/blacklist", labelKey: "navigation.blacklist", authOnly: true, end: false },
  { to: "/archive", labelKey: "navigation.archive", authOnly: true, end: false },
  { to: "/about", labelKey: "navigation.about", authOnly: false, end: false },
] as const;

export function SiteHeader() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const user = useCurrentUser();
  const { logout } = useAuthMutations();

  async function handleLogout() {
    await logout.mutateAsync();
    dispatch(closeDrawer());
    navigate("/login");
  }

  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-6 py-4">
        <Link to="/" className="font-display mr-auto text-xl font-bold tracking-tight text-ink">
          Job Tracker
        </Link>
        <nav className="flex items-center gap-1" aria-label={t("accessibility.workspaceNavigation")}>
          {navigationLinks.map(
            ({ to, labelKey, authOnly, end }) =>
              (!authOnly || Boolean(user.data)) && (
                <NavLink key={to} to={to} end={end} className={navigationLinkClassName}>
                  {t(labelKey)}
                </NavLink>
              ),
          )}
        </nav>
        <div className="flex items-center gap-2 border-l border-line pl-3">
          {user.data && <span className="hidden text-sm text-muted sm:block">{user.data.email}</span>}
          {user.data && (
            <Button variant="outline" size="sm" onClick={() => dispatch(openCreateDrawer())}>
              + {t("common.actions.addJob")}
            </Button>
          )}
          <LanguageSelector />
          <ThemeSelector />
          {user.data && (
            <Button variant="ghost" size="sm" onClick={handleLogout} disabled={logout.isPending}>
              {logout.isPending ? t("common.actions.signingOut") : t("common.actions.logout")}
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
