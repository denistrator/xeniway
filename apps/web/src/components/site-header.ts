import type { MouseEvent } from "react";
import { useTranslation } from "react-i18next";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { useOfflineAccess } from "../features/offline/offline-access";
import { useAuthMutations, useCurrentUser } from "../lib/queries";
import { closeDrawer, openCreateDrawer } from "../store";
import { siteHeaderStyles } from "./site-header.styles.ts";

function navigationLinkClassName({ isActive }: { isActive: boolean }) {
  return siteHeaderStyles({ active: isActive }).navigationLink();
}

const navigationLinks = [
  { to: "/", labelKey: "navigation.applications", authOnly: true, end: true },
  { to: "/blacklist", labelKey: "navigation.blacklist", authOnly: true, end: false },
  { to: "/archive", labelKey: "navigation.archive", authOnly: true, end: false },
  { to: "/about", labelKey: "navigation.about", authOnly: false, end: false },
] as const;

export type SiteHeaderProps = { onCreateDialogOpen?: (opener: HTMLElement) => void };

export function useSiteHeader({ onCreateDialogOpen }: SiteHeaderProps) {
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

  function handleCreate(event: MouseEvent<HTMLButtonElement>) {
    onCreateDialogOpen?.(event.currentTarget);
    dispatch(openCreateDrawer());
  }
  return {
    user,
    access,
    readAccountId,
    logout,
    handleLogout,
    handleCreate,
    navigationLinkClassName,
    navigationLinks: navigationLinks
      .filter(({ authOnly }) => !authOnly || Boolean(readAccountId))
      .map(({ labelKey, ...link }) => ({ ...link, label: t(labelKey) })),
    navigationLabel: t("accessibility.workspaceNavigation"),
    logoutLabel: logout.isPending ? t("common.actions.signingOut") : t("common.actions.logout"),
    addJobLabel: t("common.actions.addJob"),
    loginLabel: t("common.actions.login"),
    email: user.data?.email ?? access.account?.email,
  };
}
