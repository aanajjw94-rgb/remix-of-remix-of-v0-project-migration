import { ExternalLink, MapPin, Navigation, Phone } from "lucide-react"
import { Modal } from "./modal"
import { formatCurrency } from "./shared"
import type { Order } from "./types"

const hash = (value: string) => { let h = 7; for (const char of value) h = (h * 31 + char.charCodeAt(0)) >>> 0; return h }
const mapsUrl = (address: string) => `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`

/** Illustrative route: stops are placed deterministically on a stylised city grid (not real coordinates). */
export function RouteMapModal({ orders, driverName, focusId, onClose }: { orders: Order[]; driverName: string; focusId?: string | null | undefined; onClose: () => void }) {
  const depot = { x: 70, y: 300 }
  const stops = orders.map((order, index) => {
    const h = hash(order.id + order.pharmacy)
    return { order, index, x: 150 + ((h % 360) + index * 37) % 380, y: 50 + ((h >> 7) % 220) }
  })
  let distance = 0
  let previous = depot
  const legs = stops.map((stop) => { const km = Math.round(Math.hypot(stop.x - previous.x, stop.y - previous.y) / 22 * 10) / 10 + 1.2; distance += km; previous = stop; return km })
  const path = [depot, ...stops].map((point) => `${point.x},${point.y}`).join(" ")
  const fullRoute = orders.length ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(orders[orders.length - 1]!.deliveryAddress ?? orders[orders.length - 1]!.region)}${orders.length > 1 ? `&waypoints=${encodeURIComponent(orders.slice(0, -1).map((order) => order.deliveryAddress ?? order.region).join("|"))}` : ""}` : "https://www.google.com/maps"

  return (
    <Modal title="خريطة مسار اليوم" eyebrow={`${driverName} · ${orders.length} محطات`} close={onClose} className="route-modal">
      <div className="route-map" dir="ltr">
        <svg viewBox="0 0 600 340" role="img" aria-label="خريطة توضيحية لمسار التوصيل">
          <rect width="600" height="340" rx="14" className="route-map-bg" />
          {[60, 130, 200, 270].map((y) => <line key={`h${y}`} x1="0" x2="600" y1={y} y2={y} className="route-street" />)}
          {[110, 220, 330, 440, 530].map((x) => <line key={`v${x}`} y1="0" y2="340" x1={x} x2={x} className="route-street" />)}
          <path d="M0 320 C 160 250, 300 330, 600 230" className="route-highway" />
          <rect x="380" y="150" width="70" height="40" rx="8" className="route-park" />
          <polyline points={path} className="route-line" />
          <g><circle cx={depot.x} cy={depot.y} r="15" className="route-depot" /><text x={depot.x} y={depot.y + 4} textAnchor="middle" className="route-depot-text">م</text></g>
          {stops.map((stop) => <g key={stop.order.id} className={focusId === stop.order.id ? "route-stop focus" : "route-stop"}><circle cx={stop.x} cy={stop.y} r="14" /><text x={stop.x} y={stop.y + 4} textAnchor="middle">{stop.index + 1}</text></g>)}
        </svg>
        <span className="route-map-note">خريطة توضيحية · المسافات تقديرية</span>
      </div>
      <div className="ops-impact"><div><span>المحطات</span><strong>{orders.length}</strong></div><div><span>المسافة التقديرية</span><strong>{distance.toFixed(1)} كم</strong></div><div><span>الوقت التقديري</span><strong>{Math.round(distance * 3 + orders.length * 8)} دقيقة</strong></div><div><span>للتحصيل</span><strong>{formatCurrency(orders.reduce((sum, order) => sum + Math.max(order.total - order.paidAmount, 0), 0))}</strong></div></div>
      <ol className="route-stops">{stops.map((stop, i) => <li key={stop.order.id} className={focusId === stop.order.id ? "focus" : ""}><span className="route-index">{i + 1}</span><div><strong>{stop.order.pharmacy}</strong><small><MapPin aria-hidden="true" /> {stop.order.deliveryAddress ?? stop.order.region} · {legs[i]} كم</small></div><a className="call-link" href={`tel:${stop.order.pharmacyPhone.replace(/\s/g, "")}`} aria-label={`اتصال بـ ${stop.order.pharmacy}`}><Phone aria-hidden="true" /></a><a className="call-link" href={mapsUrl(stop.order.deliveryAddress ?? stop.order.region)} target="_blank" rel="noreferrer" aria-label={`ملاحة إلى ${stop.order.pharmacy}`}><Navigation aria-hidden="true" /></a></li>)}</ol>
      {orders.length === 0 && <p className="ops-muted">لا توجد محطات نشطة في المسار.</p>}
      <div className="form-actions"><a className="primary-button" href={fullRoute} target="_blank" rel="noreferrer"><ExternalLink aria-hidden="true" /> فتح المسار في خرائط Google</a></div>
    </Modal>
  )
}
