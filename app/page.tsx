'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { ShoppingCart, Plus, Minus, MapPin, Clock, Bike, Store, Settings, ChefHat, Truck, CheckCircle2, CreditCard, Search, BellRing, Home, Smartphone, Star, Flame, Database, UserRound, BarChart3, ShieldCheck, Timer, Save, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const START_MENU = [
  { id: 1, active: true, popular: true, category: 'Kebab', name: 'Kebab Rulle', description: 'Kebabkött, sallad, tomat, lök och valfri sås.', price: 8.5 },
  { id: 2, active: true, popular: true, category: 'Kebab', name: 'Kebab Tallrik', description: 'Kebabkött med pommes, sallad och sås.', price: 10.5 },
  { id: 3, active: true, popular: false, category: 'Pizza', name: 'Margarita', description: 'Tomatsås, mozzarella och oregano.', price: 8.0 },
  { id: 4, active: true, popular: true, category: 'Pizza', name: 'Kebab Pizza', description: 'Tomatsås, ost, kebabkött, lök och kebabsås.', price: 11.5 },
  { id: 5, active: true, popular: false, category: 'Burgare', name: 'Ninos Burger', description: 'Hamburgare med ost, sallad, tomat och specialsås.', price: 9.5 },
  { id: 6, active: true, popular: false, category: 'Dryck', name: 'Coca-Cola 33cl', description: 'Kall dryck.', price: 2.0 },
];

const DELIVERY_ZONES = [
  { name: 'Zon 1', distance: '0–1.5 km', fee: 2, min: 15, eta: 35 },
  { name: 'Zon 2', distance: '1.5–3 km', fee: 3.5, min: 20, eta: 45 },
];

const STATUS_FLOW = ['Ny order', 'Betald', 'Accepterad', 'I köket', 'Klar för leverans', 'Ute för leverans', 'Levererad'];
const DRIVERS = ['Ej tilldelad', 'Chaufför 1', 'Chaufför 2', 'Chaufför 3'];

function euro(value: number) { return `${Number(value || 0).toFixed(2)} €`; }
function nowTime() { return new Date().toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' }); }
function todayDate() { return new Date().toLocaleDateString('sv-SE'); }
function loadStorage(key: string, fallback: any) {
  if (typeof window === 'undefined') return fallback;
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; } catch { return fallback; }
}
function fakePayment(orderTotal: number) {
  return new Promise<{ok:boolean;paymentId:string;amount:number}>((resolve) => setTimeout(() => resolve({ ok: true, paymentId: `PAY-${Date.now().toString().slice(-7)}`, amount: orderTotal }), 500));
}

type MenuItem = typeof START_MENU[number];
type Order = any;

export default function NinosKebabApp() {
  const [view, setView] = useState('shop');
  const [menu, setMenu] = useState<MenuItem[]>(() => loadStorage('ninos_menu', START_MENU));
  const [orders, setOrders] = useState<Order[]>(() => loadStorage('ninos_orders', []));
  const [customers, setCustomers] = useState<any[]>(() => loadStorage('ninos_customers', []));
  const [cart, setCart] = useState<any[]>([]);
  const [category, setCategory] = useState('Alla');
  const [orderType, setOrderType] = useState('delivery');
  const [zone, setZone] = useState(DELIVERY_ZONES[0]);
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [prepTime, setPrepTime] = useState(40);
  const [search, setSearch] = useState('');
  const [isPaying, setIsPaying] = useState(false);
  const [customer, setCustomer] = useState({ name: '', phone: '', address: '', note: '' });

  useEffect(() => localStorage.setItem('ninos_menu', JSON.stringify(menu)), [menu]);
  useEffect(() => localStorage.setItem('ninos_orders', JSON.stringify(orders)), [orders]);
  useEffect(() => localStorage.setItem('ninos_customers', JSON.stringify(customers)), [customers]);

  const activeMenu = menu.filter((item) => item.active);
  const categories = ['Alla', 'Populärt', ...Array.from(new Set(activeMenu.map((item) => item.category)))];
  const filteredMenu = activeMenu.filter((item) => {
    const categoryMatch = category === 'Alla' || item.category === category || (category === 'Populärt' && item.popular);
    const searchMatch = !search || `${item.name} ${item.description}`.toLowerCase().includes(search.toLowerCase());
    return categoryMatch && searchMatch;
  });
  const popularItems = activeMenu.filter((item) => item.popular).slice(0, 3);
  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + item.price * item.qty, 0), [cart]);
  const deliveryFee = orderType === 'delivery' ? zone.fee : 0;
  const total = subtotal + deliveryFee;
  const minOrderOk = orderType === 'pickup' || subtotal >= zone.min;
  const openOrders = orders.filter((o) => o.status !== 'Levererad');
  const deliveryOrders = orders.filter((o) => o.type === 'delivery' && o.status !== 'Levererad');
  const revenueToday = orders.reduce((sum, order) => sum + order.total, 0);

  function addToCart(product: any) {
    setCart((current) => {
      const existing = current.find((item) => item.id === product.id);
      if (existing) return current.map((item) => (item.id === product.id ? { ...item, qty: item.qty + 1 } : item));
      return [...current, { ...product, qty: 1 }];
    });
  }
  function updateQty(id: number, change: number) { setCart((current) => current.map((item) => (item.id === id ? { ...item, qty: item.qty + change } : item)).filter((item) => item.qty > 0)); }
  function saveCustomer(c: any) {
    const exists = customers.find((item) => item.phone === c.phone);
    if (exists) setCustomers((current) => current.map((item) => (item.phone === c.phone ? { ...item, ...c, lastOrder: todayDate() } : item)));
    else setCustomers([{ ...c, firstOrder: todayDate(), lastOrder: todayDate() }, ...customers]);
  }
  async function createOrder() {
    if (!cart.length) return alert('Lägg till produkter först.');
    if (!customer.name || !customer.phone) return alert('Fyll i namn och telefon.');
    if (orderType === 'delivery' && !customer.address) return alert('Fyll i leveransadress.');
    if (!minOrderOk) return alert(`Minsta order för ${zone.name} är ${euro(zone.min)}.`);
    setIsPaying(true);
    let paymentResult: any = { ok: true, paymentId: null, amount: total };
    if (paymentMethod === 'card') paymentResult = await fakePayment(total);
    if (!paymentResult.ok) { setIsPaying(false); return alert('Betalningen gick inte igenom.'); }
    const order = {
      id: `NK-${Date.now().toString().slice(-6)}`, date: todayDate(), time: nowTime(), type: orderType,
      zone: orderType === 'delivery' ? zone : null, prepTime: orderType === 'delivery' ? Math.max(prepTime, zone.eta) : prepTime,
      customer: { ...customer }, items: cart, subtotal, deliveryFee, total, paymentMethod,
      paymentId: paymentResult.paymentId, paymentStatus: paymentMethod === 'card' ? 'Betald online' : 'Betalas vid leverans/hämtning',
      status: paymentMethod === 'card' ? 'Betald' : 'Ny order', driver: 'Ej tilldelad', source: 'Egen webbapp'
    };
    setOrders([order, ...orders]); saveCustomer(customer); setCart([]); setCustomer({ name: '', phone: '', address: '', note: '' }); setIsPaying(false); setView('kitchen');
  }
  function updateOrder(id: string, patch: any) { setOrders((current) => current.map((order) => (order.id === id ? { ...order, ...patch } : order))); }
  function nextStatus(order: any) { const index = STATUS_FLOW.indexOf(order.status); return STATUS_FLOW[Math.min(index + 1, STATUS_FLOW.length - 1)]; }
  function updateMenuItem(id: number, field: string, value: any) { setMenu((current) => current.map((item) => (item.id === id ? { ...item, [field]: field === 'price' ? Number(value) : value } : item))); }
  function addMenuItem() { const nextId = Math.max(...menu.map((item) => item.id), 0) + 1; setMenu([...menu, { id: nextId, active: true, popular: false, category: 'Ny', name: 'Ny produkt', description: 'Beskrivning', price: 0 }]); }
  function orderTicket(order: any) { return [`NINOS KEBAB · ${order.id}`, `${order.date} ${order.time}`, `${order.type === 'delivery' ? 'Leverans' : 'Hämtning'} · ${order.status}`, '', ...order.items.map((item: any) => `${item.qty}x ${item.name} - ${euro(item.price * item.qty)}`), '', `Namn: ${order.customer.name}`, `Tel: ${order.customer.phone}`, order.type === 'delivery' ? `Adress: ${order.customer.address}` : 'Hämtas i restaurangen', order.customer.note ? `Kommentar: ${order.customer.note}` : 'Kommentar: -', '', `Mat: ${euro(order.subtotal)}`, `Leverans: ${euro(order.deliveryFee)}`, `Totalt: ${euro(order.total)}`, `Betalning: ${order.paymentStatus}`].join('\n'); }

  const NavButton = ({ id, icon: Icon, label }: any) => <button onClick={() => setView(id)} className={`flex flex-col items-center justify-center gap-1 text-xs ${view === id ? 'text-orange-600' : 'text-neutral-500'}`}><Icon size={21} /><span>{label}</span></button>;

  return (
    <div className="min-h-screen bg-neutral-100 text-neutral-950 pb-20 md:pb-0">
      <header className="bg-neutral-950 text-white px-5 py-6 md:py-7">
        <div className="max-w-7xl mx-auto flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div><p className="text-sm uppercase tracking-[0.25em] text-orange-300">Palma · Avinguda de l'Argentina 8</p><h1 className="text-4xl font-bold mt-1">Ninos Kebab</h1><p className="text-neutral-300 mt-2">Webbapp med app-känsla: beställning, kök, chaufför och admin.</p></div>
          <div className="hidden md:flex flex-wrap gap-2"><Button onClick={() => setView('shop')} variant={view === 'shop' ? 'secondary' : 'outline'} className="rounded-2xl"><ShoppingCart size={17} className="mr-2" /> Kund</Button><Button onClick={() => setView('kitchen')} variant={view === 'kitchen' ? 'secondary' : 'outline'} className="rounded-2xl"><ChefHat size={17} className="mr-2" /> Kök</Button><Button onClick={() => setView('driver')} variant={view === 'driver' ? 'secondary' : 'outline'} className="rounded-2xl"><Truck size={17} className="mr-2" /> Chaufför</Button><Button onClick={() => setView('admin')} variant={view === 'admin' ? 'secondary' : 'outline'} className="rounded-2xl"><Settings size={17} className="mr-2" /> Admin</Button></div>
        </div>
      </header>
      {view === 'shop' && <main className="max-w-7xl mx-auto p-4 md:p-5 grid grid-cols-1 lg:grid-cols-[1fr_390px] gap-6"><section><div className="rounded-[2rem] bg-gradient-to-br from-neutral-950 to-neutral-800 text-white p-5 md:p-7 mb-5 shadow-lg overflow-hidden relative"><div className="absolute right-4 top-4 opacity-20"><Smartphone size={110} /></div><p className="text-orange-300 text-sm font-semibold flex items-center gap-2"><Flame size={17} /> Direktbeställning</p><h2 className="text-3xl md:text-5xl font-bold mt-2 max-w-xl">Beställ snabbare direkt från Ninos Kebab</h2><p className="text-neutral-300 mt-3 max-w-lg">Lägg appen på hemskärmen och beställ nästa gång utan Uber eller Glovo.</p><div className="grid grid-cols-3 gap-2 mt-5 max-w-lg"><div className="rounded-2xl bg-white/10 p-3"><Clock size={18} /><p className="text-sm mt-1">30–45 min</p></div><div className="rounded-2xl bg-white/10 p-3"><Bike size={18} /><p className="text-sm mt-1">Egen leverans</p></div><div className="rounded-2xl bg-white/10 p-3"><Star size={18} /><p className="text-sm mt-1">Populära rätter</p></div></div></div><Card className="rounded-3xl border-0 shadow-sm mb-5"><CardContent className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3"><div className="flex items-center gap-3"><Smartphone className="text-orange-600" /><div><p className="font-bold">App-känsla utan App Store</p><p className="text-sm text-neutral-600">Kunden öppnar hemsidan och väljer “Lägg till på hemskärmen”.</p></div></div><Button className="rounded-2xl" onClick={() => alert('På iPhone: Safari → Dela → Lägg till på hemskärmen. På Android: Chrome → ⋮ → Lägg till på startskärmen.')}>Visa instruktion</Button></CardContent></Card><div className="grid md:grid-cols-[1fr_auto] gap-3 mb-5"><div className="relative"><Search className="absolute left-3 top-3 text-neutral-400" size={18} /><input className="w-full rounded-2xl border px-10 py-3" placeholder="Sök pizza, kebab, dryck..." value={search} onChange={(e) => setSearch(e.target.value)} /></div><div className="flex items-center gap-2 rounded-2xl bg-white px-4 py-3 shadow-sm"><Clock size={18} /> Leverans ca {Math.max(prepTime, zone.eta)} min</div></div><div className="flex gap-2 overflow-x-auto pb-2 mb-4">{categories.map((cat) => <Button key={cat} onClick={() => setCategory(cat)} variant={category === cat ? 'default' : 'outline'} className="rounded-full shrink-0">{cat}</Button>)}</div>{popularItems.length > 0 && category === 'Alla' && !search && <div className="mb-5"><h3 className="text-xl font-bold mb-3 flex items-center gap-2"><Star className="text-orange-600" /> Mest beställt</h3><div className="grid sm:grid-cols-3 gap-3">{popularItems.map((item) => <button key={item.id} onClick={() => addToCart(item)} className="text-left rounded-3xl bg-white p-4 shadow-sm"><p className="text-sm text-orange-600 font-semibold">{item.category}</p><p className="font-bold">{item.name}</p><p className="text-sm text-neutral-500">{euro(item.price)}</p></button>)}</div></div>}<div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">{filteredMenu.map((item) => <Card key={item.id} className="rounded-3xl shadow-sm border-0"><CardContent className="p-5"><div className="flex justify-between items-start gap-3"><p className="text-xs font-semibold text-orange-600 uppercase">{item.category}</p>{item.popular && <span className="text-xs rounded-full bg-orange-100 text-orange-700 px-2 py-1">Populär</span>}</div><div className="flex justify-between gap-3 mt-1"><h2 className="text-xl font-bold">{item.name}</h2><div className="font-bold">{euro(item.price)}</div></div><p className="text-sm text-neutral-600 mt-2 min-h-[42px]">{item.description}</p><Button onClick={() => addToCart(item)} className="w-full mt-5 rounded-2xl"><Plus size={18} className="mr-2" /> Lägg till</Button></CardContent></Card>)}</div></section><aside className="lg:sticky lg:top-5 h-fit"><Card className="rounded-3xl shadow-lg border-0 overflow-hidden"><CardContent className="p-0"><div className="bg-white p-5 border-b"><h2 className="text-2xl font-bold flex items-center gap-2"><ShoppingCart size={24} /> Varukorg</h2><div className="grid grid-cols-2 gap-2 mt-4"><Button onClick={() => setOrderType('delivery')} variant={orderType === 'delivery' ? 'default' : 'outline'} className="rounded-2xl"><Bike size={17} className="mr-2" /> Leverans</Button><Button onClick={() => setOrderType('pickup')} variant={orderType === 'pickup' ? 'default' : 'outline'} className="rounded-2xl"><Store size={17} className="mr-2" /> Hämtning</Button></div></div><div className="p-5 bg-neutral-50 space-y-4">{cart.length === 0 ? <p className="text-neutral-500 text-sm">Din varukorg är tom.</p> : cart.map((item) => <div key={item.id} className="flex items-center justify-between gap-3 bg-white rounded-2xl p-3"><div><p className="font-semibold">{item.name}</p><p className="text-sm text-neutral-500">{euro(item.price * item.qty)}</p></div><div className="flex items-center gap-2"><Button size="icon" variant="outline" className="rounded-full" onClick={() => updateQty(item.id, -1)}><Minus size={15} /></Button><span className="w-5 text-center font-bold">{item.qty}</span><Button size="icon" variant="outline" className="rounded-full" onClick={() => updateQty(item.id, 1)}><Plus size={15} /></Button></div></div>)}{orderType === 'delivery' && <div className="bg-white rounded-2xl p-4"><p className="font-semibold flex items-center gap-2 mb-3"><MapPin size={18} /> Leveranszon</p><div className="grid gap-2">{DELIVERY_ZONES.map((z) => <button key={z.name} onClick={() => setZone(z)} className={`text-left rounded-2xl border p-3 ${zone.name === z.name ? 'border-neutral-950 bg-neutral-100' : 'border-neutral-200'}`}><div className="font-semibold">{z.name} · {z.distance}</div><div className="text-sm text-neutral-600">Avgift {euro(z.fee)} · Minsta order {euro(z.min)} · ca {z.eta} min</div></button>)}</div></div>}<div className="bg-white rounded-2xl p-4 grid gap-3"><input className="rounded-xl border px-3 py-2" placeholder="Namn" value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} /><input className="rounded-xl border px-3 py-2" placeholder="Telefon" value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} />{orderType === 'delivery' && <input className="rounded-xl border px-3 py-2" placeholder="Adress" value={customer.address} onChange={(e) => setCustomer({ ...customer, address: e.target.value })} />}<textarea className="rounded-xl border px-3 py-2 min-h-[76px]" placeholder="Kommentar, portkod, extra sås..." value={customer.note} onChange={(e) => setCustomer({ ...customer, note: e.target.value })} /></div><div className="bg-white rounded-2xl p-4"><p className="font-semibold mb-3">Betalning</p><div className="grid grid-cols-2 gap-2"><Button variant={paymentMethod === 'card' ? 'default' : 'outline'} className="rounded-2xl" onClick={() => setPaymentMethod('card')}><CreditCard size={17} className="mr-2" /> Kort online</Button><Button variant={paymentMethod === 'cash' ? 'default' : 'outline'} className="rounded-2xl" onClick={() => setPaymentMethod('cash')}>Kontant</Button></div></div><div className="bg-white rounded-2xl p-4 space-y-2"><div className="flex justify-between text-sm"><span>Mat</span><span>{euro(subtotal)}</span></div><div className="flex justify-between text-sm"><span>Leverans</span><span>{euro(deliveryFee)}</span></div><div className="flex justify-between text-xl font-bold border-t pt-3"><span>Totalt</span><span>{euro(total)}</span></div>{!minOrderOk && <p className="text-sm text-red-600">Minsta order för {zone.name}: {euro(zone.min)}</p>}</div><Button onClick={createOrder} disabled={isPaying} className="w-full rounded-2xl py-6 text-lg"><BellRing size={19} className="mr-2" /> {isPaying ? 'Behandlar betalning...' : 'Skicka order'}</Button></div></CardContent></Card></aside></main>}
      {view === 'kitchen' && <main className="max-w-7xl mx-auto p-5"><div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-5"><h2 className="text-3xl font-bold flex items-center gap-2"><ChefHat /> Köksskärm</h2><div className="flex items-center gap-2 bg-white rounded-2xl px-4 py-3"><Timer size={18} /> Standardtid <input className="w-16 border rounded-lg px-2 py-1" type="number" value={prepTime} onChange={(e) => setPrepTime(Number(e.target.value))} /> min</div></div><div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">{openOrders.length === 0 && <p>Inga öppna ordrar.</p>}{openOrders.map((order) => <Card key={order.id} className="rounded-3xl border-0 shadow-sm"><CardContent className="p-5 space-y-4"><div className="flex justify-between"><div><h3 className="text-xl font-bold">{order.id}</h3><p className="text-sm text-neutral-500">{order.time} · {order.type === 'delivery' ? 'Leverans' : 'Hämtning'} · ca {order.prepTime} min</p></div><span className="rounded-full bg-orange-100 px-3 py-1 text-sm font-semibold h-fit">{order.status}</span></div><div className="rounded-2xl bg-neutral-100 p-4 font-mono text-sm whitespace-pre-wrap max-h-80 overflow-auto">{orderTicket(order)}</div><div className="grid grid-cols-2 gap-2"><Button className="rounded-2xl" onClick={() => updateOrder(order.id, { status: 'Accepterad' })}><ShieldCheck size={17} className="mr-2" /> Acceptera</Button><Button className="rounded-2xl" variant="outline" onClick={() => updateOrder(order.id, { status: nextStatus(order) })}>Nästa status</Button></div></CardContent></Card>)}</div></main>}
      {view === 'driver' && <main className="max-w-7xl mx-auto p-5"><h2 className="text-3xl font-bold mb-5 flex items-center gap-2"><Truck /> Chaufförvy</h2><div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">{deliveryOrders.length === 0 && <p>Inga aktiva leveranser.</p>}{deliveryOrders.map((order) => <Card key={order.id} className="rounded-3xl border-0 shadow-sm"><CardContent className="p-5 space-y-3"><div className="flex justify-between"><h3 className="text-xl font-bold">{order.id}</h3><span className="text-sm font-semibold">{euro(order.total)}</span></div><p className="rounded-full bg-neutral-100 px-3 py-1 text-sm font-semibold inline-block">{order.status}</p><p className="font-semibold">{order.customer.name} · {order.customer.phone}</p><p className="flex items-start gap-2 text-neutral-700"><MapPin size={18} className="mt-1" /> {order.customer.address}</p><p className="text-sm text-neutral-500">{order.zone?.name} · {order.zone?.distance} · {order.paymentStatus}</p><select className="w-full rounded-xl border px-3 py-2" value={order.driver} onChange={(e) => updateOrder(order.id, { driver: e.target.value })}>{DRIVERS.map((driver) => <option key={driver}>{driver}</option>)}</select><div className="grid grid-cols-2 gap-2 pt-2"><Button className="rounded-2xl" onClick={() => updateOrder(order.id, { status: 'Ute för leverans' })}><Bike size={17} className="mr-2" /> Kör</Button><Button className="rounded-2xl" variant="outline" onClick={() => updateOrder(order.id, { status: 'Levererad' })}><CheckCircle2 size={17} className="mr-2" /> Levererad</Button></div></CardContent></Card>)}</div></main>}
      {view === 'admin' && <main className="max-w-7xl mx-auto p-5"><div className="grid md:grid-cols-4 gap-4 mb-5"><Card className="rounded-3xl border-0 shadow-sm"><CardContent className="p-5"><p className="text-sm text-neutral-500 flex gap-2 items-center"><Database size={16} /> Ordrar</p><p className="text-3xl font-bold">{orders.length}</p></CardContent></Card><Card className="rounded-3xl border-0 shadow-sm"><CardContent className="p-5"><p className="text-sm text-neutral-500">Öppna</p><p className="text-3xl font-bold">{openOrders.length}</p></CardContent></Card><Card className="rounded-3xl border-0 shadow-sm"><CardContent className="p-5"><p className="text-sm text-neutral-500 flex gap-2 items-center"><BarChart3 size={16} /> Försäljning</p><p className="text-3xl font-bold">{euro(revenueToday)}</p></CardContent></Card><Card className="rounded-3xl border-0 shadow-sm"><CardContent className="p-5"><p className="text-sm text-neutral-500 flex gap-2 items-center"><UserRound size={16} /> Kunder</p><p className="text-3xl font-bold">{customers.length}</p></CardContent></Card></div><div className="grid lg:grid-cols-[1fr_360px] gap-5"><section><div className="flex items-center justify-between mb-5"><h2 className="text-3xl font-bold flex items-center gap-2"><Settings /> Menyadmin</h2><Button className="rounded-2xl" onClick={addMenuItem}><Plus size={17} className="mr-2" /> Lägg produkt</Button></div><div className="grid gap-3">{menu.map((item) => <Card key={item.id} className="rounded-3xl border-0 shadow-sm"><CardContent className="p-4 grid md:grid-cols-[90px_1fr_1fr_90px_90px_100px] gap-3 items-center"><input className="rounded-xl border px-3 py-2" value={item.category} onChange={(e) => updateMenuItem(item.id, 'category', e.target.value)} /><input className="rounded-xl border px-3 py-2 font-semibold" value={item.name} onChange={(e) => updateMenuItem(item.id, 'name', e.target.value)} /><input className="rounded-xl border px-3 py-2" value={item.description} onChange={(e) => updateMenuItem(item.id, 'description', e.target.value)} /><input className="rounded-xl border px-3 py-2" type="number" step="0.5" value={item.price} onChange={(e) => updateMenuItem(item.id, 'price', e.target.value)} /><Button variant={item.popular ? 'default' : 'outline'} className="rounded-2xl" onClick={() => updateMenuItem(item.id, 'popular', !item.popular)}>{item.popular ? 'Pop' : 'Vanlig'}</Button><Button variant={item.active ? 'default' : 'outline'} className="rounded-2xl" onClick={() => updateMenuItem(item.id, 'active', !item.active)}>{item.active ? 'Aktiv' : 'Pausad'}</Button></CardContent></Card>)}</div><div className="mt-5 flex gap-2"><Button className="rounded-2xl" onClick={() => alert('Sparat lokalt. I riktig version sparas detta i Supabase/Firebase.')}><Save size={17} className="mr-2" /> Spara</Button><Button variant="outline" className="rounded-2xl" onClick={() => { if (confirm('Rensa alla ordrar?')) setOrders([]); }}><Trash2 size={17} className="mr-2" /> Rensa ordrar</Button></div></section><aside className="space-y-4"><Card className="rounded-3xl border-0 shadow-sm"><CardContent className="p-5"><h3 className="font-bold text-xl mb-3">App-känsla</h3><div className="text-sm text-neutral-600 space-y-2"><p><b>PWA:</b> kan installeras på mobilens hemskärm.</p><p><b>Manifest:</b> appnamn, ikon och färg.</p><p><b>Offline-cache:</b> meny kan laddas snabbt.</p><p><b>Push:</b> kan läggas till senare för erbjudanden.</p></div></CardContent></Card><Card className="rounded-3xl border-0 shadow-sm"><CardContent className="p-5"><h3 className="font-bold text-xl mb-3">Senaste kunder</h3><div className="space-y-2 text-sm">{customers.slice(0, 6).map((c) => <div key={c.phone} className="rounded-2xl bg-neutral-100 p-3"><b>{c.name}</b><br />{c.phone}<br />{c.address}</div>)}{customers.length === 0 && <p className="text-neutral-500">Inga kunder ännu.</p>}</div></CardContent></Card></aside></div></main>}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg grid grid-cols-4 py-2 md:hidden z-50"><NavButton id="shop" icon={Home} label="Beställ" /><NavButton id="kitchen" icon={ChefHat} label="Kök" /><NavButton id="driver" icon={Truck} label="Bud" /><NavButton id="admin" icon={Settings} label="Admin" /></nav>
    </div>
  );
}
