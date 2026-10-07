import type { JobApplication } from "@xeniway/shared";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { compactControlStyles } from "../../../../components/ui/compact-control-styles";
import { useApplicationCollection } from "../../../../lib/queries";
import { getApplicationBoard } from "../shared/application-board";
import { getApplicationNeighbors } from "./application-neighbors";

export function ApplicationWorkspaceNavigation({ application }: { application: JobApplication }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const collection = useApplicationCollection(getApplicationBoard(application), 30_000);
  const neighbors = getApplicationNeighbors(collection.data ?? [], application.id);

  return (
    <nav aria-label={t("applications.workspace.navigationLabel")} className="flex shrink-0 gap-2">
      {(
        [
          ["previous", ChevronLeft],
          ["next", ChevronRight],
        ] as const
      ).map(([direction, Icon]) => (
        <button
          key={direction}
          type="button"
          aria-label={t(`applications.workspace.${direction}`)}
          title={t(`applications.workspace.${direction}`)}
          className={compactControlStyles({ className: "w-9 px-0" })}
          disabled={neighbors[direction] === null}
          onClick={() => {
            const id = neighbors[direction];
            if (id !== null) {
              navigate(`/applications/${id}`);
            }
          }}
        >
          <Icon aria-hidden="true" className="size-4 rtl:rotate-180" />
        </button>
      ))}
    </nav>
  );
}
