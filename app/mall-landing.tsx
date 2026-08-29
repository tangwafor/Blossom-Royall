"use client";

import Link from "next/link";
import { ArrowRight, LockKeyhole, Moon, ShoppingBag, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import BrandMark from "./brand-mark";

type Locale = "en" | "fr" | "es";

const copy = {
  en: { eyebrow: "WELCOME TO BLOSSOM ROYALL", title: "Every store has a story. Find yours.", intro: "Discover Delly’s signature collection and remarkable independent fashion inside one connected mall.", explore: "Explore store", blossom: "Delly’s house collection", africstyle: "A Duplex brand", os: "Owner and staff access", stores: "Our stores", promise: "Shop every store with one Blossom Royall bag and one coordinated checkout.", powered: "Powered by TA Tech", status: "Preview storefront", statusDetail: "Browsing works. Live ordering and owner accounts are still being activated." },
  fr: { eyebrow: "BIENVENUE À BLOSSOM ROYALL", title: "Chaque boutique a une histoire. Trouvez la vôtre.", intro: "Découvrez la collection de Delly et une mode indépendante remarquable dans un centre commercial connecté.", explore: "Découvrir la boutique", blossom: "La collection de Delly", africstyle: "Une marque Duplex", os: "Accès propriétaire et équipe", stores: "Nos boutiques", promise: "Achetez dans chaque boutique avec un seul panier Blossom Royall et un paiement coordonné.", powered: "Propulsé par TA Tech", status: "Vitrine de prévisualisation", statusDetail: "La navigation fonctionne. Les commandes réelles et les comptes propriétaires sont en cours d’activation." },
  es: { eyebrow: "BIENVENIDO A BLOSSOM ROYALL", title: "Cada tienda tiene una historia. Encuentra la tuya.", intro: "Descubre la colección de Delly y moda independiente excepcional dentro de un centro comercial conectado.", explore: "Explorar tienda", blossom: "La colección de Delly", africstyle: "Una marca de Duplex", os: "Acceso para propietario y personal", stores: "Nuestras tiendas", promise: "Compra en cada tienda con una sola bolsa Blossom Royall y un pago coordinado.", powered: "Desarrollado por TA Tech", status: "Escaparate de vista previa", statusDetail: "La navegación funciona. Los pedidos reales y las cuentas de propietarios están en activación." },
} as const;

export default function MallLanding() {
  const [locale, setLocale] = useState<Locale>("en");
  const [theme, setTheme] = useState("light");
  const t = copy[locale];
  useEffect(() => {
    const savedTheme = localStorage.getItem("br-theme") || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    const savedLocale = (localStorage.getItem("br-storefront-locale") || "en") as Locale;
    setTheme(savedTheme);
    setLocale(copy[savedLocale] ? savedLocale : "en");
    document.documentElement.dataset.theme = savedTheme;
  }, []);
  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    localStorage.setItem("br-theme", next);
    document.documentElement.dataset.theme = next;
  };
  return <main className="mall-landing">
    <header><Link href="/" className="mall-brand"><BrandMark /><span><b>Blossom Royall</b><small>Fashion Mall</small></span></Link><div><select aria-label="Language" value={locale} onChange={(event) => { const next = event.target.value as Locale; setLocale(next); localStorage.setItem("br-storefront-locale", next); }}><option value="en">EN</option><option value="fr">FR</option><option value="es">ES</option></select><button onClick={toggleTheme} aria-label={theme === "light" ? "Use dark theme" : "Use light theme"}>{theme === "light" ? <Moon /> : <Sun />}</button><Link href="/auth"><LockKeyhole />{t.os}</Link></div></header>
    <aside className="public-preview-notice" aria-label={t.status}><b>{t.status}</b><span>{t.statusDetail}</span></aside>
    <section className="mall-landing-hero"><span>{t.eyebrow}</span><h1>{t.title}</h1><p>{t.intro}</p><a href="#stores">{t.stores}<ArrowRight /></a></section>
    <section className="mall-store-directory" id="stores"><header><span><small>{t.eyebrow}</small><h2>{t.stores}</h2></span><p><ShoppingBag />{t.promise}</p></header><div>
      <article className="mall-store-card blossom"><img src="/brand/blossom-seal.png" alt="" /><span><small>{t.blossom}</small><h3>Blossom Collections</h3><p>Modern occasionwear, polished essentials, and gifts chosen with care.</p><Link href="/stores/blossom-collections">{t.explore}<ArrowRight /></Link></span></article>
      <article className="mall-store-card africstyle"><img src="/vendor-logos/africstyle-fashion.png" alt="" /><span><small>{t.africstyle}</small><h3>Africstyle Fashion</h3><p>Contemporary African fashion shaped by heritage, movement, and confidence.</p><Link href="/stores/africstyle-fashion">{t.explore}<ArrowRight /></Link></span></article>
    </div></section>
    <footer><BrandMark /><span><b>Blossom Royall</b><small>{t.powered}</small></span></footer>
  </main>;
}
