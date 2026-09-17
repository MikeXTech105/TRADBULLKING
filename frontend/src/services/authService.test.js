import { test } from "node:test";
import assert from "node:assert/strict";
import {
  loginUser,
  loginAdmin,
  logoutUser,
  logoutAdmin,
  getCurrentUser,
  getCurrentAdmin,
  signupUser,
  validateSignup,
  validateLogin,
} from "./authService.js";

test("mock authentication keeps roles independent and never persists passwords", async () => {
  const storage = new Map();
  globalThis.localStorage = {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: (key) => storage.delete(key),
  };
  assert.equal(getCurrentUser(), null);
  assert.equal(getCurrentAdmin(), null);
  await assert.rejects(
    loginUser({ identifier: "user@tradbullking.com", password: "wrong" }),
  );
  await assert.rejects(
    loginAdmin({ identifier: "user@tradbullking.com", password: "123456" }),
  );
  assert.equal(storage.size, 0);
  await loginUser({ identifier: "user@tradbullking.com", password: "123456" });
  assert.equal(getCurrentUser().role, "user");
  assert.equal(getCurrentAdmin(), null);
  await loginAdmin({
    identifier: "admin@tradbullking.com",
    password: "admin123",
  });
  assert.equal(getCurrentAdmin().role, "admin");
  assert.equal(storage.size, 4);
  assert.ok(!JSON.stringify([...storage]).includes("password"));
  logoutUser();
  assert.equal(getCurrentUser(), null);
  assert.equal(getCurrentAdmin().role, "admin");
  await loginUser({
    identifier: "user@tradbullking.com",
    password: "123456",
    remember: true,
  });
  assert.equal(getCurrentUser().expiresAt, null);
  logoutAdmin();
  assert.equal(getCurrentAdmin(), null);
  assert.equal(getCurrentUser().role, "user");
  const valid = {
    name: "Example User",
    mobile: "9876543210",
    email: "example@example.com",
    password: "abcdef",
    confirmPassword: "abcdef",
    terms: true,
  };
  const before = [...storage];
  assert.deepEqual(validateSignup(valid), {});
  await signupUser(valid);
  assert.deepEqual([...storage], before);
  assert.equal(
    Object.keys(
      validateSignup({
        name: "",
        mobile: "x",
        email: "x",
        password: "abc",
        confirmPassword: "",
        terms: false,
      }),
    ).length,
    6,
  );
  assert.ok(
    validateSignup({ ...valid, confirmPassword: "different" }).confirmPassword,
  );
  assert.deepEqual(
    validateLogin({ identifier: "9876543210", password: "abcdef" }),
    {},
  );
  assert.ok(
    validateLogin({ identifier: "9876543210", password: "abcdef" }, true)
      .identifier,
  );
  localStorage.setItem("tbk_user", "{broken");
  assert.equal(getCurrentUser(), null);
  logoutUser();
});
