import { LogOut, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useDispatch } from "react-redux";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { tv } from "tailwind-variants";
import { CsvExportButton } from "../features/data-export/csv-export-button";
import { useOfflineAccess } from "../features/offline/offline-access";
import { LanguageSelector } from "../features/preferences/language-selector";
import { ThemeSelector } from "../features/preferences/theme-selector";
import { useAuthMutations, useCurrentUser } from "../lib/queries";
import { closeDrawer, openCreateDrawer } from "../store";
import { Button } from "./ui/button";

const navigationLinkStyles = tv({
  base: "rounded-lg px-3 py-2 text-sm transition-colors",
  variants: {
    active: {
      true: "bg-accent-soft font-semibold text-accent",
      false: "text-muted hover:bg-accent-hover hover:text-accent",
    },
  },
});

function navigationLinkClassName({ isActive }: { isActive: boolean }) {
  return navigationLinkStyles({ active: isActive });
}

const navigationLinks = [
  { to: "/", labelKey: "navigation.applications", authOnly: true, end: true },
  { to: "/blacklist", labelKey: "navigation.blacklist", authOnly: true, end: false },
  { to: "/archive", labelKey: "navigation.archive", authOnly: true, end: false },
  { to: "/about", labelKey: "navigation.about", authOnly: false, end: false },
] as const;

export function SiteHeader({ onCreateDialogOpen }: { onCreateDialogOpen?: (opener: HTMLElement) => void }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const user = useCurrentUser();
  const access = useOfflineAccess();
  const readAccountId = access.readAccountId ?? (access.canReadRemote ? user.data?.id : null);
  const { logout } = useAuthMutations();

  async function handleLogout() {
    await logout.mutateAsync();
    dispatch(closeDrawer());
    navigate("/login");
  }

  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center px-6 py-4">
        <Link to="/" className="font-display me-auto text-xl font-bold tracking-tight text-ink">
          Xenia Way
        </Link>
        <nav className="flex items-center gap-1 px-3" aria-label={t("accessibility.workspaceNavigation")}>
          {navigationLinks.map(
            ({ to, labelKey, authOnly, end }) =>
              (!authOnly || Boolean(readAccountId)) && (
                <NavLink key={to} to={to} end={end} className={navigationLinkClassName}>
                  {t(labelKey)}
                </NavLink>
              ),
          )}
        </nav>
        <div className="flex items-center gap-4">
          {readAccountId && (
            <div className="flex items-center lg:border-x border-line ps-6 pe-3">
              <span className="hidden text-sm text-muted sm:block">{user.data?.email ?? access.account?.email}</span>
              <Button variant="ghost" size="sm" className="ms-1" onClick={handleLogout} disabled={logout.isPending}>
                <div className="sr-only">
                  {logout.isPending ? t("common.actions.signingOut") : t("common.actions.logout")}
                </div>
                <LogOut aria-hidden="true" size={15} strokeWidth={2} />
              </Button>
            </div>
          )}
          <div className="ms-2 flex items-center gap-2">
            {user.data && (
              <Button
                disabled={!access.canMutate}
                variant="outline"
                size="sm"
                onClick={(event) => {
                  onCreateDialogOpen?.(event.currentTarget);
                  dispatch(openCreateDrawer());
                }}
              >
                <Plus aria-hidden="true" size={15} /> {t("common.actions.addJob")}
              </Button>
            )}
            {user.data && access.canMutate && <CsvExportButton />}
            {!user.isPending && !readAccountId && (
              <Button asChild variant="outline" size="sm">
                <Link to="/login">{t("common.actions.login")}</Link>
              </Button>
            )}
            <ThemeSelector />
            <LanguageSelector />
          </div>
        </div>
      </div>
    </header>
  );
}
