import type { Invoice, Order, OrderStatus } from "./types"

export type CatalogOffer = { code: string; name: string; percent: number; minimum: number; productIds: string[] }

export const catalogOffers: CatalogOffer[] = [
  { code: "START-15", name: "عرض بداية الشهر", percent: 15, minimum: 500, productIds: ["MED-1042", "MED-1050"] },
  { code: "WHOLESALE-20", name: "خصم الطلبات الكبيرة", percent: 20, minimum: 1000, productIds: ["MED-1053", "MED-1055", "MED-1057"] },
]

/** Best active offer for a product (highest percentage wins). */
export function offerForProduct(productId: string, offers: CatalogOffer[] = catalogOffers): CatalogOffer | null {
  return offers.filter((offer) => offer.productIds.includes(productId)).sort((a, b) => b.percent - a.percent)[0] ?? null
}

export function discountedPrice(price: number, percent: number) {
  return Math.round(price * (100 - percent)) / 100
}

export const timelineSteps: Array<{ status: OrderStatus; label: string }> = [
  { status: "pending", label: "تم الإرسال" },
  { status: "accepted", label: "قبول الطلب" },
  { status: "preparing", label: "التجهيز" },
  { status: "ready", label: "جاهز للشحن" },
  { status: "out_for_delivery", label: "في الطريق" },
  { status: "delivered", label: "تم التسليم" },
]

/** Index of the last completed timeline step; -1 when the order was stopped. */
export function timelineIndex(status: OrderStatus) {
  return timelineSteps.findIndex((step) => step.status === status)
}

export type StatementRow = { date: string; ref: string; label: string; debit: number; credit: number; balance: number }

/** Chronological ledger: each invoice is a debit, each payment against it a credit. */
export function buildStatement(invoices: Invoice[]) {
  const sorted = [...invoices].sort((a, b) => a.issuedAt.localeCompare(b.issuedAt))
  const rows: StatementRow[] = []
  let balance = 0
  for (const invoice of sorted) {
    balance += invoice.total
    rows.push({ date: invoice.issuedAt, ref: invoice.id, label: `فاتورة الطلب ${invoice.orderId}`, debit: invoice.total, credit: 0, balance })
    if (invoice.paidAmount > 0) {
      balance -= invoice.paidAmount
      rows.push({ date: invoice.issuedAt, ref: invoice.id, label: `سداد (${invoice.paymentMethod})`, debit: 0, credit: invoice.paidAmount, balance })
    }
  }
  const billed = sorted.reduce((sum, invoice) => sum + invoice.total, 0)
  const paid = sorted.reduce((sum, invoice) => sum + Math.min(invoice.paidAmount, invoice.total), 0)
  return { rows, billed, paid, due: billed - paid }
}

/** Demo distance per stop derived from the order id so it stays stable between renders. */
export function stopDistanceKm(orderId: string) {
  const seed = [...orderId].reduce((sum, char) => sum + char.charCodeAt(0), 0)
  return 2 + (seed % 7) + (seed % 10) / 10
}

export function driverDaySummary(orders: Order[]) {
  const delivered = orders.filter((order) => order.deliveryStatus === "delivered")
  const cash = delivered.reduce((sum, order) => sum + (order.deliveryProof?.paymentMethod === "نقدًا" ? order.deliveryProof.collectedAmount : 0), 0)
  const collected = delivered.reduce((sum, order) => sum + (order.deliveryProof?.collectedAmount ?? 0), 0)
  const distance = orders.filter((order) => order.deliveryStatus && order.deliveryStatus !== "assigned").reduce((sum, order) => sum + stopDistanceKm(order.id), 0)
  return { deliveredCount: delivered.length, totalCount: orders.length, cash, collected, distanceKm: Math.round(distance * 10) / 10 }
}
