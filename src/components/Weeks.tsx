import { ActionPanel, Detail, List, Action, Icon } from "@raycast/api";
import { DateTime } from "luxon";
import { useCallback, useEffect, useRef, useState } from "react";
import { getTimerDuration, getTimers, useInterval } from "../helpers";
import { Timer } from "../types";

interface Row {
  week: boolean;
  date: string;
  sum: string;
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

export default function Weeks() {
  const weeksRef = useRef<Week[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const updateDisplay = useCallback(() => {
    const weeks = weeksRef.current ?? [];
    const rows: Row[] = weeks.reduce((acc, week) => {
      acc.push({
        week: true,
        date: week.datetime.toRelative() ?? week.datetime.toLocaleString(),
        sum: `${week.sum} seconds`,
      });

      week.days.forEach((day) => {
        acc.push({
          week: false,
          date: day.datetime.toRelative() ?? day.datetime.toLocaleString(),
          sum: `${day.sum} seconds`,
        });
      });

      return acc;
    }, [] as Row[]);
    setRows(rows);
    setLoading(false);
  }, []);

  useEffect(() => {
    (async () => {
      const timers = await getTimers();

      const days: { [k: string]: Day } = timers.reduce((acc, timer) => {
        const day = timer.start.toFormat("yyyy-MM-dd");
        const week = timer.start.toFormat("yyyy-ww");
        if (!acc[day]) {
          acc[day] = {
            datetime: timer.start,
            week,
            sum: getTimerDuration(timer)?.toObject().seconds ?? 0,
            timers: [timer],
          };
        } else {
          acc[day].sum += getTimerDuration(timer)?.toObject().seconds ?? 0;
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
      updateDisplay();
    })();
  }, []);

  useInterval(() => {
    updateDisplay();
  }, 10000);

  if (!rows.length && !loading) {
    return <Detail markdown="There are no timers yet. Start by creating a timer using 'Start Timer'." />;
  }

  return (
    <List isLoading={loading}>
      {rows.map((row) => (
        <List.Item
          key={`${row.date}-${row.week ? "week" : "day"}`}
          icon={Icon.Calendar}
          title={row.date}
          subtitle={row.sum}
          actions={
            <ActionPanel>
              <Action.Push title="Show Details" target={<Detail markdown="# Hey! 👋" />} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
