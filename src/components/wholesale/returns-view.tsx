import { useMemo, useState } from "react"
import { Check, PackageCheck, Plus, RotateCcw, ShieldAlert, X } from "lucide-react"
import { Modal } from "./modal"
import { restockableReasons, returnReasons, type ReturnReason, type ReturnRequest, type ReturnStatus } from "./ops-data"
import { returnAmount } from "./ops-logic"
import { formatCurrency, SectionCard, SectionHeading, StatusPill } from "./shared"
import type { Order } from "./types"

const statusLabel: Record<ReturnStatus, string> = { pending: "بانتظار القرار", approved: "مقبول", rejected: "مرفوض" }
const statusTone: Record<ReturnStatus, string> = { pending: "amber", approved: "green", rejected: "red" }
const formatDate = (value: string) => new Intl.DateTimeFormat("ar-SA", { dateStyle: "medium", timeZone: "Asia/Riyadh" }).format(new Date(value))

export type NewReturn = Omit<ReturnRequest, "id" | "requestedAt" | "status">

export function ReturnsView({ returns, orders, onDecide, onCreate }: { returns: ReturnRequest[]; orders: Order[]; onDecide: (id: string, decision: "approved" | "rejected", note: string) => void; onCreate: (request: NewReturn) => void }) {
  const [filter, setFilter] = useState<ReturnStatus | "all">("all")
  const [reviewing, setReviewing] = useState<ReturnRequest | null>(null)
  const [decisionNote, setDecisionNote] = useState("")
  const [creating, setCreating] = useState(false)
  const deliveredOrders = useMemo(() => orders.filter((order) => order.orderStatus === "delivered").slice(0, 40), [orders])
  const [orderId, setOrderId] = useState(deliveredOrders[0]?.id ?? "")
  const selectedOrder = deliveredOrders.find((order) => order.id === orderId)
  const [productId, setProductId] = useState("")
  const selectedItem = selectedOrder?.items.find((item) => item.productId === productId) ?? selectedOrder?.items[0]
  const [quantity, setQuantity] = useState("1")
  const [reason, setReason] = useState<ReturnReason>(returnReasons[0])
  const [note, setNote] = useState("")

  const visible = returns.filter((item) => filter === "all" || item.status === filter)
  const credited = returns.filter((item) => item.status === "approved").reduce((sum, item) => sum + returnAmount(item.quantity, item.unitPrice), 0)
  const restocked = returns.filter((item) => item.status === "approved" && restockableReasons.includes(item.reason)).reduce((sum, item) => sum + item.quantity, 0)

  function submitNew(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const qty = Number(quantity)
    if (!selectedOrder || !selectedItem || !Number.isInteger(qty) || qty < 1 || qty > selectedItem.quantity) return
    onCreate({ orderId: selectedOrder.id, invoiceId: selectedOrder.invoiceId, pharmacy: selectedOrder.pharmacy, productId: selectedItem.productId, productName: selectedItem.name, quantity: qty, unitPrice: selectedItem.unitPrice, reason, note: note.trim() })
    setCreating(false)
    setNote("")
    setQuantity("1")
  }

  return (
    <div className="view-stack">
      <SectionHeading eyebrow="ما بعد البيع" title="المرتجعات" description="راجع طلبات الإرجاع من الصيدليات، وقرّر القبول أو الرفض مع أثر واضح على المخزون والفاتورة." action={<button className="primary-button" onClick={() => { setCreating(true); setOrderId(deliveredOrders[0]?.id ?? ""); setProductId("") }}><Plus aria-hidden="true" /> تسجيل مرتجع</button>} />
      <div className="summary-strip"><div><span>بانتظار القرار</span><strong>{returns.filter((item) => item.status === "pending").length}</strong></div><div><span>مرتجعات مقبولة</span><strong>{returns.filter((item) => item.status === "approved").length}</strong></div><div><span>إشعارات دائنة صادرة</span><strong>{formatCurrency(credited)}</strong></div><div><span>وحدات عادت للمخزون</span><strong>{restocked.toLocaleString("ar-SA")}</strong></div></div>
      <SectionCard title="طلبات الإرجاع" description="الأصناف التالفة أو المستدعاة أو قريبة الانتهاء تُحوّل للحجر ولا تعود للبيع.">
        <div className="filter-row" role="tablist" aria-label="تصفية المرتجعات">{([["all", "الكل"], ["pending", "بانتظار القرار"], ["approved", "مقبولة"], ["rejected", "مرفوضة"]] as Array<[ReturnStatus | "all", string]>).map(([id, label]) => <button key={id} role="tab" aria-selected={filter === id} className={filter === id ? "filter-chip active" : "filter-chip"} onClick={() => setFilter(id)}>{label}</button>)}</div>
        <div className="table-wrap"><table className="data-table"><thead><tr><th>رقم المرتجع</th><th>الصيدلية</th><th>الصنف</th><th>السبب</th><th>القيمة</th><th>أثر المخزون</th><th>التاريخ</th><th>الحالة</th><th>إجراء</th></tr></thead><tbody>
          {visible.map((item) => <tr key={item.id}>
            <td><span className="table-id">{item.id}</span><small>{item.orderId}</small></td>
            <td><strong>{item.pharmacy}</strong></td>
            <td>{item.productName} × {item.quantity}</td>
            <td>{item.reason}</td>
            <td>{formatCurrency(returnAmount(item.quantity, item.unitPrice))}</td>
            <td>{restockableReasons.includes(item.reason) ? <StatusPill tone="teal">يعود للمخزون</StatusPill> : <StatusPill tone="amber">حجر صحي</StatusPill>}</td>
            <td>{formatDate(item.requestedAt)}</td>
            <td><StatusPill tone={statusTone[item.status]}>{statusLabel[item.status]}</StatusPill></td>
            <td>{item.status === "pending" ? <button className="mini-action" onClick={() => { setReviewing(item); setDecisionNote("") }}>مراجعة</button> : <button className="subtle-button" onClick={() => setReviewing(item)}>التفاصيل</button>}</td>
          </tr>)}
        </tbody></table>{visible.length === 0 && <div className="table-empty">لا توجد مرتجعات في هذه الحالة.</div>}</div>
      </SectionCard>

      {reviewing && <Modal title={`مراجعة ${reviewing.id}`} eyebrow={reviewing.pharmacy} close={() => setReviewing(null)}>
        <div className="ops-impact"><div><span>الطلب</span><strong>{reviewing.orderId}</strong></div><div><span>الصنف</span><strong>{reviewing.productName}</strong></div><div><span>الكمية</span><strong>{reviewing.quantity}</strong></div><div><span>السبب</span><strong>{reviewing.reason}</strong></div></div>
        {reviewing.note && <p className="ops-quote">“{reviewing.note}”</p>}
        <h3 className="ops-subtitle">أثر القبول</h3>
        <ul className="ops-effects">
          <li>{restockableReasons.includes(reviewing.reason) ? <><PackageCheck aria-hidden="true" /> تُضاف {reviewing.quantity} وحدة إلى المخزون القابل للبيع.</> : <><ShieldAlert aria-hidden="true" /> تُحوّل الكمية إلى الحجر الصحي ولا تعود للبيع.</>}</li>
          <li><RotateCcw aria-hidden="true" /> إشعار دائن بقيمة {formatCurrency(returnAmount(reviewing.quantity, reviewing.unitPrice))} {reviewing.invoiceId ? `على الفاتورة ${reviewing.invoiceId}` : "على حساب الصيدلية"}.</li>
        </ul>
        {reviewing.status === "pending" ? <form className="fa-form" onSubmit={(event) => event.preventDefault()}><label className="field-label">ملاحظة القرار<input value={decisionNote} onChange={(event) => setDecisionNote(event.target.value)} placeholder="تظهر للصيدلية مع القرار" /></label><div className="form-actions"><button type="button" className="danger-button" onClick={() => { onDecide(reviewing.id, "rejected", decisionNote.trim()); setReviewing(null) }}><X aria-hidden="true" /> رفض</button><button type="button" className="primary-button" onClick={() => { onDecide(reviewing.id, "approved", decisionNote.trim()); setReviewing(null) }}><Check aria-hidden="true" /> قبول المرتجع</button></div></form>
          : <p className="ops-muted">القرار: <StatusPill tone={statusTone[reviewing.status]}>{statusLabel[reviewing.status]}</StatusPill> {reviewing.decidedAt && `· ${formatDate(reviewing.decidedAt)}`} {reviewing.decisionNote && `· ${reviewing.decisionNote}`}</p>}
      </Modal>}

      {creating && <Modal title="تسجيل مرتجع جديد" eyebrow="نيابةً عن الصيدلية" close={() => setCreating(false)}>
        <form className="fa-form" onSubmit={submitNew}>
          <div className="fa-grid">
            <label className="field-label">الطلب المُسلّم<select value={orderId} onChange={(event) => { setOrderId(event.target.value); setProductId("") }}>{deliveredOrders.map((order) => <option key={order.id} value={order.id}>{order.id} · {order.pharmacy}</option>)}</select></label>
            <label className="field-label">الصنف<select value={selectedItem?.productId ?? ""} onChange={(event) => setProductId(event.target.value)}>{selectedOrder?.items.map((item) => <option key={item.productId} value={item.productId}>{item.name} · الكمية {item.quantity}</option>)}</select></label>
            <label className="field-label">الكمية المرتجعة<input type="number" min="1" max={selectedItem?.quantity ?? 1} value={quantity} onChange={(event) => setQuantity(event.target.value)} required /></label>
            <label className="field-label">سبب الإرجاع<select value={reason} onChange={(event) => setReason(event.target.value as ReturnReason)}>{returnReasons.map((item) => <option key={item}>{item}</option>)}</select></label>
          </div>
          <label className="field-label">ملاحظة<input value={note} onChange={(event) => setNote(event.target.value)} placeholder="وصف الحالة" /></label>
          <p className="ops-muted">قيمة المرتجع: {formatCurrency(returnAmount(Number(quantity) || 0, selectedItem?.unitPrice ?? 0))} · {restockableReasons.includes(reason) ? "يعود للمخزون عند القبول" : "يُحوّل للحجر عند القبول"}</p>
          <button className="primary-button">تسجيل المرتجع</button>
        </form>
      </Modal>}
    </div>
  )
}
