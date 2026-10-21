/** One outline icon family for the school app: 24px grid, 1.6 stroke, round caps and joins.
 *  Icons beside visible text are decorative (aria-hidden); an icon-only control names itself
 *  with aria-label on the button, never on the icon. Sizes are tokens, not free numbers. */
const PATHS: Record<string, string> = {
  grid: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z",
  book: "M4 4h6a3 3 0 0 1 2 2 3 3 0 0 1 2-2h6v16h-6a3 3 0 0 0-2 1 3 3 0 0 0-2-1H4z M12 6v15",
  edit: "m15 4 5 5 M4 20l5-1L21 7l-5-5L4 14z",
  users: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M22 21v-2a4 4 0 0 0-3-4 M17 3a4 4 0 0 1 0 8",
  chart: "M4 20h17 M7 16V9 M12 16V4 M17 16v-5",
  arrow: "M5 12h14 m-6-6 6 6-6 6",
  "arrow-left": "M19 12H5 m6-6-6 6 6 6",
  "arrow-up": "M12 19V5 m-6 6 6-6 6 6",
  "arrow-down": "M12 5v14 m-6-6 6 6 6-6",
  "arrow-up-right": "M7 17 17 7 M8 7h9v9",
  plus: "M12 5v14 M5 12h14",
  code: "m8 6-6 6 6 6 m8-12 6 6-6 6 M14 3l-4 18",
  help: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5V14 M12 17.5v.01",
  journal: "M6 3h12v18H6z M9 7h6 M9 11h6 M9 15h4",
  switch: "M4 7h11 m-3-3 3 3-3 3 M20 17H9 m3-3-3 3 3 3",
  school: "M3 21h18 M5 21V10l7-5 7 5v11 M10 21v-5h4v5",
  person: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1",
  play: "M7 4.5v15a1 1 0 0 0 1.5.9l12-7.5a1 1 0 0 0 0-1.8l-12-7.5A1 1 0 0 0 7 4.5z",
  stop: "M6 6h12v12H6z",
  replay: "M4 12a8 8 0 1 0 2.4-5.7 M4 4v4h4",
  undo: "M9 14 4 9l5-5 M4 9h10a6 6 0 0 1 0 12h-3",
  redo: "m15 14 5-5-5-5 M20 9H10a6 6 0 0 0 0 12h3",
  focus: "M4 9V4h5 M15 4h5v5 M20 15v5h-5 M9 20H4v-5 M12 12h.01",
  hand: "M8 11V5.5a1.5 1.5 0 0 1 3 0V11 M11 10V4.5a1.5 1.5 0 0 1 3 0V10 M14 10.5V6a1.5 1.5 0 0 1 3 0v7a8 8 0 0 1-8 8h-.5a7 7 0 0 1-5.4-2.6L3.2 16a1.5 1.5 0 0 1 2.3-1.9L8 16.5V8a1.5 1.5 0 0 1 3 0",
  check: "m5 12.5 4.5 4.5L19 7",
  "check-circle": "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z m-4-9 2.8 2.8L16.5 9",
  x: "M6 6l12 12 M18 6 6 18",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M12 7v5l3 2",
  lock: "M6 11h12v10H6z M8.5 11V8a3.5 3.5 0 0 1 7 0v3",
  star: "m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z",
  menu: "M4 7h16 M4 12h16 M4 17h16",
  list: "M9 6h11 M9 12h11 M9 18h11 M4.5 6h.01 M4.5 12h.01 M4.5 18h.01",
  logout: "M9 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3 M14 16l4-4-4-4 M18 12H8",
  sparkle: "M12 3c.7 4.6 2.4 6.3 7 7-4.6.7-6.3 2.4-7 7-.7-4.6-2.4-6.3-7-7 4.6-.7 6.3-2.4 7-7z M19 3v3 M17.5 4.5h3",
};
export type IconName = keyof typeof PATHS;
const SIZE = { sm: 16, md: 20, lg: 24 } as const;

export function Icon({ name, size = "md", className }: { name: IconName; size?: keyof typeof SIZE; className?: string }) {
  const px = SIZE[size];
  return (
    <svg className={`icon${className ? " " + className : ""}`} viewBox="0 0 24 24" width={px} height={px} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d={PATHS[name] || PATHS.grid} />
    </svg>
  );
}
/** Navigation and card icons (kept for existing callers). */
export function Glyph({ name = "grid" }: { name?: string }) {
  return <Icon name={name in PATHS ? name : "grid"} />;
}
