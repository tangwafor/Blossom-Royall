"use client";

import Link from "next/link";
import { ArrowLeft, CircleHelp, LockKeyhole, Mail, ShieldCheck, ShoppingBag, Store } from "lucide-react";
import { useState } from "react";
import BrandMark from "../brand-mark";

const supportCopy = {
  en: {
    language: "Language", back: "Back to Blossom Royall", eyebrow: "SUPPORT", title: "Help when you need it.",
    intro: "Find the right path for shopping, orders, account access, privacy, or operating an independent store inside Blossom Royall.",
    shopping: "Shopping and orders", shoppingText: "Sign in to review your order, payment verification, pickup or delivery progress, receipt, and return options.", shoppingLink: "Open secure access",
    account: "Account access", accountText: "Use secure access to sign in, recover your password, or complete owner multifactor authentication.", accountLink: "Manage account access",
    privacy: "Privacy and deletion", privacyText: "Read how information is handled or initiate account deletion from the public privacy controls.", privacyLink: "Open privacy controls",
    vendor: "Vendor and store support", vendorText: "Approved vendors and store teams can open the guided operating workspace after signing in.", vendorLink: "Open the workspace",
    contact: "Contact support", contactText: "For help that is not resolved in the app, email support@blossomroyall.com. This mailbox must be active and monitored before public app store submission.",
  },
  fr: {
    language: "Langue", back: "Retour à Blossom Royall", eyebrow: "ASSISTANCE", title: "De l’aide au bon moment.",
    intro: "Trouvez le bon parcours pour les achats, commandes, accès au compte, confidentialité ou gestion d’une boutique indépendante dans Blossom Royall.",
    shopping: "Achats et commandes", shoppingText: "Connectez vous pour consulter la commande, la vérification du paiement, le retrait ou la livraison, le reçu et les retours.", shoppingLink: "Ouvrir l’accès sécurisé",
    account: "Accès au compte", accountText: "Utilisez l’accès sécurisé pour vous connecter, récupérer le mot de passe ou terminer l’authentification multifacteur du propriétaire.", accountLink: "Gérer l’accès au compte",
    privacy: "Confidentialité et suppression", privacyText: "Consultez le traitement des informations ou demandez la suppression du compte depuis les contrôles publics.", privacyLink: "Ouvrir les contrôles de confidentialité",
    vendor: "Assistance vendeur", vendorText: "Les vendeurs approuvés et les équipes peuvent ouvrir l’espace guidé après connexion.", vendorLink: "Ouvrir l’espace de travail",
    contact: "Contacter l’assistance", contactText: "Pour toute aide non résolue dans l’application, écrivez à support@blossomroyall.com. Cette adresse doit être active et surveillée avant la soumission publique.",
  },
  es: {
    language: "Idioma", back: "Volver a Blossom Royall", eyebrow: "ASISTENCIA", title: "Ayuda cuando la necesita.",
    intro: "Encuentre la ruta adecuada para compras, pedidos, acceso a la cuenta, privacidad o gestión de una tienda independiente dentro de Blossom Royall.",
    shopping: "Compras y pedidos", shoppingText: "Inicie sesión para revisar el pedido, la verificación del pago, el retiro o entrega, el recibo y las devoluciones.", shoppingLink: "Abrir acceso seguro",
    account: "Acceso a la cuenta", accountText: "Use el acceso seguro para iniciar sesión, recuperar la contraseña o completar la autenticación multifactor del propietario.", accountLink: "Administrar acceso",
    privacy: "Privacidad y eliminación", privacyText: "Consulte cómo se trata la información o solicite eliminar la cuenta desde los controles públicos.", privacyLink: "Abrir controles de privacidad",
    vendor: "Asistencia para tiendas", vendorText: "Los vendedores aprobados y los equipos pueden abrir el espacio de trabajo guiado después de iniciar sesión.", vendorLink: "Abrir el espacio de trabajo",
    contact: "Contactar asistencia", contactText: "Para ayuda no resuelta en la aplicación, escriba a support@blossomroyall.com. Esta dirección debe estar activa y supervisada antes de la presentación pública.",
  },
} as const;

export default function SupportPage() {
  const [locale, setLocale] = useState<keyof typeof supportCopy>("en");
  const t = supportCopy[locale];
  return <main className="support-page"><article>
    <header><Link href="/welcome"><ArrowLeft />{t.back}</Link><label>{t.language}<select aria-label={t.language} value={locale} onChange={(event) => setLocale(event.target.value as keyof typeof supportCopy)}><option value="en">English</option><option value="fr">Français</option><option value="es">Español</option></select></label></header>
    <BrandMark /><span className="eyebrow">{t.eyebrow}</span><h1>{t.title}</h1><p className="support-intro">{t.intro}</p>
    <section><ShoppingBag /><div><h2>{t.shopping}</h2><p>{t.shoppingText}</p><Link href="/auth">{t.shoppingLink}</Link></div></section>
    <section><LockKeyhole /><div><h2>{t.account}</h2><p>{t.accountText}</p><Link href="/auth">{t.accountLink}</Link></div></section>
    <section><ShieldCheck /><div><h2>{t.privacy}</h2><p>{t.privacyText}</p><Link href="/account/delete">{t.privacyLink}</Link></div></section>
    <section><Store /><div><h2>{t.vendor}</h2><p>{t.vendorText}</p><Link href="/workspace">{t.vendorLink}</Link></div></section>
    <section><Mail /><div><h2>{t.contact}</h2><p>{t.contactText}</p><a href="mailto:support@blossomroyall.com">support@blossomroyall.com</a></div></section>
    <footer><CircleHelp /><span><b>Powered by TA Tech</b><small>Is not where you have been but where you are going.</small></span></footer>
  </article></main>;
}
