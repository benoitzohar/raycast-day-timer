import { List, Icon } from "@raycast/api";
import { useMemo } from "react";
import { formatSecondsToDisplay, Year } from "../helpers";

interface Props {
  year: Year;
}

export default function Stats({ year }: Props) {
  const stats = useMemo(() => {
    const nbOfWeeks = year.weeks.length;
    const nbOfDays = year.weeks.reduce((acc, week) => {
      acc += week.days.length;
      return acc;
    }, 0);

    const averagePerWeek =
      year.weeks.reduce((acc, week) => {
        acc += week.sum;
        return acc;
      }, 0) / nbOfWeeks;

    const averagePerDay =
      year.weeks.reduce((acc, week) => {
        acc += week.days.reduce((acc2, day) => {
          acc2 += day.sum;
          return acc2;
        }, 0);
        return acc;
      }, 0) / nbOfDays;

    return [
      { title: "Number of weeks", subtitle: `${nbOfWeeks}` },
      { title: "Average time per week", subtitle: formatSecondsToDisplay(averagePerWeek) },
      { title: "Number of active days", subtitle: `${nbOfDays}` },
      { title: "Average time per active day", subtitle: formatSecondsToDisplay(averagePerDay) },
    ];
  }, [year]);

  return (
    <List>
      <List.Item icon={Icon.Calendar} title={`Stats for ${year.datetime.year}`} />
      {stats.map((stat) => (
        <List.Item key={stat.title} title={`    ${stat.title}`} subtitle={stat.subtitle} />
      ))}
    </List>
  );
}
