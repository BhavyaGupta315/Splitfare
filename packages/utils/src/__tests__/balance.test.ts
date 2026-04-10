import { describe, it, expect } from "vitest";
import { simplifyDebts } from "../balance";

describe("simplifyDebts", () => {
  it("returns empty array when all balanced", () => {
    const result = simplifyDebts([
      { userId: "a", amount: 0 },
      { userId: "b", amount: 0 },
    ]);
    expect(result).toEqual([]);
  });

  it("creates a single transaction for two people", () => {
    const result = simplifyDebts([
      { userId: "a", amount: 50 },  // a is owed 50
      { userId: "b", amount: -50 }, // b owes 50
    ]);
    expect(result).toEqual([
      { from: "b", to: "a", amount: 50 },
    ]);
  });

  it("simplifies a 3-person chain", () => {
    // a is owed 100, b is owed 0 (net), c owes 100
    // a paid for b and c; b paid for c partially
    const result = simplifyDebts([
      { userId: "a", amount: 60 },
      { userId: "b", amount: -20 },
      { userId: "c", amount: -40 },
    ]);
    expect(result).toHaveLength(2);
    const totalSettled = result.reduce((sum, t) => sum + t.amount, 0);
    expect(totalSettled).toBe(60);
  });

  it("minimizes transactions in a 4-person cycle", () => {
    // Net: a=+30, b=-10, c=-10, d=-10
    const result = simplifyDebts([
      { userId: "a", amount: 30 },
      { userId: "b", amount: -10 },
      { userId: "c", amount: -10 },
      { userId: "d", amount: -10 },
    ]);
    expect(result).toHaveLength(3);
    for (const t of result) {
      expect(t.to).toBe("a");
      expect(t.amount).toBe(10);
    }
  });

  it("handles floating point amounts correctly", () => {
    const result = simplifyDebts([
      { userId: "a", amount: 33.33 },
      { userId: "b", amount: -16.67 },
      { userId: "c", amount: -16.66 },
    ]);
    const totalFrom = result.reduce((sum, t) => sum + t.amount, 0);
    expect(Math.round(totalFrom * 100) / 100).toBe(33.33);
  });

  it("handles empty input", () => {
    expect(simplifyDebts([])).toEqual([]);
  });
});
