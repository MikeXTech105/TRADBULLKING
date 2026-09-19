export function normalizeUserName(value) {
  return String(value ?? "")
    .trim()
    .replace(/^@+/, "")
    .toLowerCase();
}

export function formatUserName(value) {
  const userName = normalizeUserName(value);
  return userName ? `@${userName}` : "";
}

export function publicUserLabel(user, fallback = "Trader") {
  return (
    formatUserName(user?.userName) ||
    (typeof user?.name === "string" && user.name.trim()) ||
    fallback
  );
}

export function avatarInitial(user) {
  const source = normalizeUserName(user?.userName) || String(user?.name ?? "").trim();
  return source ? source.slice(0, 1).toUpperCase() : "";
}
