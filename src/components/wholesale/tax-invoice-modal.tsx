import { Printer, X } from "lucide-react"
import { formatCurrency } from "./shared"
import type { Invoice, Order } from "./types"

const VAT_RATE = 0.15

/** Deterministic QR-like pattern for the demo (not a scannable code). */
function DemoQr({ seed }: { seed: string }) {
  const size = 21
  let hash = 0
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  const cells: Array<[number, number]> = []
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const inFinder = (x < 7 && y < 7) || (x >= size - 7 && y < 7) || (x < 7 && y >= size - 7)
      if (inFinder) continue
      hash = (hash * 1103515245 + 12345) >>> 0
      if (hash % 3 === 0) cells.push([x, y])
    }
  }
  const finder = (x: number, y: number) => (
    <g key={`${x}-${y}`}>
      <rect x={x} y={y} width="7" height="7" fill="currentColor" />
      <rect x={x + 1} y={y + 1} width="5" height="5" fill="#fff" />
      <rect x={x + 2} y={y + 2} width="3" height="3" fill="currentColor" />
    </g>
  )
  return (
    <svg className="tax-qr" viewBox={`-1 -1 ${size + 2} ${size + 2}`} role="img" aria-label="رمز QR توضيحي للفاتورة">
      <rect x="-1" y="-1" width={size + 2} height={size + 2} fill="#fff" />
      {finder(0, 0)}{finder(size - 7, 0)}{finder(0, size - 7)}
      {cells.map(([x, y]) => <rect key={`${x}:${y}`} x={x} y={y} width="1" height="1" fill="currentColor" />)}
    </svg>
  )
}

export function TaxInvoiceModal({ invoice, order, onClose }: { invoice: Invoice; order?: Order | undefined; onClose: () => void }) {
  const subtotal = invoice.total / (1 + VAT_RATE)
  const vat = invoice.total - subtotal
  const remaining = Math.max(invoice.total - invoice.paidAmount, 0)
  const issued = new Intl.DateTimeFormat("ar-SA", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Riyadh" }).format(new Date(invoice.issuedAt))
  const items = order?.items ?? []

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <section className="detail-modal tax-invoice-modal" role="dialog" aria-modal="true" aria-labelledby="tax-invoice-title" onClick={(event) => event.stopPropagation()}>
        <div className="modal-head tax-invoice-actions">
          <div><span className="eyebrow">فاتورة ضريبية مبسطة</span><h2 id="tax-invoice-title">{invoice.id}</h2></div>
          <div className="tax-invoice-buttons">
            <button className="primary-button" type="button" onClick={() => window.print()}><Printer aria-hidden="true" /> طباعة / PDF</button>
            <button className="icon-action" type="button" onClick={onClose} aria-label="إغلاق"><X aria-hidden="true" /></button>
          </div>
        </div>
        <article className="tax-invoice-sheet">
          <header className="tax-invoice-header">
            <div>
              <strong>شركة الشاعر للتوزيع الدوائي</strong>
              <span>الرياض، المملكة العربية السعودية</span>
              <span>الرقم الضريبي: <b dir="ltr">300000000000003</b></span>
              <span>السجل التجاري: <b dir="ltr">1010000000</b></span>
            </div>
            <DemoQr seed={invoice.id} />
          </header>
          <dl className="tax-invoice-meta">
            <div><dt>رقم الفاتورة</dt><dd dir="ltr">{invoice.id}</dd></div>
            <div><dt>تاريخ الإصدار</dt><dd>{issued}</dd></div>
            <div><dt>العميل</dt><dd>{invoice.pharmacy}</dd></div>
            <div><dt>رقم الطلب</dt><dd dir="ltr">{invoice.orderId}</dd></div>
            <div><dt>طريقة الدفع</dt><dd>{invoice.paymentMethod}</dd></div>
          </dl>
          <div className="table-wrap">
            <table className="data-table tax-invoice-table">
              <thead><tr><th>الصنف</th><th>الكمية</th><th>سعر الوحدة</th><th>الإجمالي</th></tr></thead>
              <tbody>
                {items.length === 0 && <tr><td colSpan={4} className="table-empty">تفاصيل الأصناف متاحة في الطلب المرتبط.</td></tr>}
                {items.map((item) => <tr key={item.productId}><td><strong>{item.name}</strong></td><td>{item.quantity.toLocaleString("ar-SA")}</td><td>{formatCurrency(item.unitPrice)}</td><td>{formatCurrency(item.unitPrice * item.quantity)}</td></tr>)}
              </tbody>
            </table>
          </div>
          <dl className="tax-invoice-totals">
            <div><dt>المجموع قبل الضريبة</dt><dd>{formatCurrency(subtotal)}</dd></div>
            <div><dt>ضريبة القيمة المضافة (15%)</dt><dd>{formatCurrency(vat)}</dd></div>
            <div className="grand"><dt>الإجمالي شامل الضريبة</dt><dd>{formatCurrency(invoice.total)}</dd></div>
            <div><dt>المدفوع</dt><dd>{formatCurrency(invoice.paidAmount)}</dd></div>
            <div><dt>المتبقي</dt><dd>{formatCurrency(remaining)}</dd></div>
          </dl>
          <footer className="tax-invoice-footer">فاتورة توضيحية ضمن العرض التجريبي · متوافقة شكليًا مع متطلبات الفوترة الإلكترونية</footer>
        </article>
      </section>
    </div>
  )
}
