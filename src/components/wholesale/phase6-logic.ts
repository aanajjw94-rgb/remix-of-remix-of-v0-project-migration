export type StockCount = { productId: string; system: number; counted: number; damaged: number }
export type VoucherType = "receipt" | "payment"
export type Voucher = { id: string; type: VoucherType; amount: number; party: string; note: string; date: string }
export type Expense = { id: string; category: string; amount: number; note: string; date: string }

/** Difference between physically counted (incl. damaged) and system quantity. Negative = shortage. */
export function stockVariance(count: StockCount): number {
  return count.counted + count.damaged - count.system
}

/** Quantity that should remain sellable after approving the count. */
export function adjustedStock(count: StockCount): number {
  return Math.max(0, count.counted)
}

export function treasuryBalance(opening: number, vouchers: Voucher[]): number {
  const total = vouchers.reduce((sum, v) => sum + (v.type === "receipt" ? v.amount : -v.amount), opening)
  return Math.round(total * 100) / 100
}

export function netProfit(revenue: number, costOfGoods: number, expenses: Expense[]): number {
  const spent = expenses.reduce((sum, e) => sum + e.amount, 0)
  return Math.round((revenue - costOfGoods - spent) * 100) / 100
}

/** Cash a driver must hand over vs. what they actually deposited. */
export function custodyShortfall(collected: number, deposited: number): number {
  return Math.round((collected - deposited) * 100) / 100
}

export function verifyTotp(code: string, expected: string): boolean {
  return /^\d{6}$/.test(code) && code === expected
}
