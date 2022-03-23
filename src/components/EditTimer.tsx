import { Form, ActionPanel, Action, showHUD, useNavigation, showToast, Toast } from "@raycast/api";
import { DateTime } from "luxon";
import { useCallback } from "react";
import { updateTimer } from "../helpers";
import { Timer } from "../types";

interface Props {
  timer: Timer;
  onUpdate: () => void;
}

export default function EditTimer({ timer, onUpdate }: Props) {
  const { pop } = useNavigation();

  const onSubmit = useCallback(
    async (values) => {
      await updateTimer(timer.id, {
        start: DateTime.fromJSDate(values.start),
        end: DateTime.fromJSDate(values.end),
      });
      onUpdate();
      pop();
      await showToast({
        style: Toast.Style.Success,
        title: "Timer updated",
      });
    },
    [timer.id]
  );

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save changes" onSubmit={onSubmit} />
        </ActionPanel>
      }
    >
      <Form.DatePicker id="start" title="Start time" defaultValue={timer.start.toJSDate()} />
      <Form.DatePicker id="end" title="End time" defaultValue={timer.end?.toJSDate()} />
    </Form>
  );
}
