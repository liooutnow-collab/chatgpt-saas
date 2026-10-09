export const RESULT_COUNT_OPTIONS = [5, 10, 25, 50, 100] as const;
export type ResultCountOption = (typeof RESULT_COUNT_OPTIONS)[number];

export const DEFAULT_RESULT_COUNT: ResultCountOption = 25;
export const MIN_LEAD_COUNT = RESULT_COUNT_OPTIONS[0];
export const MAX_LEAD_COUNT = RESULT_COUNT_OPTIONS[RESULT_COUNT_OPTIONS.length - 1];

export function isAllowedResultCount(value: unknown): value is ResultCountOption {
  return (
    typeof value === "number" &&
    RESULT_COUNT_OPTIONS.some((option) => option === value)
  );
}
