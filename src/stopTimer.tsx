import { showHUD } from "@raycast/api";
import { DateTime } from "luxon";
import { formatSecondsToDisplay, getCurrentTimer, getTimerDurationInSeconds, updateTimer } from "./helpers";

export default async function StopTimer() {
  let currentTimer = await getCurrentTimer();

  if (!currentTimer) {
    await showHUD(`There is no timer running!`);
  } else {
    currentTimer = await updateTimer(currentTimer.id, { end: DateTime.local() });
    await showHUD(`Timer stopped after ${formatSecondsToDisplay(getTimerDurationInSeconds(currentTimer))}!`);
  }
}
