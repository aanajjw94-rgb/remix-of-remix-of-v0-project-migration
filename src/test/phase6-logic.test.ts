import { describe, expect, it } from "vitest"
import { adjustedStock, custodyShortfall, netProfit, stockVariance, treasuryBalance, verifyTotp } from "@/components/wholesale/phase6-logic"

describe("phase 6 logic", () => {
  it("stock take variance counts damaged items as physically present", () => {
    expect(stockVariance({ productId: "p", system: 100, counted: 90, damaged: 4 })).toBe(-6)
    expect(adjustedStock({ productId: "p", system: 100, counted: 90, damaged: 4 })).toBe(90)
  })
  it("treasury balance adds receipts and subtracts payments", () => {
    expect(treasuryBalance(1000, [
      { id: "1", type: "receipt", amount: 500, party: "", note: "", date: "" },
      { id: "2", type: "payment", amount: 200.5, party: "", note: "", date: "" },
    ])).toBe(1299.5)
  })
  it("net profit subtracts cost of goods and expenses", () => {
    expect(netProfit(10000, 6000, [{ id: "1", category: "وقود", amount: 1500, note: "", date: "" }])).toBe(2500)
  })
  it("custody shortfall is collected minus deposited", () => {
    expect(custodyShortfall(800, 750)).toBe(50)
  })
  it("2FA accepts only the exact 6-digit code", () => {
    expect(verifyTotp("123456", "123456")).toBe(true)
    expect(verifyTotp("12345", "12345")).toBe(false)
    expect(verifyTotp("654321", "123456")).toBe(false)
  })
})
