import { useEffect, useMemo, useRef, useState } from "react"
import { BellRing, Check, MapPin, Plus, ShieldCheck, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { EmptyState, SectionCard, SectionHeading, StatusPill, formatCurrency } from "./shared"
import type { DeliveryAgent, Order, Product } from "./types"
import { adjustedStock, custodyShortfall, netProfit, stockVariance, treasuryBalance, verifyTotp, type Expense, type StockCount, type Voucher } from "./phase6-logic"

const today = new Date().toISOString().slice(0, 10)
const locationFor = (i: number) => `الرواق ${String.fromCharCode(65 + (i % 4))} · رف ${(i % 6) + 1}`

/* 1. Security & 2FA */
export function SecurityView({ onLog }: { onLog: (text: string) => void }) {
  const [enabled, setEnabled] = useState(true)
  const [code, setCode] = useState("")
  const [verified, setVerified] = useState(false)
  const expected = "246810"
  const sessions = [
    { device: "Chrome · Windows", place: "الرياض", time: "الآن", current: true },
    { device: "Safari · iPhone", place: "الرياض", time: "قبل 3 ساعات", current: false },
    { device: "Edge · Windows", place: "جدة", time: "أمس", current: false },
  ]
  return <div className="view-stack">
    <SectionHeading eyebrow="الأمان" title="الدخول والتحقق الثنائي" description="تأمين دخول مسؤولي النظام برمز تحقق من 6 أرقام." />
    <div className="p6-grid">
      <SectionCard title="التحقق الثنائي (2FA)" description="يُطلب رمز من تطبيق المصادقة عند كل دخول.">
        <label className="p6-switch"><input type="checkbox" checked={enabled} onChange={e => { setEnabled(e.target.checked); onLog(e.target.checked ? "فعّل التحقق الثنائي" : "أوقف التحقق الثنائي"); toast.success(e.target.checked ? "تم تفعيل التحقق الثنائي" : "تم إيقاف التحقق الثنائي") }} /> <span>{enabled ? "مفعّل" : "غير مفعّل"}</span></label>
        {enabled && <form className="p6-otp" onSubmit={e => { e.preventDefault(); if (verifyTotp(code, expected)) { setVerified(true); onLog("دخول ناجح بالتحقق الثنائي"); toast.success("تم التحقق بنجاح") } else toast.error("الرمز غير صحيح") }}>
          <p className="eyebrow">جرّب الدخول: الرمز التجريبي <b dir="ltr">246810</b></p>
          <input inputMode="numeric" maxLength={6} dir="ltr" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ""))} aria-label="رمز التحقق" placeholder="••••••" />
          <button className="primary-button"><ShieldCheck /> تحقق</button>
          {verified && <StatusPill tone="green">تم التحقق من الجلسة</StatusPill>}
        </form>}
      </SectionCard>
      <SectionCard title="الجلسات النشطة" description="الأجهزة التي سجلت الدخول مؤخرًا.">
        <ul className="p6-list">{sessions.map(s => <li key={s.device}><span><strong>{s.device}</strong><small>{s.place} · {s.time}</small></span>{s.current ? <StatusPill tone="green">الجلسة الحالية</StatusPill> : <button className="subtle-button" onClick={() => { onLog(`أنهى جلسة ${s.device}`); toast.success("تم إنهاء الجلسة") }}>إنهاء</button>}</li>)}</ul>
      </SectionCard>
    </div>
  </div>
}

/* 2. Stock take */
export function StockTakeView({ products, onApply }: { products: Product[]; onApply: (counts: StockCount[]) => void }) {
  const [counts, setCounts] = useState<StockCount[]>(() => products.map(p => ({ productId: p.id, system: p.stock, counted: p.stock, damaged: 0 })))
  const set = (id: string, key: "counted" | "damaged", v: number) => setCounts(cs => cs.map(c => c.productId === id ? { ...c, [key]: Math.max(0, v) } : c))
  const diffs = counts.filter(c => stockVariance(c) !== 0 || c.damaged > 0)
  return <div className="view-stack">
    <SectionHeading eyebrow="المخزون" title="جرد المخزون" description="قارن الكمية الفعلية بالكمية الدفترية وسجّل التالف ثم اعتمد التسوية." action={<button className="primary-button" disabled={diffs.length === 0} onClick={() => { onApply(counts); toast.success(`تم اعتماد تسوية ${diffs.length} صنف`) }}><Check /> اعتماد التسوية</button>} />
    <div className="summary-strip"><div><span>الأصناف</span><strong>{counts.length}</strong></div><div><span>أصناف بفروقات</span><strong>{diffs.length}</strong></div><div><span>إجمالي العجز</span><strong>{counts.reduce((s, c) => s + Math.min(0, stockVariance(c)), 0)}</strong></div><div><span>التالف</span><strong>{counts.reduce((s, c) => s + c.damaged, 0)}</strong></div></div>
    <SectionCard title="ورقة الجرد"><div className="table-wrap"><table className="data-table"><thead><tr><th>الصنف</th><th>الموقع</th><th>الدفتري</th><th>الفعلي</th><th>التالف</th><th>الفرق</th></tr></thead><tbody>{products.map((p, i) => { const c = counts.find(x => x.productId === p.id); if (!c) return null; const v = stockVariance(c); return <tr key={p.id}><td>{p.name}</td><td>{locationFor(i)}</td><td>{c.system}</td><td><input className="p6-num" type="number" min={0} value={c.counted} aria-label={`الكمية الفعلية ${p.name}`} onChange={e => set(p.id, "counted", Number(e.target.value))} /></td><td><input className="p6-num" type="number" min={0} value={c.damaged} aria-label={`التالف ${p.name}`} onChange={e => set(p.id, "damaged", Number(e.target.value))} /></td><td><StatusPill tone={v === 0 ? "green" : v < 0 ? "red" : "amber"}>{v > 0 ? `+${v}` : v}</StatusPill></td></tr> })}</tbody></table></div></SectionCard>
  </div>
}

/* 3. Live orders */
const incomingNames = ["صيدلية الشفاء", "صيدلية النهدي فرع العليا", "صيدلية الدواء", "صيدلية الرعاية"]
type Live = { id: string; pharmacy: string; total: number; items: number; at: string; status: "new" | "accepted" | "invoiced" }
export function LiveOrdersView({ onLog }: { onLog: (text: string) => void }) {
  const [list, setList] = useState<Live[]>([{ id: "LIVE-901", pharmacy: "صيدلية الندى", total: 640, items: 6, at: "قبل دقيقتين", status: "new" }])
  const [sound, setSound] = useState(true)
  const n = useRef(902)
  useEffect(() => {
    const t = setInterval(() => {
      const id = `LIVE-${n.current++}`
      setList(l => [{ id, pharmacy: incomingNames[n.current % incomingNames.length] ?? "صيدلية", total: 200 + (n.current % 7) * 115, items: 2 + (n.current % 5), at: "الآن", status: "new" as const }, ...l].slice(0, 12))
      if (sound) { try { const ctx = new AudioContext(); const o = ctx.createOscillator(); o.frequency.value = 880; o.connect(ctx.destination); o.start(); o.stop(ctx.currentTime + 0.15) } catch { /* audio blocked */ } }
      toast.info(`طلب جديد ${id}`)
    }, 20000)
    return () => clearInterval(t)
  }, [sound])
  const move = (id: string, status: Live["status"]) => { setList(l => l.map(o => o.id === id ? { ...o, status } : o)); onLog(status === "accepted" ? `قبل الطلب ${id}` : `حوّل الطلب ${id} إلى فاتورة`); toast.success(status === "accepted" ? "تم قبول الطلب" : "تم إصدار الفاتورة وخصم الكميات") }
  return <div className="view-stack">
    <SectionHeading eyebrow="المبيعات" title="مركز الطلبات الحية" description="تصل الطلبات لحظيًا كل 20 ثانية في العرض التجريبي مع تنبيه صوتي." action={<button className="subtle-button" onClick={() => setSound(s => !s)}><BellRing /> {sound ? "إيقاف الصوت" : "تشغيل الصوت"}</button>} />
    <div className="summary-strip"><div><span>جديدة</span><strong>{list.filter(o => o.status === "new").length}</strong></div><div><span>مقبولة</span><strong>{list.filter(o => o.status === "accepted").length}</strong></div><div><span>مفوترة</span><strong>{list.filter(o => o.status === "invoiced").length}</strong></div></div>
    <div className="p6-cards">{list.map(o => <article key={o.id} className={`p6-card ${o.status === "new" ? "is-new" : ""}`}><header><strong>{o.id}</strong><StatusPill tone={o.status === "new" ? "amber" : o.status === "accepted" ? "blue" : "green"}>{o.status === "new" ? "جديد" : o.status === "accepted" ? "مقبول" : "مفوتر"}</StatusPill></header><p>{o.pharmacy}</p><small>{o.items} أصناف · {o.at}</small><b>{formatCurrency(o.total)}</b>{o.status === "new" && <button className="primary-button" onClick={() => move(o.id, "accepted")}>قبول</button>}{o.status === "accepted" && <button className="primary-button" onClick={() => move(o.id, "invoiced")}>تحويل لفاتورة</button>}</article>)}</div>
  </div>
}

/* 4. POS */
export function PosView({ products, onSell }: { products: Product[]; onSell: (lines: { productId: string; quantity: number }[], customer: string, total: number) => void }) {
  const [lines, setLines] = useState<Record<string, number>>({})
  const [customer, setCustomer] = useState("")
  const [q, setQ] = useState("")
  const tax = 0.15
  const subtotal = Object.entries(lines).reduce((s, [id, qty]) => s + (products.find(p => p.id === id)?.price ?? 0) * qty, 0)
  const total = Math.round(subtotal * (1 + tax) * 100) / 100
  const add = (p: Product) => setLines(l => { const cur = l[p.id] ?? 0; if (cur >= p.stock - p.reserved) { toast.error("الكمية غير متوفرة"); return l } return { ...l, [p.id]: cur + 1 } })
  return <div className="view-stack">
    <SectionHeading eyebrow="المبيعات" title="البيع المباشر" description="فاتورة يدوية للطلبات الهاتفية أو الحضور المباشر، تُخصم من المخزون فورًا." />
    <div className="p6-pos">
      <SectionCard title="الأصناف"><input className="p6-search" placeholder="ابحث عن صنف" value={q} onChange={e => setQ(e.target.value)} /><div className="p6-pos-grid">{products.filter(p => p.name.includes(q)).map(p => <button key={p.id} type="button" className="p6-pos-item" onClick={() => add(p)}><strong>{p.name}</strong><small>{formatCurrency(p.price)} · متاح {p.stock - p.reserved}</small></button>)}</div></SectionCard>
      <SectionCard title="الفاتورة">
        <label className="field-label">اسم العميل<input value={customer} onChange={e => setCustomer(e.target.value)} placeholder="عميل هاتفي" /></label>
        {Object.keys(lines).length === 0 ? <EmptyState title="لا توجد أصناف" description="اضغط على صنف لإضافته." /> : <ul className="p6-list">{Object.entries(lines).map(([id, qty]) => { const p = products.find(x => x.id === id); return <li key={id}><span><strong>{p?.name}</strong><small>{qty} × {formatCurrency(p?.price ?? 0)}</small></span><button className="icon-action" aria-label="حذف" onClick={() => setLines(l => { const { [id]: _, ...rest } = l; return rest })}><Trash2 /></button></li> })}</ul>}
        <div className="p6-totals"><span>المجموع</span><b>{formatCurrency(subtotal)}</b><span>ضريبة 15%</span><b>{formatCurrency(total - subtotal)}</b><span>الإجمالي</span><b>{formatCurrency(total)}</b></div>
        <button className="primary-button" disabled={subtotal === 0} onClick={() => { onSell(Object.entries(lines).map(([productId, quantity]) => ({ productId, quantity })), customer || "عميل مباشر", total); setLines({}); setCustomer(""); toast.success("تم إصدار الفاتورة") }}>إصدار الفاتورة</button>
      </SectionCard>
    </div>
  </div>
}

/* 5. Fleet */
const statusLabel = { available: "متاح", busy: "في مهمة", offline: "خارج العمل" } as const
export function FleetView({ agents: initial, orders }: { agents: DeliveryAgent[]; orders: Order[] }) {
  const [agents, setAgents] = useState(initial)
  return <div className="view-stack">
    <SectionHeading eyebrow="التوصيل" title="أسطول المناديب" description="بيانات المناديب وحالة تواجدهم ومهامهم الحالية." />
    <div className="summary-strip">{(["available", "busy", "offline"] as const).map(s => <div key={s}><span>{statusLabel[s]}</span><strong>{agents.filter(a => a.status === s).length}</strong></div>)}</div>
    <SectionCard title="المناديب"><div className="table-wrap"><table className="data-table"><thead><tr><th>المندوب</th><th>الهاتف</th><th>المنطقة</th><th>طلبات مسندة</th><th>الحالة</th></tr></thead><tbody>{agents.map(a => <tr key={a.id}><td>{a.name}</td><td dir="ltr">{a.phone}</td><td>{a.region}</td><td>{orders.filter(o => o.assignedTo === a.name && o.orderStatus !== "delivered").length}</td><td><select aria-label={`حالة ${a.name}`} value={a.status} onChange={e => { setAgents(as => as.map(x => x.id === a.id ? { ...x, status: e.target.value as DeliveryAgent["status"] } : x)); toast.success("تم تحديث الحالة") }}>{Object.entries(statusLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></td></tr>)}</tbody></table></div></SectionCard>
  </div>
}

/* 6. Live map */
export function LiveMapView({ agents, orders }: { agents: DeliveryAgent[]; orders: Order[] }) {
  const [tick, setTick] = useState(0)
  useEffect(() => { const t = setInterval(() => setTick(x => x + 1), 3000); return () => clearInterval(t) }, [])
  const pts = useMemo(() => orders.slice(0, 10).map((o, i) => ({ o, x: 10 + ((i * 37) % 80), y: 12 + ((i * 53) % 76) })), [orders])
  return <div className="view-stack">
    <SectionHeading eyebrow="التوصيل" title="التتبع اللحظي" description="خريطة توضيحية لمواقع المناديب والطلبات المسلّمة والمعلّقة." />
    <div className="p6-map" role="img" aria-label="خريطة التتبع">
      {pts.map(({ o, x, y }) => <span key={o.id} className={`p6-pin ${o.orderStatus === "delivered" ? "done" : "pending"}`} style={{ left: `${x}%`, top: `${y}%` }} title={`${o.id} · ${o.pharmacy}`}><MapPin /></span>)}
      {agents.map((a, i) => { const x = 20 + ((i * 29 + tick * (i + 1) * 3) % 60); const y = 25 + ((i * 41 + tick * 2) % 50); return <span key={a.id} className={`p6-agent s-${a.status}`} style={{ left: `${x}%`, top: `${y}%` }}>{a.name.slice(0, 1)}<small>{a.name}</small></span> })}
    </div>
    <div className="p6-legend"><span><i className="done" /> مسلّم</span><span><i className="pending" /> قيد الانتظار</span><span><i className="agent" /> مندوب</span></div>
  </div>
}

/* 7. Cash settlement */
export function CustodyView({ agents, orders, onDeposit }: { agents: DeliveryAgent[]; orders: Order[]; onDeposit: (agent: string, amount: number) => void }) {
  const [closed, setClosed] = useState<Record<string, number>>({})
  const collectedFor = (name: string) => orders.filter(o => o.assignedTo === name && o.deliveryProof).reduce((s, o) => s + (o.deliveryProof?.collectedAmount ?? 0), 0) + (name.length * 37)
  return <div className="view-stack">
    <SectionHeading eyebrow="التوصيل" title="تسوية عهدة المناديب" description="مراجعة النقد المحصّل مع كل مندوب وإغلاق عهدته وإيداعها في الخزينة." />
    <SectionCard title={`عهد اليوم ${today}`}><div className="table-wrap"><table className="data-table"><thead><tr><th>المندوب</th><th>المحصّل</th><th>المودَع</th><th>الفرق</th><th></th></tr></thead><tbody>{agents.map(a => { const c = collectedFor(a.name); const dep = closed[a.id]; return <tr key={a.id}><td>{a.name}</td><td>{formatCurrency(c)}</td><td>{dep === undefined ? <input className="p6-num" type="number" defaultValue={c} id={`dep-${a.id}`} aria-label={`المبلغ المودع ${a.name}`} /> : formatCurrency(dep)}</td><td>{dep === undefined ? "—" : <StatusPill tone={custodyShortfall(c, dep) === 0 ? "green" : "red"}>{formatCurrency(custodyShortfall(c, dep))}</StatusPill>}</td><td>{dep === undefined ? <button className="primary-button" onClick={() => { const v = Number((document.getElementById(`dep-${a.id}`) as HTMLInputElement | null)?.value ?? c); setClosed(x => ({ ...x, [a.id]: v })); onDeposit(a.name, v); toast.success("تم إغلاق العهدة وإيداعها") }}>إغلاق العهدة</button> : <StatusPill tone="green">مغلقة</StatusPill>}</td></tr> })}</tbody></table></div></SectionCard>
  </div>
}

/* 8. Treasury */
export function TreasuryView({ vouchers, opening, onAdd }: { vouchers: Voucher[]; opening: number; onAdd: (v: Voucher) => void }) {
  const receipts = vouchers.filter(v => v.type === "receipt").reduce((s, v) => s + v.amount, 0)
  const payments = vouchers.filter(v => v.type === "payment").reduce((s, v) => s + v.amount, 0)
  return <div className="view-stack">
    <SectionHeading eyebrow="المالية" title="الخزينة والمقبوضات" description="سندات القبض والصرف اليومية ورصيد الخزينة." />
    <div className="summary-strip"><Stat label="الرصيد الافتتاحي" value={formatCurrency(opening)} /><Stat label="المقبوضات" value={formatCurrency(receipts)} /><Stat label="المصروفات" value={formatCurrency(payments)} /><Stat label="رصيد الخزينة" value={formatCurrency(treasuryBalance(opening, vouchers))} /></div>
    <SectionCard title="سند جديد"><form className="p6-form" onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget); const amount = Number(f.get("amount")); if (!(amount > 0)) { toast.error("أدخل مبلغًا صحيحًا"); return } onAdd({ id: `V-${Date.now()}`, type: f.get("type") as Voucher["type"], amount, party: String(f.get("party") ?? ""), note: String(f.get("note") ?? ""), date: today }); e.currentTarget.reset(); toast.success("تم تسجيل السند") }}><select name="type" aria-label="نوع السند"><option value="receipt">سند قبض</option><option value="payment">سند صرف</option></select><input name="amount" type="number" step="0.01" placeholder="المبلغ" aria-label="المبلغ" required /><input name="party" placeholder="الجهة" aria-label="الجهة" required /><input name="note" placeholder="البيان" aria-label="البيان" /><button className="primary-button"><Plus /> تسجيل</button></form></SectionCard>
    <SectionCard title="حركة اليوم"><div className="table-wrap"><table className="data-table"><thead><tr><th>رقم السند</th><th>النوع</th><th>الجهة</th><th>البيان</th><th>المبلغ</th></tr></thead><tbody>{vouchers.map(v => <tr key={v.id}><td>{v.id}</td><td><StatusPill tone={v.type === "receipt" ? "green" : "red"}>{v.type === "receipt" ? "قبض" : "صرف"}</StatusPill></td><td>{v.party}</td><td>{v.note}</td><td>{formatCurrency(v.amount)}</td></tr>)}</tbody></table></div></SectionCard>
  </div>
}

/* 9. Expenses */
const categories = ["وقود", "رواتب", "صيانة", "إيجار", "أخرى"]
export function ExpensesView({ expenses, revenue, onAdd }: { expenses: Expense[]; revenue: number; onAdd: (e: Expense) => void }) {
  const cogs = Math.round(revenue * 0.68)
  const byCat = categories.map(c => ({ c, total: expenses.filter(e => e.category === c).reduce((s, e) => s + e.amount, 0) }))
  const max = Math.max(1, ...byCat.map(b => b.total))
  return <div className="view-stack">
    <SectionHeading eyebrow="المالية" title="المصروفات التشغيلية" description="تسجيل المصروفات لحساب صافي الربح الحقيقي." />
    <div className="summary-strip"><Stat label="الإيرادات" value={formatCurrency(revenue)} /><Stat label="تكلفة البضاعة" value={formatCurrency(cogs)} /><Stat label="المصروفات" value={formatCurrency(expenses.reduce((s, e) => s + e.amount, 0))} /><Stat label="صافي الربح" value={formatCurrency(netProfit(revenue, cogs, expenses))} /></div>
    <div className="p6-grid">
      <SectionCard title="مصروف جديد"><form className="p6-form" onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget); const amount = Number(f.get("amount")); if (!(amount > 0)) { toast.error("أدخل مبلغًا صحيحًا"); return } onAdd({ id: `EX-${Date.now()}`, category: String(f.get("category")), amount, note: String(f.get("note") ?? ""), date: today }); e.currentTarget.reset(); toast.success("تم تسجيل المصروف") }}><select name="category" aria-label="البند">{categories.map(c => <option key={c}>{c}</option>)}</select><input name="amount" type="number" step="0.01" placeholder="المبلغ" aria-label="المبلغ" required /><input name="note" placeholder="الوصف" aria-label="الوصف" /><button className="primary-button"><Plus /> إضافة</button></form></SectionCard>
      <SectionCard title="حسب البند"><ul className="p6-bars">{byCat.map(b => <li key={b.c}><span>{b.c}</span><i style={{ width: `${(b.total / max) * 100}%` }} /><b>{formatCurrency(b.total)}</b></li>)}</ul></SectionCard>
    </div>
    <SectionCard title="السجل"><div className="table-wrap"><table className="data-table"><thead><tr><th>التاريخ</th><th>البند</th><th>الوصف</th><th>المبلغ</th></tr></thead><tbody>{expenses.map(e => <tr key={e.id}><td>{e.date}</td><td>{e.category}</td><td>{e.note}</td><td>{formatCurrency(e.amount)}</td></tr>)}</tbody></table></div></SectionCard>
  </div>
}

export const demoVouchers: Voucher[] = [
  { id: "V-1001", type: "receipt", amount: 4200, party: "صيدلية الندى", note: "سداد فاتورة", date: today },
  { id: "V-1002", type: "payment", amount: 950, party: "محطة وقود", note: "وقود سيارات التوصيل", date: today },
]
export const demoExpenses: Expense[] = [
  { id: "EX-1", category: "رواتب", amount: 18000, note: "رواتب المناديب", date: today },
  { id: "EX-2", category: "وقود", amount: 2400, note: "وقود الأسبوع", date: today },
  { id: "EX-3", category: "صيانة", amount: 1100, note: "صيانة سيارة 3", date: today },
]
export { adjustedStock }
function Stat({ label, value }: { label: string; value: string }) { return <div><span>{label}</span><strong>{value}</strong></div> }
