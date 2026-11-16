import { useMemo, useState } from "react"
import { Factory, PackageCheck, Phone, Plus, ShoppingCart, Star, Trash2, Truck } from "lucide-react"
import { Modal } from "./modal"
import { DEMO_NOW, supplierFor, unitCost, type PurchaseOrder, type PurchaseOrderLine, type Supplier } from "./ops-data"
import { DAY_MS, suggestReorderQty } from "./ops-logic"
import { formatCurrency, SectionCard, SectionHeading, StatusPill } from "./shared"
import type { Product } from "./types"

type View = "suggestions" | "orders" | "suppliers"
export type NewPurchaseOrder = { supplierId: string; lines: PurchaseOrderLine[]; note?: string | undefined }
const poTotal = (po: { lines: PurchaseOrderLine[] }) => po.lines.reduce((sum, line) => sum + line.quantity * line.unitCost, 0)
const formatDate = (value: string) => new Intl.DateTimeFormat("ar-SA", { dateStyle: "medium", timeZone: "Asia/Riyadh" }).format(new Date(value))

export function SuppliersView({ suppliers, purchaseOrders, products, onCreate, onReceive, onAddSupplier }: {
  suppliers: Supplier[]
  purchaseOrders: PurchaseOrder[]
  products: Product[]
  onCreate: (orders: NewPurchaseOrder[]) => void
  onReceive: (poId: string, received: Record<string, number>) => void
  onAddSupplier: (supplier: Supplier) => void
}) {
  const [view, setView] = useState<View>("suggestions")
  const suggestions = useMemo(() => products.filter((product) => product.stock - product.reserved < 40).map((product) => ({ product, qty: suggestReorderQty(product), supplier: supplierFor(product, suppliers) })).filter((row) => row.qty > 0).sort((a, b) => (a.product.stock - a.product.reserved) - (b.product.stock - b.product.reserved)), [products, suppliers])
  const [selected, setSelected] = useState<string[]>(() => suggestions.filter((row) => row.product.stock - row.product.reserved < 20).map((row) => row.product.id))
  const [quantities, setQuantities] = useState<Record<string, string>>({})
  const [receiving, setReceiving] = useState<PurchaseOrder | null>(null)
  const [received, setReceived] = useState<Record<string, string>>({})
  const [viewing, setViewing] = useState<PurchaseOrder | null>(null)
  const [manual, setManual] = useState(false)
  const [manualSupplier, setManualSupplier] = useState(suppliers[0]?.id ?? "")
  const [manualLines, setManualLines] = useState<PurchaseOrderLine[]>([])
  const [manualProduct, setManualProduct] = useState(products[0]?.id ?? "")
  const [manualQty, setManualQty] = useState("50")
  const [addingSupplier, setAddingSupplier] = useState(false)
  const supplierName = (id: string) => suppliers.find((supplier) => supplier.id === id)?.name ?? id
  const openOrders = purchaseOrders.filter((po) => po.status === "sent")

  function createFromSuggestions() {
    const rows = suggestions.filter((row) => selected.includes(row.product.id))
    if (!rows.length) return
    const grouped = new Map<string, PurchaseOrderLine[]>()
    for (const row of rows) {
      const qty = Number(quantities[row.product.id] ?? row.qty)
      if (!Number.isInteger(qty) || qty < 1) continue
      grouped.set(row.supplier.id, [...(grouped.get(row.supplier.id) ?? []), { productId: row.product.id, name: row.product.name, quantity: qty, unitCost: unitCost(row.product) }])
    }
    onCreate([...grouped.entries()].map(([supplierId, lines]) => ({ supplierId, lines })))
    setSelected([])
    setView("orders")
  }

  function addManualLine() {
    const product = products.find((item) => item.id === manualProduct)
    const qty = Number(manualQty)
    if (!product || !Number.isInteger(qty) || qty < 1) return
    setManualLines((lines) => lines.some((line) => line.productId === product.id) ? lines.map((line) => line.productId === product.id ? { ...line, quantity: line.quantity + qty } : line) : [...lines, { productId: product.id, name: product.name, quantity: qty, unitCost: unitCost(product) }])
  }

  return (
    <div className="view-stack">
      <SectionHeading eyebrow="سلسلة الإمداد" title="الموردون وأوامر الشراء" description="حوّل اقتراحات إعادة الطلب إلى أوامر شراء بضغطة، ثم سجّل استلام البضاعة لتُضاف للمخزون كتشغيلات جديدة." action={<button className="primary-button" onClick={() => { setManual(true); setManualLines([]) }}><Plus aria-hidden="true" /> أمر شراء جديد</button>} />
      <div className="summary-strip"><div><span>أصناف تحتاج إعادة طلب</span><strong>{suggestions.length}</strong></div><div><span>أوامر شراء مفتوحة</span><strong>{openOrders.length}</strong></div><div><span>قيمة الأوامر المفتوحة</span><strong>{formatCurrency(openOrders.reduce((sum, po) => sum + poTotal(po), 0))}</strong></div><div><span>الموردون المعتمدون</span><strong>{suppliers.length}</strong></div></div>
      <div className="filter-row" role="tablist" aria-label="أقسام الموردين">{([["suggestions", "اقتراحات إعادة الطلب"], ["orders", "أوامر الشراء"], ["suppliers", "الموردون"]] as Array<[View, string]>).map(([id, label]) => <button key={id} role="tab" aria-selected={view === id} className={view === id ? "filter-chip active" : "filter-chip"} onClick={() => setView(id)}>{label}</button>)}</div>

      {view === "suggestions" && <SectionCard title="اقتراحات إعادة الطلب" description="الكمية المقترحة تعيد المتاح إلى 120 عبوة، ويُختار المورد حسب الشركة المصنّعة." action={<button className="primary-button" onClick={createFromSuggestions} disabled={!selected.length}><ShoppingCart aria-hidden="true" /> إنشاء أمر شراء ({selected.length})</button>}>
        <div className="table-wrap"><table className="data-table"><thead><tr><th><span className="sr-only">تحديد</span></th><th>الصنف</th><th>المتاح</th><th>المورد</th><th>مدة التوريد</th><th>الكمية المقترحة</th><th>التكلفة التقديرية</th></tr></thead><tbody>
          {suggestions.map(({ product, qty, supplier }) => { const available = product.stock - product.reserved; const value = Number(quantities[product.id] ?? qty) || 0; return <tr key={product.id}>
            <td><input type="checkbox" className="ops-check" aria-label={`تحديد ${product.name}`} checked={selected.includes(product.id)} onChange={() => setSelected((current) => current.includes(product.id) ? current.filter((id) => id !== product.id) : [...current, product.id])} /></td>
            <td><strong>{product.name}</strong><small>{product.manufacturer}</small></td>
            <td><span className={available < 20 ? "available low" : "available"}>{available}</span></td>
            <td>{supplier.name}</td>
            <td>{supplier.leadDays} أيام</td>
            <td><input className="ops-qty" type="number" min="1" aria-label={`كمية ${product.name}`} value={quantities[product.id] ?? String(qty)} onChange={(event) => setQuantities((current) => ({ ...current, [product.id]: event.target.value }))} /></td>
            <td>{formatCurrency(value * unitCost(product))}</td>
          </tr> })}
        </tbody></table>{suggestions.length === 0 && <div className="table-empty">المخزون كافٍ لكل الأصناف حاليًا.</div>}</div>
      </SectionCard>}

      {view === "orders" && <SectionCard title="أوامر الشراء" description="الاستلام يضيف الكميات للمخزون ويُنشئ تشغيلة جديدة لكل صنف.">
        <div className="table-wrap"><table className="data-table"><thead><tr><th>رقم الأمر</th><th>المورد</th><th>الأصناف</th><th>القيمة</th><th>تاريخ الإنشاء</th><th>الاستلام المتوقع</th><th>الحالة</th><th>إجراء</th></tr></thead><tbody>
          {purchaseOrders.map((po) => <tr key={po.id}>
            <td><span className="table-id">{po.id}</span></td>
            <td><strong>{supplierName(po.supplierId)}</strong></td>
            <td>{po.lines.length} أصناف · {po.lines.reduce((sum, line) => sum + line.quantity, 0).toLocaleString("ar-SA")} عبوة</td>
            <td>{formatCurrency(poTotal(po))}</td>
            <td>{formatDate(po.createdAt)}</td>
            <td>{po.status === "received" && po.receivedAt ? `استُلم ${formatDate(po.receivedAt)}` : formatDate(po.expectedAt)}</td>
            <td><StatusPill tone={po.status === "received" ? "green" : po.status === "sent" ? "blue" : "neutral"}>{po.status === "received" ? "تم الاستلام" : po.status === "sent" ? "أُرسل للمورد" : "ملغي"}</StatusPill></td>
            <td><div className="table-actions"><button className="subtle-button" onClick={() => setViewing(po)}>عرض</button>{po.status === "sent" && <button className="mini-action" onClick={() => { setReceiving(po); setReceived(Object.fromEntries(po.lines.map((line) => [line.productId, String(line.quantity)]))) }}><PackageCheck aria-hidden="true" /> استلام</button>}</div></td>
          </tr>)}
        </tbody></table></div>
      </SectionCard>}

      {view === "suppliers" && <SectionCard title="الموردون المعتمدون" action={<button className="subtle-button" onClick={() => setAddingSupplier(true)}><Plus aria-hidden="true" /> إضافة مورد</button>}>
        <div className="feature-card-grid">{suppliers.map((supplier) => <article className="feature-card" key={supplier.id}>
          <div className="feature-card-head"><span className="feature-card-icon"><Factory aria-hidden="true" /></span><span className="ops-rating"><Star aria-hidden="true" /> {supplier.rating.toFixed(1)}</span></div>
          <h3>{supplier.name}</h3>
          <p>{supplier.contact} · <span dir="ltr">{supplier.phone}</span></p>
          <p dir="ltr" className="ops-ltr">{supplier.email}</p>
          <div className="fa-chips">{supplier.manufacturers.slice(0, 4).map((name) => <span className="count-badge" key={name}>{name}</span>)}</div>
          <div className="feature-card-foot"><span><Truck aria-hidden="true" /> توريد خلال {supplier.leadDays} أيام</span><strong>{supplier.paymentTerms}</strong></div>
          <a className="wide-secondary-button" href={`tel:${supplier.phone.replace(/\s/g, "")}`}><Phone aria-hidden="true" /> اتصال بالمورد</a>
        </article>)}</div>
      </SectionCard>}

      {viewing && <Modal title={viewing.id} eyebrow={supplierName(viewing.supplierId)} close={() => setViewing(null)}>
        <div className="table-wrap"><table className="data-table"><thead><tr><th>الصنف</th><th>الكمية</th><th>تكلفة الوحدة</th><th>الإجمالي</th>{viewing.status === "received" && <th>المستلم</th>}</tr></thead><tbody>{viewing.lines.map((line) => <tr key={line.productId}><td><strong>{line.name}</strong></td><td>{line.quantity}</td><td>{formatCurrency(line.unitCost)}</td><td>{formatCurrency(line.unitCost * line.quantity)}</td>{viewing.status === "received" && <td>{line.received ?? line.quantity}</td>}</tr>)}</tbody></table></div>
        <div className="invoice-line-total"><span>الإجمالي قبل الضريبة</span><strong>{formatCurrency(poTotal(viewing))}</strong></div>
        <div className="form-actions"><button className="subtle-button" onClick={() => window.print()}>طباعة الأمر</button></div>
      </Modal>}

      {receiving && <Modal title={`استلام ${receiving.id}`} eyebrow={supplierName(receiving.supplierId)} close={() => setReceiving(null)}>
        <p className="ops-muted">أدخل الكميات المستلمة فعليًا. أي نقص يُسجل في ملاحظات الأمر.</p>
        <form className="fa-form" onSubmit={(event) => { event.preventDefault(); onReceive(receiving.id, Object.fromEntries(receiving.lines.map((line) => [line.productId, Math.max(0, Math.min(line.quantity, Number(received[line.productId]) || 0))]))); setReceiving(null) }}>
          <div className="fa-list">{receiving.lines.map((line) => <div className="fa-row" key={line.productId}><span><strong>{line.name}</strong><small className="ops-muted"> · المطلوب {line.quantity}</small></span><label className="field-label">المستلم<input className="ops-qty" type="number" min="0" max={line.quantity} value={received[line.productId] ?? ""} onChange={(event) => setReceived((current) => ({ ...current, [line.productId]: event.target.value }))} /></label></div>)}</div>
          <button className="primary-button"><PackageCheck aria-hidden="true" /> تأكيد الاستلام وإضافة للمخزون</button>
        </form>
      </Modal>}

      {manual && <Modal title="أمر شراء جديد" close={() => setManual(false)}>
        <div className="fa-form">
          <label className="field-label">المورد<select value={manualSupplier} onChange={(event) => setManualSupplier(event.target.value)}>{suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select></label>
          <div className="fa-actions"><label className="field-label">الصنف<select value={manualProduct} onChange={(event) => setManualProduct(event.target.value)}>{products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label><label className="field-label">الكمية<input type="number" min="1" value={manualQty} onChange={(event) => setManualQty(event.target.value)} /></label><button type="button" className="subtle-button" onClick={addManualLine}><Plus aria-hidden="true" /> إضافة</button></div>
          <div className="fa-list">{manualLines.map((line) => <div className="fa-row" key={line.productId}><span>{line.name} × {line.quantity}</span><strong>{formatCurrency(line.quantity * line.unitCost)}</strong><button type="button" className="icon-action" aria-label={`حذف ${line.name}`} onClick={() => setManualLines((lines) => lines.filter((item) => item.productId !== line.productId))}><Trash2 aria-hidden="true" /></button></div>)}{!manualLines.length && <p className="ops-muted">أضف صنفًا واحدًا على الأقل.</p>}</div>
          <div className="invoice-line-total"><span>الإجمالي</span><strong>{formatCurrency(poTotal({ lines: manualLines }))}</strong></div>
          <button type="button" className="primary-button" disabled={!manualLines.length} onClick={() => { onCreate([{ supplierId: manualSupplier, lines: manualLines }]); setManual(false); setView("orders") }}>إرسال الأمر للمورد</button>
        </div>
      </Modal>}

      {addingSupplier && <Modal title="إضافة مورد" close={() => setAddingSupplier(false)}>
        <form className="fa-form" onSubmit={(event) => { event.preventDefault(); const f = new FormData(event.currentTarget); const text = (key: string) => String(f.get(key) ?? "").trim(); onAddSupplier({ id: `SUP-${Date.now().toString().slice(-4)}`, name: text("name"), contact: text("contact"), phone: text("phone"), email: text("email"), manufacturers: text("manufacturers").split(/[,،]/).map((item) => item.trim()).filter(Boolean), leadDays: Number(text("leadDays")) || 3, rating: 4, paymentTerms: text("terms") }); setAddingSupplier(false) }}>
          <div className="fa-grid"><label className="field-label">اسم المورد<input name="name" required /></label><label className="field-label">مسؤول التواصل<input name="contact" required /></label><label className="field-label">الهاتف<input name="phone" dir="ltr" required /></label><label className="field-label">البريد<input name="email" type="email" dir="ltr" required /></label><label className="field-label">مدة التوريد (أيام)<input name="leadDays" type="number" min="1" defaultValue="3" /></label><label className="field-label">شروط الدفع<select name="terms"><option>آجل 30 يومًا</option><option>آجل 45 يومًا</option><option>آجل 60 يومًا</option><option>نقدًا</option></select></label></div>
          <label className="field-label">الشركات المصنّعة، مفصولة بفاصلة<input name="manufacturers" placeholder="فايزر، باير" /></label>
          <button className="primary-button">حفظ المورد</button>
        </form>
      </Modal>}
    </div>
  )
}

export const expectedDate = (supplier: Supplier | undefined) => new Date(DEMO_NOW.getTime() + (supplier?.leadDays ?? 3) * DAY_MS).toISOString()
