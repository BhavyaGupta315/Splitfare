import { describe, it, expect } from "vitest";
import { calculateEqualSplit } from "../split";

describe("calculateEqualSplit", () => {
  it("splits evenly among 2 participants", () => {
    const result = calculateEqualSplit(100, ["a", "b"]);
    expect(result).toEqual([
      { userId: "a", amount: 50 },
      { userId: "b", amount: 50 },
    ]);
  });

  it("splits evenly among 3 participants", () => {
    const result = calculateEqualSplit(90, ["a", "b", "c"]);
    expect(result).toEqual([
      { userId: "a", amount: 30 },
      { userId: "b", amount: 30 },
      { userId: "c", amount: 30 },
    ]);
  });

  it("distributes remainder cents correctly", () => {
    const result = calculateEqualSplit(10, ["a", "b", "c"]);
    // 10 / 3 = 3.33... → 1000 cents / 3 = 333 each, remainder 1
    expect(result).toEqual([
      { userId: "a", amount: 3.34 },
      { userId: "b", amount: 3.33 },
      { userId: "c", amount: 3.33 },
    ]);
    // Total must equal original amount
    const total = result.reduce((sum, r) => sum + r.amount, 0);
    expect(Math.round(total * 100) / 100).toBe(10);
  });

  it("handles single participant", () => {
    const result = calculateEqualSplit(42.5, ["a"]);
    expect(result).toEqual([{ userId: "a", amount: 42.5 }]);
  });

  it("handles small amounts", () => {
    const result = calculateEqualSplit(0.01, ["a", "b"]);
    // 1 cent / 2 = 0 each, remainder 1
    expect(result).toEqual([
      { userId: "a", amount: 0.01 },
      { userId: "b", amount: 0 },
    ]);
  });

  it("throws if no participants", () => {
    expect(() => calculateEqualSplit(100, [])).toThrow(
      "At least one participant is required"
    );
  });

  it("throws if amount is zero or negative", () => {
    expect(() => calculateEqualSplit(0, ["a"])).toThrow("Amount must be positive");
    expect(() => calculateEqualSplit(-5, ["a"])).toThrow("Amount must be positive");
  });
});
