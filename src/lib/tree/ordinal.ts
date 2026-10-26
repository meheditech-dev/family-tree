const BN_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
const BN_ORDINALS = ["১ম", "২য়", "৩য়", "৪র্থ", "৫ম", "৬ষ্ঠ", "৭ম", "৮ম", "৯ম", "১০ম"];

/** Converts a number to Bengali digits. */
export const toBengaliDigits = (n: number) =>
  String(n)
    .split("")
    .map((char) => (char >= "0" && char <= "9" ? BN_DIGITS[Number(char)] : char))
    .join("");

/** English ordinal suffix: 1st, 2nd, 3rd, 4th, 11th … */
export const englishOrdinal = (n: number) => {
  const suffix =
    n % 100 >= 11 && n % 100 <= 13 ? "th" : ({ 1: "st", 2: "nd", 3: "rd" }[n % 10] ?? "th");
  return `${n}${suffix}`;
};

/**
 * Localized ordinal label for a positive number.
 * Bengali uses the first ten ordinals as words and `{n}তম` afterwards.
 */
export function ordinalLabel(n: number, language: "bn" | "en"): string {
  if (!Number.isFinite(n) || n < 1) return String(n);
  if (language === "en") return englishOrdinal(n);
  if (n <= BN_ORDINALS.length) return BN_ORDINALS[n - 1]!;
  return `${toBengaliDigits(n)}তম`;
}
