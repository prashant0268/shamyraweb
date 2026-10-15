import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useCatalog } from '../../context/CatalogContext';
import { useToast } from '../../context/ToastContext';
import { deleteProduct, importDefaultCatalog, saveProduct, uploadProductImage } from '../../services/admin';
import { money, slugify } from '../../lib/format';
import Button from '../../components/ui/Button';
import { Badge, Field, ProductImage } from '../../components/ui/Bits';
import { CATEGORY_LABELS, type Category, type Product, type Variant } from '../../types';

const COLLECTIONS = ['best-sellers', 'new-arrivals', 'christmas', 'gift-sets', 'bath-body', 'corporate'];
const blank = (): Product => ({ id: '', slug: '', name: '', category: 'candle', tagline: '', description: '', images: [], family: 'Floral', notes: { top: '', heart: '', base: '' }, burnTime: '', wax: 'Coconut-soy blend', wick: 'Cotton', ingredients: '', variants: [{ id: '8oz', label: '8 oz', price: 24.99, stock: 20 }], featured: false, isNewArrival: true, collections: [], active: true, sortOrder: 99, badge: '' });

export default function AdminProducts() {
  const { id } = useParams();
  const { allProducts, source, refresh } = useCatalog();
  const toast = useToast();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const editing = id ? (id === 'new' ? blank() : allProducts.find((p) => p.id === id)) : null;

  const importCatalog = async (overwrite: boolean) => {
    setBusy(true);
    try { const n = await importDefaultCatalog(overwrite); await refresh(); toast(`${n} products ${overwrite ? 'reset' : 'imported'}`); } catch (e) { toast((e as Error).message); } finally { setBusy(false); }
  };

  if (editing) return <ProductEditor product={editing} isNew={id === 'new'} onDone={async () => { await refresh(); navigate('/admin/products'); }} />;
  const list = allProducts.filter((p) => !q || (p.name + p.category + p.family).toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2"><input className="input max-w-xs" placeholder="Search products" value={q} onChange={(e) => setQ(e.target.value)} /><div className="flex-1" />
        {source === 'local' ? <Button variant="accent" size="sm" disabled={busy} onClick={() => importCatalog(false)}>Import default catalog to Firestore</Button> : <Button variant="ghost" size="sm" disabled={busy} onClick={() => importCatalog(false)}>Add missing defaults</Button>}
        <Button size="sm" to="/admin/products/new">+ Add product</Button></div>
      {source === 'local' && <p className="text-sm text-muted">Products are currently served from the built-in catalog. Import once, then edit here; the store switches to Firestore automatically.</p>}
      <div className="card overflow-x-auto"><table className="w-full min-w-[640px] text-sm"><thead><tr className="text-left text-xs uppercase tracking-wider text-muted"><th className="p-3">Product</th><th className="p-3">Category</th><th className="p-3">Price</th><th className="p-3">Stock</th><th className="p-3">Status</th><th className="p-3" /></tr></thead><tbody>
        {list.map((p) => { const stock = p.variants.reduce((t, v) => t + (typeof v.stock === 'number' ? v.stock : 0), 0); return (
          <tr key={p.id} className="border-t border-line"><td className="p-3"><div className="flex items-center gap-2"><div className="h-9 w-9 overflow-hidden rounded bg-surface-2"><ProductImage product={p} size={400} className="h-full w-full" /></div><b>{p.name}</b></div></td><td className="p-3">{CATEGORY_LABELS[p.category]}</td><td className="num p-3">{money(Math.min(...p.variants.map((v) => v.price)))}</td><td className="num p-3">{stock}{stock < 10 && <Badge tone={stock ? 'warn' : 'bad'} className="ml-1">{stock ? 'low' : 'out'}</Badge>}</td><td className="p-3"><Badge tone={p.active ? 'good' : 'neutral'}>{p.active ? 'Active' : 'Hidden'}</Badge></td><td className="p-3 text-right">{source === 'firestore' ? <Link to={`/admin/products/${p.id}`} className="text-pine underline">Edit</Link> : <span className="text-muted">import first</span>}</td></tr>
        ); })}
      </tbody></table></div>
    </div>
  );
}

function ProductEditor({ product, isNew, onDone }: { product: Product; isNew: boolean; onDone: () => Promise<void> }) {
  const [p, setP] = useState<Product>(product);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  useEffect(() => setP(product), [product]);
  const set = <K extends keyof Product>(k: K, v: Product[K]) => setP((s) => ({ ...s, [k]: v }));
  const setVar = (i: number, k: keyof Variant, v: string | number) => set('variants', p.variants.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  const upload = async (files: FileList | null) => {
    if (!files?.length) return; setBusy(true);
    try { const id = p.id || slugify(p.name); const urls: string[] = []; for (const f of Array.from(files)) urls.push(await uploadProductImage(id, f)); set('images', [...p.images, ...urls]); toast('Uploaded'); } catch (e) { toast((e as Error).message); } finally { setBusy(false); }
  };
  const save = async () => {
    const id = p.id || slugify(p.name); const slug = p.slug || slugify(p.name);
    if (!p.name || !p.variants.length) { toast('Name and at least one size are required'); return; }
    setBusy(true);
    try { await saveProduct({ ...p, id, slug, variants: p.variants.map((v) => ({ ...v, id: v.id || slugify(v.label), price: Number(v.price), stock: v.stock === undefined || v.stock === ('' as unknown) ? undefined : Number(v.stock), compareAt: v.compareAt ? Number(v.compareAt) : undefined })) }); toast('Saved'); await onDone(); } catch (e) { toast((e as Error).message); } finally { setBusy(false); }
  };
  const remove = async () => { if (!confirmDelete) { setConfirmDelete(true); return; } setBusy(true); try { await deleteProduct(p.id); toast('Deleted'); await onDone(); } finally { setBusy(false); } };
  const [confirmDelete, setConfirmDelete] = useState(false);
  const isBody = ['scrub', 'lotion', 'salt'].includes(p.category);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2"><Link to="/admin/products" className="text-sm text-muted">← Products</Link><h1 className="text-2xl">{isNew ? 'New product' : p.name}</h1><div className="flex-1" /><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={p.active} onChange={(e) => set('active', e.target.checked)} /> Active</label><Button variant="accent" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save'}</Button></div>
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="card space-y-4 p-5">
          <div className="grid gap-3 sm:grid-cols-2"><Field label="Name"><input className="input" value={p.name} onChange={(e) => set('name', e.target.value)} /></Field><Field label="Slug (URL)"><input className="input" value={p.slug} placeholder={slugify(p.name)} onChange={(e) => set('slug', e.target.value)} /></Field></div>
          <div className="grid gap-3 sm:grid-cols-3"><Field label="Category"><select className="input" value={p.category} onChange={(e) => set('category', e.target.value as Category)}>{Object.entries(CATEGORY_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field><Field label="Scent family"><input className="input" value={p.family} onChange={(e) => set('family', e.target.value)} list="families" /><datalist id="families">{['Floral', 'Fresh', 'Gourmand', 'Spiced', 'Woody', 'Honey', 'Unscented'].map((f) => <option key={f} value={f} />)}</datalist></Field><Field label="Badge"><input className="input" value={p.badge || ''} onChange={(e) => set('badge', e.target.value)} placeholder="New, Best seller, Save $7" /></Field></div>
          <Field label="Tagline"><input className="input" value={p.tagline || ''} onChange={(e) => set('tagline', e.target.value)} /></Field>
          <Field label="Description"><textarea className="input" rows={4} value={p.description} onChange={(e) => set('description', e.target.value)} /></Field>
          <div className="grid grid-cols-3 gap-3">{(['top', 'heart', 'base'] as const).map((k) => <Field key={k} label={p.category === 'set' ? (['Item 1', 'Item 2', 'Item 3'][['top', 'heart', 'base'].indexOf(k)] || '') : `${k} note`}><input className="input" value={p.notes?.[k] || ''} onChange={(e) => set('notes', { top: '', heart: '', base: '', ...p.notes, [k]: e.target.value })} /></Field>)}</div>
          {p.category === 'candle' && <div className="grid gap-3 sm:grid-cols-3"><Field label="Burn time"><input className="input" value={p.burnTime || ''} onChange={(e) => set('burnTime', e.target.value)} /></Field><Field label="Wax"><input className="input" value={p.wax || ''} onChange={(e) => set('wax', e.target.value)} /></Field><Field label="Wick"><input className="input" value={p.wick || ''} onChange={(e) => set('wick', e.target.value)} /></Field></div>}
          {isBody && <Field label="Ingredients (INCI, comma separated)"><textarea className="input" rows={3} value={p.ingredients || ''} onChange={(e) => set('ingredients', e.target.value)} /></Field>}
          {p.category === 'set' && <Field label="Bundle item ids (comma separated)" hint="Used for the “Includes” list on the product page."><input className="input" value={(p.bundleItems || []).join(', ')} onChange={(e) => set('bundleItems', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))} /></Field>}
          <div><div className="label">Sizes &amp; prices</div>
            <div className="space-y-2">{p.variants.map((v, i) => <div key={i} className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] items-center gap-2"><input className="input" placeholder="Label (8 oz)" value={v.label} onChange={(e) => setVar(i, 'label', e.target.value)} /><input className="input" type="number" step="0.01" placeholder="Price" value={v.price} onChange={(e) => setVar(i, 'price', e.target.value)} /><input className="input" type="number" step="0.01" placeholder="Compare at" value={v.compareAt ?? ''} onChange={(e) => setVar(i, 'compareAt', e.target.value)} /><input className="input" type="number" placeholder="Stock" value={v.stock ?? ''} onChange={(e) => setVar(i, 'stock', e.target.value)} /><button className="text-sm text-bad" onClick={() => set('variants', p.variants.filter((_, j) => j !== i))} aria-label="Remove size">✕</button></div>)}</div>
            <Button size="sm" variant="ghost" className="mt-2" onClick={() => set('variants', [...p.variants, { id: '', label: '', price: 0, stock: 0 }])}>+ Add size</Button></div>
        </div>
        <div className="space-y-4">
          <div className="card space-y-3 p-4"><div className="label">Photos</div>
            <div className="grid grid-cols-3 gap-2">{p.images.map((u, i) => <div key={u} className="relative aspect-square overflow-hidden rounded bg-surface-2"><img src={u} alt="" className="h-full w-full object-cover" /><button className="absolute right-1 top-1 rounded bg-black/60 px-1 text-xs text-white" onClick={() => set('images', p.images.filter((_, j) => j !== i))}>✕</button>{i === 0 && <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1 text-[10px] text-white">main</span>}</div>)}</div>
            <input type="file" accept="image/*" multiple onChange={(e) => upload(e.target.files)} className="text-sm" /><p className="text-xs text-muted">First photo is the main one. Upload square images, ideally 1200×1200.</p></div>
          <div className="card space-y-3 p-4"><div className="label">Merchandising</div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={p.featured} onChange={(e) => set('featured', e.target.checked)} /> Featured on homepage</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={p.isNewArrival} onChange={(e) => set('isNewArrival', e.target.checked)} /> New arrival</label>
            <div className="text-sm"><div className="mb-1 font-semibold">Collections</div>{COLLECTIONS.map((c) => <label key={c} className="mr-3 inline-flex items-center gap-1"><input type="checkbox" checked={p.collections.includes(c)} onChange={(e) => set('collections', e.target.checked ? [...p.collections, c] : p.collections.filter((x) => x !== c))} /> {c}</label>)}</div>
            <Field label="Sort order"><input className="input" type="number" value={p.sortOrder} onChange={(e) => set('sortOrder', Number(e.target.value))} /></Field></div>
          {!isNew && <Button variant={confirmDelete ? 'danger' : 'ghost'} size="sm" block disabled={busy} onClick={remove}>{confirmDelete ? 'Click again to delete permanently' : 'Delete product'}</Button>}
        </div>
      </div>
    </div>
  );
}
