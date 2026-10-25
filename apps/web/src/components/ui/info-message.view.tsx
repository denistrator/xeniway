import { X } from "lucide-react";
import { type InfoMessageProps, useInfoMessage } from "./info-message.model";
import { infoMessageStyles } from "./info-message.styles";

const styles = infoMessageStyles();

export function InfoMessage(props: InfoMessageProps) {
  const view = useInfoMessage(props);
  if (!view.visible) {
    return null;
  }
  return (
    <div
      ref={view.rootRef}
      role="status"
      aria-live="polite"
      className={styles.root({ className: props.className })}
      onMouseEnter={view.hover}
      onMouseLeave={view.leave}
      onFocusCapture={view.focus}
      onBlurCapture={view.blur}
    >
      <div className={styles.content()}>{props.children}</div>
      <button type="button" aria-label={view.closeLabel} onClick={view.close} className={styles.close()}>
        <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" className={styles.timer()}>
          <circle cx="12" cy="12" r="10" className={styles.timerTrack()} />
          <circle
            cx="12"
            cy="12"
            r="10"
            pathLength="100"
            strokeDasharray="100"
            strokeDashoffset={view.progressOffset}
            className={styles.timerArc()}
          />
        </svg>
        <X aria-hidden="true" size={12} className={styles.closeIcon()} />
      </button>
    </div>
  );
}
