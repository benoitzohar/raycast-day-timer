import { showHUD } from "@raycast/api";
import { createTimer, getCurrentTimer } from "./helpers";

export default async function StartTimer() {
  const currentTimer = await getCurrentTimer();

  if (currentTimer) {
    await showHUD(`There is already a timer running!`);
  } else {
    await createTimer();
    await showHUD(`Timer started!`);
  }
}
