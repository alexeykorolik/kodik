/**
 * A child-sized explanation of how the program's output differs from the expected one. It only compares
 * what the learner may already see (a visible example); hidden checks are never described.
 */
const lines = (text: string) => text.replace(/\r/g, "").replace(/\n+$/, "").split("\n");
const loose = (s: string) => s.replace(/[\s.,!?;:«»"'()-]/g, "").toLowerCase();

export function explainDifference(expected: string, output: string): string {
  const want = lines(expected || ""), got = output ? lines(output) : [];
  if (!got.length || got.every((l) => !l.trim()))
    return "Программа ничего не напечатала. Проверь, что в команде «напечатать» есть текст.";
  if (got.length === want.length && [...got].sort().join("\n") === [...want].sort().join("\n"))
    return "Все строки есть, но они перепутаны местами. Поменяй порядок команд.";
  for (let i = 0; i < Math.min(got.length, want.length); i++) {
    if (got[i] === want[i]) continue;
    const n = i + 1;
    if (!got[i].trim() && want[i].trim()) return `Строка ${n} пустая. Впиши в блок текст, который нужно напечатать.`;
    if (got[i].trim() === want[i].trim()) return `Почти! В строке ${n} лишние пробелы в начале или в конце.`;
    if (got[i].toLowerCase() === want[i].toLowerCase()) return `Почти! В строке ${n} проверь большие и маленькие буквы.`;
    if (loose(got[i]) === loose(want[i])) return `Почти! В строке ${n} отличаются знаки: запятая, точка, кавычки или пробел.`;
    return `Строка ${n} отличается. Должно быть: «${want[i]}», а напечатано: «${got[i]}».`;
  }
  if (got.length < want.length)
    return want.length - got.length === 1 ? "Не хватает одной строки. Нужна ещё одна команда «напечатать»." : `Не хватает строк: ${want.length - got.length}. Добавь команды «напечатать».`;
  if (got.length > want.length) return "Программа напечатала лишнюю строку. Убери лишнюю команду.";
  return "Результат немного отличается от нужного. Сравни строки ниже.";
}

/** Short words for a result status on the learner's screens. */
export const learnerStatus: Record<string, string> = {
  passed: "Готово",
  failed: "Пока не получилось",
  runtime_error: "Ошибка в коде",
  pending_review: "Ждёт учителя",
  checker_error: "Не удалось проверить",
  cancelled: "Проверка отменена",
};
