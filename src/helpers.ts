import { getPreferenceValues, LocalStorage } from "@raycast/api";
import { randomUUID } from "crypto";
import { writeFile } from "fs/promises";
import { DateTime } from "luxon";
import { homedir } from "os";
import { join } from "path";
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
export interface Day {
  datetime: DateTime;
  week: string;
  sum: number;
  timers: Timer[];
}
export interface Week {
  datetime: DateTime;
  year: string;
  sum: number;
  days: Day[];
  left?: number;
}
export interface Year {
  datetime: DateTime;
  sum: number;
  weeks: Week[];
  average: number;
}

interface Preferences {
  weekTarget?: string;
}

export async function getTimersPerYear(timers: Timer[]) {
  const { weekTarget } = getPreferenceValues<Preferences>();
  const weekTargetInSeconds = weekTarget ? parseInt(weekTarget, 10) * 60 * 60 : null;
  const orderedTimers = timers.sort((a, b) => (a.start > b.start ? -1 : 1));

  const days: { [k: string]: Day } = orderedTimers.reduce((acc, timer) => {
    const day = timer.start.toFormat("yyyy-MM-dd");
    const week = timer.start.toFormat("W");
    if (!acc[day]) {
      acc[day] = {
        datetime: timer.start,
        week,
        sum: getTimerDurationInSeconds(timer),
        timers: [timer],
      };
    } else {
      acc[day].sum += getTimerDurationInSeconds(timer);
      acc[day].timers.push(timer);
    }
    return acc;
  }, {} as { [k: string]: Day });

  const weeks: { [k: string]: Week } = Object.values(days).reduce((acc, day) => {
    if (!acc[day.week]) {
      acc[day.week] = {
        datetime: day.datetime.startOf("week"),
        year: day.datetime.toFormat("yyyy"),
        sum: day.sum,
        days: [day],
      };
    } else {
      acc[day.week].sum += day.sum;
      acc[day.week].days.push(day);
    }
    return acc;
  }, {} as { [k: string]: Week });

  if (weekTargetInSeconds) {
    Object.keys(weeks).forEach((week) => {
      const left = weekTargetInSeconds - weeks[week].sum;
      if (left > 0) {
        weeks[week] = {
          ...weeks[week],
          left,
        };
      }
    });
  }

  const years = Object.values(weeks)
    .sort((a, b) => (a.datetime > b.datetime ? -1 : 1))
    .reduce((acc, week) => {
      if (!acc[week.year]) {
        acc[week.year] = {
          datetime: week.datetime.startOf("year"),
          sum: week.sum,
          weeks: [week],
          average: 0,
        };
      } else {
        acc[week.year].sum += week.sum;
        acc[week.year].weeks.push(week);
      }
      return acc;
    }, {} as { [k: string]: Year });

  Object.keys(years).forEach((year) => {
    years[year].average = years[year].sum / years[year].weeks.length;
  });

  return Object.values(years).sort((a, b) => (a.datetime > b.datetime ? -1 : 1));
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
  return `${hours} hour${hours > 1 ? "s" : ""}${minutes > 0 ? ` and ${minutes} minute${minutes > 1 ? "s" : ""}` : ""}`;
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

export async function getTimersAsJSON(years: Year[]): Promise<string> {
  const result = years.reduce((accYear, year) => {
    const yearStr = `${year.datetime.year}`;

    accYear[yearStr] = {
      sum: formatSecondsToDisplay(year.sum),
      ...year.weeks.reduce((accWeek, week) => {
        const weekStr = `${week.datetime.toFormat("LLL dd")} to ${week.datetime.endOf("week").toFormat("LLL dd")}`;
        accWeek[weekStr] = {
          sum: formatSecondsToDisplay(week.sum),
          ...week.days.reduce((accDay, day) => {
            const dayStr = `${day.datetime.toFormat("LLL dd")}`;
            accDay[dayStr] = {
              sum: formatSecondsToDisplay(day.sum),
              timers: day.timers.map((timer) => ({
                from: timer.start,
                to: timer.end,
                duration: formatSecondsToDisplay(getTimerDurationInSeconds(timer)),
              })),
            };
            return accDay;
          }, {} as { [k: string]: unknown }),
        };
        return accWeek;
      }, {} as { [k: string]: unknown }),
    };
    return accYear;
  }, {} as { [k: string]: unknown });

  return JSON.stringify(result, null, 2);
}

export async function writeFileInDownloads(fileName: string, content: string) {
  const file = join(homedir(), "Downloads", fileName);
  await writeFile(file, content);
}
