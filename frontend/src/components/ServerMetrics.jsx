import { StatCards } from "./DataView";
const label = (key) =>
  key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]/g, " ")
    .replace(/^./, (c) => c.toUpperCase());
export default function ServerMetrics({ data }) {
  if (!data || typeof data !== "object") return null;
  const values = {},
    fields = [];
  const walk = (object, prefix = "", depth = 0) => {
    for (const [key, value] of Object.entries(object)) {
      if (/token|password|secret|totp|api.?key/i.test(key)) continue;
      const path = prefix ? `${prefix}.${key}` : key;
      if (typeof value === "number" && Number.isFinite(value)) {
        values[path] = value;
        fields.push([
          path,
          `${prefix ? prefix.split(".").map(label).join(" ") + " " : ""}${label(key)}`,
          /pnl|profit|loss/i.test(key)
            ? "pnl"
            : /rate|percent/i.test(key)
              ? "percent"
              : /revenue|amount|balance|value|fee/i.test(key)
                ? undefined
                : "number",
        ]);
      } else if (
        value &&
        typeof value === "object" &&
        !Array.isArray(value) &&
        depth < 2
      )
        walk(value, path, depth + 1);
    }
  };
  walk(data);
  return <StatCards data={values} fields={fields} />;
}
