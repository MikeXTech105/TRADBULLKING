// Internal trading stock IDs are distinct from AngelOne provider tokens.
export function validStockId(value) {
  return (
    (typeof value === "string" &&
      value.trim().length > 0 &&
      !/^(undefined|null|\[object Object\])$/i.test(value.trim())) ||
    (typeof value === "number" && Number.isFinite(value))
  );
}
export function requireStockId(value) {
  if (!validStockId(value))
    throw new Error(
      "This instrument has no trading stock ID. Return to Market and select an available instrument.",
    );
  return encodeURIComponent(String(value).trim());
}
