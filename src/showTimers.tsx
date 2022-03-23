import { ActionPanel, Detail, List, Action, Icon } from "@raycast/api";
import { DateTime } from "luxon";
import { useCallback, useEffect, useRef, useState } from "react";
import CurrentTimerListItem from "./components/CurrentTimerListItem";
import TimerList from "./components/TimerList";
import { formatSecondsToDisplay, getCurrentTimer, getTimerDurationInSeconds, getTimers, useInterval } from "./helpers";
import { Timer } from "./types";

interface Row {
  isDay: boolean;
  title: string;
  subtitle: string;
  accessoryTitle: string;
  timers?: Timer[];
}

interface Day {
  datetime: DateTime;
  week: string;
  sum: number;
  timers: Timer[];
}
interface Week {
  datetime: DateTime;
  sum: number;
  days: Day[];
}

export default function ShowTimers() {
  const weeksRef = useRef<Week[]>([]);
  const [currentTimer, setCurrentTimer] = useState<Timer | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const updateDisplay = useCallback(() => {
    const weeks = weeksRef.current ?? [];
    const rows: Row[] = weeks.reduce((acc, week) => {
      acc.push({
        isDay: false,
        title: `Week ${week.datetime.weekNumber}`,
        subtitle: `Total for the week: ${formatSecondsToDisplay(week.sum)}`,
        accessoryTitle: "",
      });

      week.days.forEach((day) => {
        acc.push({
          isDay: true,
          title: `        ${day.datetime.toFormat("dd LLL")}`,
          subtitle: `Total: ${formatSecondsToDisplay(week.sum)}`,
          accessoryTitle: `${day.timers.length} timer${day.timers.length > 1 ? "s" : ""}`,
          timers: day.timers,
        });
      });

      return acc;
    }, [] as Row[]);

    setRows(rows);
    setLoading(false);
  }, []);

  const readTimers = useCallback(async () => {
    const timers = await getTimers();

    const days: { [k: string]: Day } = timers.reduce((acc, timer) => {
      const day = timer.start.toFormat("yyyy-MM-dd");
      const week = timer.start.toFormat("yyyy-ww");
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
          datetime: day.datetime,
          sum: day.sum,
          days: [day],
        };
      } else {
        acc[day.week].sum += day.sum;
        acc[day.week].days.push(day);
      }
      return acc;
    }, {} as { [k: string]: Week });

    weeksRef.current = Object.values(weeks);
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

  if (!rows.length && !loading) {
    return <Detail markdown="There are no timers yet. Start by creating a timer using 'Start Timer'." />;
  }

  return (
    <List isLoading={loading}>
      {currentTimer && <CurrentTimerListItem timer={currentTimer} onUpdate={onUpdate} />}
      {rows.map((row) => (
        <List.Item
          key={`${row.title}`}
          icon={row.isDay ? undefined : Icon.Calendar}
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
            ) : null
          }
        />
      ))}
    </List>
  );
}