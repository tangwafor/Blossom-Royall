"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, ExternalLink, Minus, Moon, Search, ShoppingBag, Sun, X } from "lucide-react";
import type { StorefrontDefinition, StorefrontProduct } from "@/lib/storefront-catalog";

type Locale = "en" | "fr" | "es";
type CartLine = { id: string; name: string; vendor: string; price: number; fulfillment: string; quantity: number };

const copy = {
  en: { back: "Back to Blossom Royall", stores: "Mall stores", search: "Search this store", all: "All collections", products: "products", add: "Add to bag", added: "Added", bag: "Shopping bag", empty: "Your bag is ready for something special.", subtotal: "Subtotal", checkout: "Continue to checkout", clear: "Clear bag", details: "Product details", sizes: "Available options", close: "Close", owner: "Owned by", shop: "Shop the collection", external: "Official website", fulfillment: "Fulfillment", powered: "Powered by TA Tech" },
  fr: { back: "Retour à Blossom Royall", stores: "Boutiques du centre", search: "Rechercher dans cette boutique", all: "Toutes les collections", products: "produits", add: "Ajouter au panier", added: "Ajouté", bag: "Panier", empty: "Votre panier attend une pièce spéciale.", subtotal: "Sous total", checkout: "Passer au paiement", clear: "Vider le panier", details: "Détails du produit", sizes: "Options disponibles", close: "Fermer", owner: "Propriété de", shop: "Voir la collection", external: "Site officiel", fulfillment: "Livraison", powered: "Propulsé par TA Tech" },
  es: { back: "Volver a Blossom Royall", stores: "Tiendas del centro", search: "Buscar en esta tienda", all: "Todas las colecciones", products: "productos", add: "Agregar a la bolsa", added: "Agregado", bag: "Bolsa de compras", empty: "Tu bolsa está lista para algo especial.", subtotal: "Subtotal", checkout: "Continuar al pago", clear: "Vaciar bolsa", details: "Detalles del producto", sizes: "Opciones disponibles", close: "Cerrar", owner: "Propiedad de", shop: "Comprar la colección", external: "Sitio oficial", fulfillment: "Entrega", powered: "Desarrollado por TA Tech" },
} as const;

export default function StorefrontExperience({ storefront, siblingStores }: { storefront: StorefrontDefinition; siblingStores: { slug: string; publicName: string }[] }) {
  const [locale, setLocale] = useState<Locale>("en");
  const [theme, setTheme] = useState("light");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [pageSize, setPageSize] = useState(24);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [bagOpen, setBagOpen] = useState(false);
  const [selected, setSelected] = useState<StorefrontProduct | null>(null);
  const [notice, setNotice] = useState("");
  const t = copy[locale];

  useEffect(() => {
    const savedTheme = localStorage.getItem("br-theme") || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    const savedLocale = (localStorage.getItem("br-storefront-locale") || "en") as Locale;
    const savedBag = localStorage.getItem("br-customer-bag:blossom-royall");
    setTheme(savedTheme);
    setLocale(copy[savedLocale] ? savedLocale : "en");
    document.documentElement.dataset.theme = savedTheme;
    if (savedBag) setCart((JSON.parse(savedBag) as CartLine[]).map((item, index) => ({ ...item, id: item.id || `saved-${index}`, quantity: item.quantity || 1 })));
  }, []);

  const categories = useMemo(() => Array.from(new Set(storefront.products.flatMap((product) => product.categories))).sort(), [storefront.products]);
  const filtered = useMemo(() => storefront.products.filter((product) => {
    const matchCategory = category === "All" || product.categories.includes(category);
    const needle = query.trim().toLowerCase();
    return matchCategory && (!needle || `${product.name} ${product.description} ${product.categories.join(" ")}`.toLowerCase().includes(needle));
  }), [category, query, storefront.products]);
  const visible = filtered.slice(0, pageSize);
  const itemCount = cart.reduce((total, item) => total + item.quantity, 0);
  const subtotal = cart.reduce((total, item) => total + item.price * item.quantity, 0);

  const persistCart = (next: CartLine[]) => {
    setCart(next);
    localStorage.setItem("br-customer-bag:blossom-royall", JSON.stringify(next));
  };
  const addToBag = (product: StorefrontProduct) => {
    const existing = cart.find((item) => item.id === product.id);
    const next = existing ? cart.map((item) => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item) : [...cart, { id: product.id, name: product.name, vendor: storefront.publicName, price: product.price, fulfillment: storefront.fulfillment, quantity: 1 }];
    persistCart(next);
    setNotice(`${product.name}: ${t.added}`);
  };
  const changeQuantity = (id: string, amount: number) => persistCart(cart.map((item) => item.id === id ? { ...item, quantity: item.quantity + amount } : item).filter((item) => item.quantity > 0));
  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    localStorage.setItem("br-theme", next);
    document.documentElement.dataset.theme = next;
  };
  const changeLocale = (next: Locale) => {
    setLocale(next);
    localStorage.setItem("br-storefront-locale", next);
  };
  const money = (amount: number) => new Intl.NumberFormat(locale === "fr" ? "fr-FR" : locale === "es" ? "es-US" : "en-US", { style: "currency", currency: "USD" }).format(amount);

  return <div className="public-storefront" style={{ "--store-primary": storefront.primaryColor, "--store-accent": storefront.secondaryColor } as React.CSSProperties}>
    <header className="storefront-topbar">
      <Link href="/?view=Vendors"><ArrowLeft />{t.back}</Link>
      <nav aria-label={t.stores}>{siblingStores.map((store) => <Link key={store.slug} className={store.slug === storefront.slug ? "active" : ""} href={`/stores/${store.slug}`}>{store.publicName}</Link>)}</nav>
      <div><select aria-label="Language" value={locale} onChange={(event) => changeLocale(event.target.value as Locale)}><option value="en">EN</option><option value="fr">FR</option><option value="es">ES</option></select><button type="button" onClick={toggleTheme} aria-label={theme === "light" ? "Use dark theme" : "Use light theme"}>{theme === "light" ? <Moon /> : <Sun />}</button><button type="button" className="storefront-bag-button" onClick={() => setBagOpen(true)} aria-label={`${t.bag}, ${itemCount}`}><ShoppingBag /><span>{itemCount}</span></button></div>
    </header>
    <main>
      <section className="storefront-hero">
        <div className="storefront-identity"><img src={storefront.logo} alt="" /><span><small>{storefront.ownerLabel}</small><h1>{storefront.publicName}</h1></span></div>
        <p>{storefront.tagline}</p>
        <div><a href="#collection">{t.shop}</a>{storefront.websiteUrl && <a className="secondary" href={storefront.websiteUrl} target="_blank" rel="noreferrer">{t.external}<ExternalLink /></a>}</div>
      </section>
      <section className="storefront-story"><p>{storefront.story}</p><span><b>{t.owner}</b>{storefront.ownerName}</span><span><b>{t.fulfillment}</b>{storefront.fulfillment}</span></section>
      <section className="storefront-collection" id="collection">
        <header><span><small>{storefront.ownerLabel}</small><h2>{t.shop}</h2></span><b>{filtered.length} {t.products}</b></header>
        <div className="storefront-controls"><label><Search /><input value={query} onChange={(event) => { setQuery(event.target.value); setPageSize(24); }} placeholder={t.search} /></label><select aria-label={t.all} value={category} onChange={(event) => { setCategory(event.target.value); setPageSize(24); }}><option value="All">{t.all}</option>{categories.map((item) => <option key={item}>{item}</option>)}</select></div>
        <div className="storefront-product-grid">{visible.map((product) => <article key={product.id}><button className="storefront-product-image" onClick={() => setSelected(product)} aria-label={`${t.details}: ${product.name}`}><img src={product.image} alt={product.name} loading="lazy" /></button><div><small>{product.category}</small><h3>{product.name}</h3><p>{money(product.price)}</p><button type="button" onClick={() => addToBag(product)}><ShoppingBag />{t.add}</button></div></article>)}</div>
        {visible.length < filtered.length && <button className="storefront-load-more" onClick={() => setPageSize((size) => size + 24)}>Show more</button>}
      </section>
    </main>
    <footer className="storefront-footer"><img src="/brand/blossom-monogram.png" alt="Blossom Royall" /><span><b>Blossom Royall</b><small>{t.powered}</small></span></footer>
    {notice && <output className="storefront-toast" role="status"><Check />{notice}</output>}
    {bagOpen && <><button className="storefront-overlay" aria-label={t.close} onClick={() => setBagOpen(false)} /><aside className="storefront-bag"><header><h2>{t.bag}</h2><button onClick={() => setBagOpen(false)} aria-label={t.close}><X /></button></header>{cart.length === 0 ? <p>{t.empty}</p> : <><div className="storefront-bag-lines">{cart.map((item) => <article key={item.id}><span><b>{item.name}</b><small>{item.vendor}</small></span><div><button onClick={() => changeQuantity(item.id, -1)} aria-label={`Remove one ${item.name}`}><Minus /></button><b>{item.quantity}</b><button onClick={() => changeQuantity(item.id, 1)} aria-label={`Add one ${item.name}`}>+</button></div><strong>{money(item.price * item.quantity)}</strong></article>)}</div><div className="storefront-bag-total"><span>{t.subtotal}</span><b>{money(subtotal)}</b></div><Link className="storefront-checkout" href="/?view=Checkout">{t.checkout}</Link><button className="storefront-clear" onClick={() => persistCart([])}>{t.clear}</button></>}</aside></>}
    {selected && <><button className="storefront-overlay" aria-label={t.close} onClick={() => setSelected(null)} /><section className="storefront-product-dialog" role="dialog" aria-modal="true" aria-label={selected.name}><button className="dialog-close" onClick={() => setSelected(null)} aria-label={t.close}><X /></button><img src={selected.image} alt={selected.name} /><div><small>{selected.category}</small><h2>{selected.name}</h2><strong>{money(selected.price)}</strong><p>{selected.description}</p>{selected.options.length > 0 && <><b>{t.sizes}</b><div className="storefront-options">{selected.options.slice(0, 16).map((option) => <span key={option}>{option}</span>)}</div></>}<button onClick={() => { addToBag(selected); setSelected(null); }}><ShoppingBag />{t.add}</button></div></section></>}
  </div>;
}
