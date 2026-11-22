import { object } from "./guards.js";

export function stableJson(value: unknown): string {
  function ordered(item: unknown): unknown {
    if (Array.isArray(item)) return item.map(ordered);
    if (object(item))
      return Object.fromEntries(
        Object.keys(item)
          .sort()
          .map((key) => [key, ordered(item[key])]),
      );
    return item;
  }
  return JSON.stringify(ordered(value), null, 2) + "\n";
}
