import { useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { useUserPreferencesSync } from "../features/preferences/user-preferences-sync.model";
import type { WelcomeAction } from "../features/welcome/welcome-modal.view";
import { useCompleteIntroduction, useCurrentUser, useUserPreferences } from "../lib/queries";
import { writeLocalUserPreferences } from "../lib/user-preferences";
import { closeWelcome, type RootState } from "../store";

export function useLayout() {
  useUserPreferencesSync();
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
