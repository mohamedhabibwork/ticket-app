export type BusinessHoursConfig = {
  timezone?: string;
  schedule: Array<{
    day: number;
    startHour: number;
    startMinute: number;
    endHour: number;
    endMinute: number;
  }>;
};

export type Holiday = {
  date: string;
  name: string;
};

export function calculateSLADueDates(
  startTime: Date,
  firstResponseMinutes: number,
  resolutionMinutes: number,
  businessHoursConfig: BusinessHoursConfig | null,
  holidays: Holiday[] | null
): { firstResponseDueAt: Date; resolutionDueAt: Date } {
  if (!businessHoursConfig) {
    return {
      firstResponseDueAt: new Date(startTime.getTime() + firstResponseMinutes * 60000),
      resolutionDueAt: new Date(startTime.getTime() + resolutionMinutes * 60000),
    };
  }

  let businessMinutesRemaining = getBusinessMinutesInDay(
    startTime,
    businessHoursConfig,
    holidays
  );

  let firstResponseRemaining = firstResponseMinutes;
  let resolutionRemaining = resolutionMinutes;
  let currentTime = new Date(startTime);

  while (firstResponseRemaining > 0 || resolutionRemaining > 0) {
    if (businessMinutesRemaining <= 0) {
      currentTime = getNextBusinessDayStart(currentTime, businessHoursConfig, holidays);
      const mins = getBusinessMinutesInDay(currentTime, businessHoursConfig, holidays);
      businessMinutesRemaining = mins;
      continue;
    }

    const minutesToUse = Math.min(
      businessMinutesRemaining,
      firstResponseRemaining,
      resolutionRemaining
    );

    firstResponseRemaining -= minutesToUse;
    resolutionRemaining -= minutesToUse;
    businessMinutesRemaining -= minutesToUse;

    if (firstResponseRemaining > 0 || resolutionRemaining > 0) {
      currentTime = getNextBusinessDayStart(currentTime, businessHoursConfig, holidays);
      businessMinutesRemaining = getBusinessMinutesInDay(currentTime, businessHoursConfig, holidays);
    }
  }

  return {
    firstResponseDueAt: new Date(startTime.getTime() + firstResponseMinutes * 60000),
    resolutionDueAt: new Date(startTime.getTime() + resolutionMinutes * 60000),
  };
}

export function getBusinessMinutesInDay(
  date: Date,
  config: BusinessHoursConfig,
  holidays: Holiday[] | null
): number {
  const dayOfWeek = date.getDay();
  const dateStr = date.toISOString().split("T")[0];

  if (holidays?.some((h) => h.date === dateStr)) {
    return 0;
  }

  const schedule = config.schedule.find((s) => s.day === dayOfWeek);

  if (!schedule) {
    return 0;
  }

  const dayStartMinutes = schedule.startHour * 60 + schedule.startMinute;
  const dayEndMinutes = schedule.endHour * 60 + schedule.endMinute;
  const currentMinutes = date.getHours() * 60 + date.getMinutes();

  if (currentMinutes >= dayEndMinutes) {
    return 0;
  }

  const effectiveStart = Math.max(dayStartMinutes, currentMinutes);
  return dayEndMinutes - effectiveStart;
}

export function getNextBusinessDayStart(
  currentTime: Date,
  config: BusinessHoursConfig,
  holidays: Holiday[] | null
): Date {
  const nextDay = new Date(currentTime);
  nextDay.setDate(nextDay.getDate() + 1);

  while (true) {
    const dayOfWeek = nextDay.getDay();
    const dateStr = nextDay.toISOString().split("T")[0];

    if (holidays?.some((h) => h.date === dateStr)) {
      nextDay.setDate(nextDay.getDate() + 1);
      continue;
    }

    const schedule = config.schedule.find((s) => s.day === dayOfWeek);

    if (schedule) {
      nextDay.setHours(schedule.startHour, schedule.startMinute, 0, 0);
      return nextDay;
    }

    nextDay.setDate(nextDay.getDate() + 1);
  }
}

export function isWithinBusinessHours(
  startTime: Date,
  endTime: Date,
  config: BusinessHoursConfig,
  holidays: Holiday[] | null
): number {
  let totalBusinessMinutes = 0;
  let currentTime = new Date(startTime);

  while (currentTime < endTime) {
    const dayOfWeek = currentTime.getDay();
    const dateStr = currentTime.toISOString().split("T")[0];

    if (holidays?.some((h) => h.date === dateStr)) {
      currentTime = getNextBusinessDayStart(currentTime, config, holidays);
      continue;
    }

    const schedule = config.schedule.find((s) => s.day === dayOfWeek);

    if (!schedule) {
      currentTime = getNextBusinessDayStart(currentTime, config, holidays);
      continue;
    }

    const dayStart = new Date(currentTime);
    dayStart.setHours(schedule.startHour, schedule.startMinute, 0, 0);

    const dayEnd = new Date(currentTime);
    dayEnd.setHours(schedule.endHour, schedule.endMinute, 0, 0);

    const effectiveStart = currentTime < dayStart ? dayStart : currentTime;
    const effectiveEnd = endTime < dayEnd ? endTime : dayEnd;

    if (effectiveEnd > effectiveStart) {
      const minutes = Math.floor((effectiveEnd.getTime() - effectiveStart.getTime()) / 60000);
      totalBusinessMinutes += minutes;
    }

    if (endTime > dayEnd) {
      currentTime = getNextBusinessDayStart(currentTime, config, holidays);
    } else {
      break;
    }
  }

  return totalBusinessMinutes;
}

export function isStatusPaused(statusKey: string): boolean {
  const pausedStatuses = ["pending", "on_hold", "on-hold", "pending_customer"];
  return pausedStatuses.includes(statusKey.toLowerCase());
}

export function getStatusKey(status: { name?: string; key?: string; label?: string }): string {
  return status.key || status.name?.toLowerCase().replace(/\s+/g, "_") || status.label?.toLowerCase().replace(/\s+/g, "_") || "";
}
