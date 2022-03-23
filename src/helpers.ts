import { LocalStorage } from "@raycast/api";
import { randomUUID } from "crypto";
import { DateTime } from "luxon";
import { useEffect, useLayoutEffect, useRef } from "react";
import { StorageKey, Timer } from "./types";

export async function getRawTimers(): Promise<{ id: string; start: string; end?: string }[]> {
  let rawTimers = [];
  try {
    const timersStr = await LocalStorage.getItem(StorageKey.Timers);
    rawTimers = timersStr ? JSON.parse(timersStr as string) : [];
  } catch (err) {
    // ignore
  }
  return rawTimers;
}

export async function getTimers() {
  const rawTimers = await getRawTimers();
  const timers: Timer[] = rawTimers.map((timer) => ({
    id: timer.id,
    start: DateTime.fromISO(timer.start),
    ...(timer.end ? { end: DateTime.fromISO(timer.end) } : {}),
  }));
  return timers;
}

export async function getCurrentTimer(timers?: Timer[]) {
  if (timers) {
    return timers.find((timer) => !timer.end);
  } else {
    const rawTimers = await getRawTimers();
    const rawTimer = rawTimers.find((rawTimer) => !rawTimer.end);
    if (!rawTimer) return undefined;
    return {
      id: rawTimer.id,
      start: DateTime.fromISO(rawTimer.start),
    };
  }
}

export async function createTimer(start?: DateTime) {
  if (!start) {
    start = DateTime.local();
  }

  const timers = await getRawTimers();
  const id = randomUUID();
  timers.push({
    id,
    start: start?.toISO(),
  });

  await LocalStorage.setItem(StorageKey.Timers, JSON.stringify(timers));
  return id;
}

export async function updateTimer(id: string, props: Partial<Timer>): Promise<Timer> {
  const timers = await getRawTimers();
  const timer = timers.find((timer) => timer.id === id);

  if (!timer) {
    throw new Error(`Timer with id ${id} not found`);
  }

  if (props.start) {
    timer.start = props.start.toISO();
  }
  if (props.end) {
    timer.end = props.end.toISO();
  }

  await LocalStorage.setItem(StorageKey.Timers, JSON.stringify(timers));
  return {
    id,
    start: DateTime.fromISO(timer.start),
    ...(timer.end ? { end: DateTime.fromISO(timer.end) } : {}),
  };
}

export async function deleteTimer(id: string) {
  const timers = await getRawTimers();
  const idx = timers.findIndex((timer) => timer.id === id);
  if (idx === -1) {
    throw new Error(`Timer with id ${id} not found`);
  }
  timers.splice(idx, 1);
  await LocalStorage.setItem(StorageKey.Timers, JSON.stringify(timers));
}

export function getTimerDuration(timer: Timer) {
  if (!timer.end) {
    return DateTime.local().diff(timer.start);
  }
  return timer.end.diff(timer.start);
}

export function getTimerDurationInSeconds(timer: Timer) {
  if (!timer.end) {
    return DateTime.local().diff(timer.start, "seconds").toObject().seconds ?? 0;
  }
  return timer.end.diff(timer.start, "seconds").toObject().seconds ?? 0;
}

export function formatSecondsToDisplay(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours === 0) {
    return `${minutes} minute${minutes > 1 ? "s" : ""}`;
  }
  return `${hours} hour${hours > 1 ? "s" : ""} and ${minutes} minute${minutes > 1 ? "s" : ""}`;
}

export function useInterval(callback: () => void, delay: number | null) {
  const savedCallback = useRef(callback);
  // Remember the latest callback if it changes.
  useLayoutEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  // Set up the interval.
  useEffect(() => {
    // Don't schedule if no delay is specified.
    // Note: 0 is a valid value for delay.
    if (!delay && delay !== 0) {
      return;
    }

    const id = setInterval(() => savedCallback.current(), delay);

    return () => clearInterval(id);
  }, [delay]);
}
