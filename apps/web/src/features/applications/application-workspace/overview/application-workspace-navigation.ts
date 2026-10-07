import type { JobApplication } from "@xeniway/shared";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { useApplicationCollection } from "../../../../lib/queries.ts";
import { getApplicationBoard } from "../shared/application-board.ts";
import { getApplicationNeighbors } from "./application-neighbors.ts";

export type ApplicationWorkspaceNavigationProps = { application: JobApplication };
export function useApplicationWorkspaceNavigation({ application }: ApplicationWorkspaceNavigationProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const collection = useApplicationCollection(getApplicationBoard(application), 30_000);
  const neighbors = getApplicationNeighbors(collection.data ?? [], application.id);
  const directions = (
    [
      ["previous", ChevronLeft],
      ["next", ChevronRight],
    ] as const
  ).map(([direction, Icon]) => ({
    direction,
    Icon,
    label: t(`applications.workspace.${direction}`),
    disabled: neighbors[direction] === null,
    onClick() {
      const id = neighbors[direction];
      if (id !== null) {
        navigate(`/applications/${id}`);
      }
    },
  }));
  const navigationLabel = t("applications.workspace.navigationLabel");
  return { navigationLabel, directions };
}
