const key = (role) => `tbk_${role}_session`;
const revisions = { user: 0, admin: 0 };
function storage() {
  return { local: globalThis.localStorage, session: globalThis.sessionStorage };
}
export function readSession(role) {
  try {
    const s = storage();
    return JSON.parse(
      s.session?.getItem(key(role)) || s.local?.getItem(key(role)) || "null",
    );
  } catch {
    return null;
  }
}
export function sessionRevision(role) {
  return revisions[role];
}
function notify(role) {
  if (typeof window !== "undefined")
    window.dispatchEvent(
      new CustomEvent("tbk:session", {
        detail: { role, session: readSession(role) },
      }),
    );
}
export function saveSession(
  role,
  session,
  persistent = false,
  bumpRevision = true,
) {
  const s = storage();
  const target = persistent ? s.local : s.session;
  target.setItem(key(role), JSON.stringify({ ...session, persistent }));
  (persistent ? s.session : s.local).removeItem(key(role));
  if (bumpRevision) revisions[role]++;
  notify(role);
}
export function updateSession(role, updates) {
  const session = readSession(role);
  if (session)
    saveSession(
      role,
      { ...session, ...updates },
      session.persistent,
      Boolean(updates.accessToken || updates.refreshToken),
    );
}
export function clearSession(role) {
  try {
    const s = storage();
    s.local?.removeItem(key(role));
    s.session?.removeItem(key(role));
    s.local?.removeItem(`tbk_${role}_token`);
    s.local?.removeItem(`tbk_${role}`);
  } finally {
    revisions[role]++;
    notify(role);
  }
}
export function validRole(user, role) {
  return user?.role === role && user?.isActive !== false;
}
