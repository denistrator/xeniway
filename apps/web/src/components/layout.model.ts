import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import { useUserPreferencesSync } from "../features/preferences/user-preferences-sync.model";
import type { WelcomeAction } from "../features/welcome/welcome-modal.view";
import { useCompleteIntroduction, useCurrentUser, useUserPreferences } from "../lib/queries";
import { writeLocalUserPreferences } from "../lib/user-preferences";
import { closeWelcome, type RootState } from "../store";

export function getRouteTitle(pathname: string, t: (key: string) => string) {
  if (pathname.startsWith("/applications/")) {
    return t("navigation.applications");
  }

  switch (pathname) {
    case "/": {
      return t("navigation.applications");
    }
    case "/archive": {
      return t("applications.archive.title");
    }
    case "/blacklist": {
      return t("applications.blacklist.title");
    }
    case "/settings": {
      return t("navigation.settings");
    }
    case "/login": {
      return t("auth.login.title");
    }
    case "/register": {
      return t("auth.register.title");
    }
    case "/forgot-password": {
      return t("auth.forgotPassword.title");
    }
    case "/reset-password": {
      return t("auth.resetPassword.title");
    }
    case "/about": {
      return t("navigation.about");
    }
    default: {
      return t("notFound.title");
    }
  }
}

function useRouteTitle() {
  const { t } = useTranslation();
  const location = useLocation();

  useEffect(() => {
    document.title = `${getRouteTitle(location.pathname, (key) => t(key))} · Xenia Way`;
  }, [location.pathname, t]);
}

export function useLayout() {
  useUserPreferencesSync();
  useRouteTitle();
  const createOpenerRef = useRef<HTMLElement | null>(null);
  function handleCreateDialogOpen(opener: HTMLElement) {
    createOpenerRef.current = opener;
  }
  return { createOpenerRef, handleCreateDialogOpen };
}

export function useWelcomeHost() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const open = useSelector((state: RootState) => state.ui.welcome.open);
  const user = useCurrentUser();
  const preferences = useUserPreferences(open && user.data ? user.data.id : null);
  const completeIntroduction = useCompleteIntroduction();

  const preferencesReady = !preferences.isPending && !preferences.error;
  const needsIntroduction = preferences.data?.wasIntroduced === false;
  const visible = open && preferencesReady && needsIntroduction;

  function handleComplete(action: WelcomeAction) {
    writeLocalUserPreferences({ wasIntroduced: true });
    dispatch(closeWelcome());
    switch (action) {
      case "board":
        navigate("/", { replace: true });
        break;
      case "about":
        navigate("/about");
        break;
      case "stay":
        break;
    }
    completeIntroduction.mutate();
  }

  return { visible, handleComplete };
}
