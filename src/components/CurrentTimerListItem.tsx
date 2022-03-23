import { Action, ActionPanel, List, showHUD, showToast, Toast, useNavigation } from "@raycast/api";
import { DateTime } from "luxon";
import { useCallback, useState } from "react";
import { getTimerDuration, updateTimer, useInterval } from "../helpers";
import { Timer } from "../types";

interface Props {
  timer: Timer;
  onUpdate: () => void;
}

export default function CurrentTimerListItem({ timer, onUpdate }: Props) {
  const getSubtitle = useCallback(() => {
    const duration = getTimerDuration(timer);
    return duration.toFormat("hh:mm:ss");
  }, [timer]);

  const [subtitle, setSubtitle] = useState(getSubtitle());

  useInterval(() => {
    setSubtitle(getSubtitle());
  }, 1000);

  const stopTimer = useCallback(async () => {
    updateTimer(timer.id, { end: DateTime.local() });
    await showToast({
      style: Toast.Style.Success,
      title: "Timer stopped",
    });
    onUpdate();
  }, []);

  return (
    <List.Item
      key="currentTimer"
      icon="app-icon.png"
      title="Current Timer"
      subtitle={subtitle}
      actions={
        <ActionPanel>
          <Action title="Stop timer" onAction={stopTimer} />
        </ActionPanel>
      }
    />
  );
}
