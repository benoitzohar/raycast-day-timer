import { ActionPanel, Detail, List, Action, Icon, showHUD } from "@raycast/api";
import { DateTime } from "luxon";
import { useCallback, useEffect, useRef, useState } from "react";
import CurrentTimerListItem from "./components/CurrentTimerListItem";
import Stats from "./components/Stats";
import TimerList from "./components/TimerList";
import {
  formatSecondsToDisplay,
  getCurrentTimer,
  getTimers,
  getTimersAsJSON,
  getTimersPerYear,
  useInterval,
  writeFileInDownloads,
  Year,
} from "./helpers";
import { Timer } from "./types";

interface Row {
  isDay: boolean;
  isYear?: boolean;
  title: string;
  subtitle: string;
  accessoryTitle: string;
  timers?: Timer[];
}

export default function ShowTimers() {
  const yearsRef = useRef<Year[]>([]);
  const [currentTimer, setCurrentTimer] = useState<Timer | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const updateDisplay = useCallback(() => {
    const years = yearsRef.current ?? [];

    const rows: Row[] = years.reduce((acc, year) => {
      const now = DateTime.local();

      acc.push({
        isYear: true,
        isDay: false,
        title: `${year.datetime.year}`,
        subtitle: "",
        accessoryTitle: "",
      });

      year.weeks.forEach((week) => {
        acc.push({
          isDay: false,
          title:
            week.datetime.weekNumber === now.weekNumber && week.datetime.year === now.year
              ? "This week"
              : `Week ${week.datetime.weekNumber}`,
          subtitle: `Total: ${formatSecondsToDisplay(week.sum)}`,
          accessoryTitle: "",
        });

        week.days.forEach((day) => {
          acc.push({
            isDay: true,
            title: `        ${day.datetime.toFormat("cccc dd LLL")}`,
            subtitle: `${formatSecondsToDisplay(day.sum)}`,
            accessoryTitle: `${day.timers.length} timer${day.timers.length > 1 ? "s" : ""}`,
            timers: day.timers,
          });
        });
      });

      return acc;
    }, [] as Row[]);

    setRows(rows);
    setLoading(false);
  }, []);

  const readTimers = useCallback(async () => {
    const timers = await getTimers();
    yearsRef.current = await getTimersPerYear(timers);
    setCurrentTimer((await getCurrentTimer(timers)) ?? null);
    updateDisplay();
  }, []);

  useEffect(() => {
    readTimers();
  }, []);

  useInterval(() => {
    updateDisplay();
  }, 10000);

  const onUpdate = useCallback(() => {
    setLoading(true);
    readTimers();
  }, []);

  const exportJSON = useCallback(async () => {
    if (!yearsRef.current) {
      return;
    }
    const json = await getTimersAsJSON(yearsRef.current);
    writeFileInDownloads(`timers-export-${DateTime.now().toFormat("yyyy-MM-dd HH:mm")}.json`, json);

    await showHUD(`The file has been saved in your Downloads folder!`);
  }, []);

  if (!rows.length && !loading) {
    return <Detail markdown="There are no timers yet. Start by creating a timer using 'Start Timer'." />;
  }

  return (
    <List isLoading={loading}>
      {currentTimer && <CurrentTimerListItem timer={currentTimer} onUpdate={onUpdate} />}
      {rows.map((row) => (
        <List.Item
          key={`${row.title}`}
          icon={row.isDay ? undefined : row.isYear ? Icon.Dot : Icon.Calendar}
          title={row.title}
          subtitle={row.subtitle}
          accessoryTitle={row.accessoryTitle}
          actions={
            row.isDay ? (
              <ActionPanel>
                <Action.Push
                  title="Show timers for the day"
                  target={<TimerList timers={row.timers ?? []} onUpdate={onUpdate} />}
                />
              </ActionPanel>
            ) : row.isYear ? (
              <ActionPanel>
                <Action.Push
                  title="Show statistics for the year"
                  target={
                    <Stats year={yearsRef.current.find((y) => y.datetime.year.toString() === row.title) as Year} />
                  }
                />
                <Action title="Export as JSON" onAction={exportJSON} />
              </ActionPanel>
            ) : undefined
          }
        />
      ))}
    </List>
  );
}
