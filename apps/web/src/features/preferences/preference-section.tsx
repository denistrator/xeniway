import * as Select from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import { preferenceSectionStyles } from "./preference-section.styles.ts";
import { type PreferenceSectionProps, usePreferenceSection } from "./preference-section.ts";

const styles = preferenceSectionStyles();

export function PreferenceSection(props: PreferenceSectionProps) {
  const view = usePreferenceSection(props);
  return (
    <section className={styles.root()} aria-labelledby={view.headingId}>
      <h2 id={view.headingId} className={styles.heading()}>
        {props.title}
      </h2>
      <p id={view.descriptionId} className={styles.description()}>
        {props.description}
      </p>
      <Select.Root name={props.name} value={props.value} onValueChange={props.onValueChange} dir={props.dir}>
        <Select.Trigger
          className={styles.trigger()}
          aria-labelledby={view.headingId}
          aria-describedby={view.descriptionId}
        >
          {view.selected?.icon && <view.selected.icon className={styles.selectedIcon()} aria-hidden="true" />}
          {view.selected?.flag && (
            <span className={styles.selectedFlag()} aria-hidden="true">
              {view.selected.flag}
            </span>
          )}
          <Select.Value className={styles.value()} />
          <Select.Icon className={styles.toggle()}>
            <ChevronDown className={styles.toggleIcon()} aria-hidden="true" />
          </Select.Icon>
        </Select.Trigger>
        <Select.Portal>
          <Select.Content className={styles.content()} position="popper" sideOffset={4} align="start">
            <Select.Viewport className={styles.viewport()}>
              {props.options.map((option) => (
                <Select.Item key={option.value} value={option.value} textValue={option.label} className={styles.item()}>
                  {option.icon && <option.icon className={styles.optionIcon()} aria-hidden="true" />}
                  {option.flag && (
                    <span className={styles.optionFlag()} aria-hidden="true">
                      {option.flag}
                    </span>
                  )}
                  <Select.ItemText className={styles.itemText()}>{option.label}</Select.ItemText>
                  <Select.ItemIndicator className={styles.indicator()}>
                    <Check className={styles.check()} aria-hidden="true" />
                  </Select.ItemIndicator>
                </Select.Item>
              ))}
            </Select.Viewport>
          </Select.Content>
        </Select.Portal>
      </Select.Root>
    </section>
  );
}
