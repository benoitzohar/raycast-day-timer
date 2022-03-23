import { DateTime } from "luxon";

export enum StorageKey {
  Timers = "timers",
}

export interface Timer {
  id: string;
  start: DateTime;
  end?: DateTime;
}
