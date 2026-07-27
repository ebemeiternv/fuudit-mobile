// Local-calendar date helpers. Avoid `toISOString()` which shifts to UTC and
// can move a date across a day boundary depending on the user's timezone.

export const toLocalIsoDate = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
};

export const parseLocalIsoDate = (s: string): Date => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y || 1970, (m || 1) - 1, d || 1);
};

export const addDays = (d: Date, n: number): Date => {
  const nd = new Date(d);
  nd.setDate(nd.getDate() + n);
  nd.setHours(0, 0, 0, 0);
  return nd;
};

export const startOfWeekMonday = (d: Date): Date => {
  const nd = new Date(d);
  const day = (nd.getDay() + 6) % 7; // Mon=0 ... Sun=6
  nd.setDate(nd.getDate() - day);
  nd.setHours(0, 0, 0, 0);
  return nd;
};

export const isSameLocalDate = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

export const todayLocalIso = () => toLocalIsoDate(new Date());

const WEEKDAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const shortWeekday = (d: Date) => WEEKDAY[d.getDay()];

export const humanDate = (d: Date) =>
  d.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });

export const shortHumanDate = (d: Date) =>
  d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
