import { Action, ActionPanel, Alert, confirmAlert, Icon, List } from "@raycast/api";
import { useState } from "react";
import { deleteTimer, formatSecondsToDisplay, getTimerDurationInSeconds } from "../helpers";
import { Timer } from "../types";
import EditTimer from "./EditTimer";

interface Props {
  timers: Timer[];
  onUpdate: () => void;
}

const deleteAlertOptions: Alert.Options = {
  icon: Icon.Trash,
  title: "Do you want to delete this timer?",
  message: "You cannot undo this action.",
  primaryAction: {
    title: "Delete",
    style: Alert.ActionStyle.Destructive,
  },
};

export default function TimerList({ timers, onUpdate }: Props) {
  const [localTimers, setLocalTimers] = useState<Timer[]>(timers);

  return (
    <List>
      <List.Section title={localTimers[0].start.toFormat("cccc dd LLL") ?? ""}>
        {localTimers.map((timer, idx) => (
          <List.Item
            key={timer.id}
            title={timer.start.toFormat("t") ?? ""}
            subtitle={formatSecondsToDisplay(getTimerDurationInSeconds(timer))}
            accessoryIcon={!timer.end ? "app-icon.png" : undefined}
            actions={
              timer.end && (
                <ActionPanel>
                  <Action.Push title="Edit timer" target={<EditTimer timer={timer} onUpdate={onUpdate} />} />
                  <Action
                    title="Delete timer"
                    onAction={async () => {
                      if (await confirmAlert(deleteAlertOptions)) {
                        await deleteTimer(timer.id);
                        const newTimers = [...localTimers];
                        newTimers.splice(idx, 1);
                        setLocalTimers(newTimers);
                        onUpdate();
                      }
                    }}
                  />
                </ActionPanel>
              )
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
