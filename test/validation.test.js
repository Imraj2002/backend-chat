import test from "node:test";
import assert from "node:assert/strict";
import {
  createChatSchema,
  parseMessageLimit,
  sendMessageSchema,
} from "../dist/validation.js";

test("chat creation requires two distinct, path-safe users", () => {
  assert.equal(createChatSchema.safeParse({ userAId: "a", userBId: "b" }).success, true);
  assert.equal(createChatSchema.safeParse({ userAId: "a", userBId: "a" }).success, false);
  assert.equal(createChatSchema.safeParse({ userAId: "a/b", userBId: "b" }).success, false);
});

test("message input rejects blank and oversized text", () => {
  assert.equal(sendMessageSchema.safeParse({ senderId: "a", text: "hello" }).success, true);
  assert.equal(sendMessageSchema.safeParse({ senderId: "a", text: " " }).success, false);
  assert.equal(sendMessageSchema.safeParse({ senderId: "a", text: "x".repeat(10_001) }).success, false);
});

test("message limits default to 50 and enforce the supported range", () => {
  assert.equal(parseMessageLimit(undefined), 50);
  assert.equal(parseMessageLimit("100"), 100);
  assert.throws(() => parseMessageLimit("0"), /between 1 and 100/);
  assert.throws(() => parseMessageLimit("101"), /between 1 and 100/);
  assert.throws(() => parseMessageLimit(["50"]), /between 1 and 100/);
});
