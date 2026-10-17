import { describe, expect, it } from "vitest";
import { computeAge } from "@/lib/tree/helpers";

const member = (birthYear?: number, deathYear?: number) => ({
  id: "m1",
  name: "Test",
  gender: "male" as const,
  birthYear,
  deathYear,
});

const now = 2026;

describe("computeAge", () => {
  it("computes age at death for deceased members", () => {
    expect(computeAge(member(1950, 2010), now)).toEqual({
      age: 60,
      living: false,
      approximate: false,
    });
  });
  it("computes approximate current age for living members", () => {
    expect(computeAge(member(1975), now)).toEqual({ age: 51, living: true, approximate: true });
  });
  it("returns null when birth year is missing", () => {
    expect(computeAge(member(undefined), now)).toBeNull();
    expect(computeAge({ id: "m1", name: "Test", gender: "male" }, now)).toBeNull();
  });
  it("returns null for invalid birth years", () => {
    expect(computeAge(member(0), now)).toBeNull();
    expect(computeAge(member(-1950), now)).toBeNull();
    expect(computeAge(member(now + 1), now)).toBeNull();
    expect(computeAge(member(Number.NaN), now)).toBeNull();
  });
  it("returns null when death year precedes birth year (never negative)", () => {
    expect(computeAge(member(1980, 1970), now)).toBeNull();
    expect(computeAge(member(2010, 2010), now)).toEqual({
      age: 0,
      living: false,
      approximate: false,
    });
  });
  it("falls back to the current year when not provided", () => {
    const expected = new Date().getFullYear() - 40;
    expect(computeAge(member(expected))?.age).toBe(40);
  });
});
