"use client";

import { ArrowLeft, CheckCircle2, KeyRound, LoaderCircle, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { createClient } from "../../../lib/supabase/client";
import BrandMark from "../../brand-mark";

type Locale = "en" | "fr" | "es";
type Setup = { factorId: string; qrCode?: string; secret?: string };

const copy = {
  en: {
    back: "Back to secure access", eyebrow: "OWNER PROTECTION", title: "Protect your owner connection",
    intro: "Owner access requires a second check from an authentication app.", loading: "Checking your protection",
    setup: "Set up an authentication app", scan: "Scan this code with Google Authenticator, Microsoft Authenticator, 1Password, Authy, or Apple Passwords.",
    manual: "Cannot scan it? Enter this setup key in your app:", code: "Six digit authentication code", placeholder: "123456",
    verify: "Verify and open workspace", verifying: "Verifying", existing: "Enter the current code from your authentication app.",
    error: "We could not verify that code. Check the current code in your app and try again.", unavailable: "Owner protection could not be prepared. Please sign in again.",
    signout: "Return to sign in", success: "Owner connection verified. Opening your workspace.", language: "Language",
  },
  fr: {
    back: "Retour à l’accès sécurisé", eyebrow: "PROTECTION PROPRIÉTAIRE", title: "Protégez votre connexion propriétaire",
    intro: "L’accès propriétaire exige une seconde vérification avec une application d’authentification.", loading: "Vérification de votre protection",
    setup: "Configurer une application d’authentification", scan: "Scannez ce code avec Google Authenticator, Microsoft Authenticator, 1Password, Authy ou Apple Passwords.",
    manual: "Impossible de le scanner ? Saisissez cette clé de configuration dans votre application :", code: "Code d’authentification à six chiffres", placeholder: "123456",
    verify: "Vérifier et ouvrir l’espace", verifying: "Vérification", existing: "Saisissez le code actuel de votre application d’authentification.",
    error: "Ce code n’a pas pu être vérifié. Consultez le code actuel dans votre application et réessayez.", unavailable: "La protection propriétaire n’a pas pu être préparée. Veuillez vous reconnecter.",
    signout: "Retour à la connexion", success: "Connexion propriétaire vérifiée. Ouverture de votre espace.", language: "Langue",
  },
  es: {
    back: "Volver al acceso seguro", eyebrow: "PROTECCIÓN DEL PROPIETARIO", title: "Proteja su conexión de propietario",
    intro: "El acceso de propietario requiere una segunda verificación con una aplicación de autenticación.", loading: "Comprobando su protección",
    setup: "Configurar una aplicación de autenticación", scan: "Escanee este código con Google Authenticator, Microsoft Authenticator, 1Password, Authy o Apple Passwords.",
    manual: "¿No puede escanearlo? Introduzca esta clave de configuración en su aplicación:", code: "Código de autenticación de seis dígitos", placeholder: "123456",
    verify: "Verificar y abrir el espacio", verifying: "Verificando", existing: "Introduzca el código actual de su aplicación de autenticación.",
    error: "No pudimos verificar ese código. Consulte el código actual de su aplicación e inténtelo de nuevo.", unavailable: "No se pudo preparar la protección del propietario. Vuelva a iniciar sesión.",
    signout: "Volver al inicio de sesión", success: "Conexión del propietario verificada. Abriendo su espacio.", language: "Idioma",
  },
} as const;

const safeReturnTo = () => {
  const requested = new URLSearchParams(location.search).get("returnTo");
  return requested?.startsWith("/") && !requested.startsWith("//") ? requested : "/workspace";
};

export default function OwnerMfaPage() {
  const [locale, setLocale] = useState<Locale>("en");
  const [setup, setSetup] = useState<Setup | null>(null);
  const [existing, setExisting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [message, setMessage] = useState("");
  const t = copy[locale];

  useEffect(() => {
    const browserLocale = navigator.language.slice(0, 2) as Locale;
    if (browserLocale in copy) setLocale(browserLocale);
    const prepare = async () => {
      const client = createClient();
      const { data: { user } } = await client.auth.getUser();
      if (!user) { location.replace("/auth?returnTo=%2Fworkspace"); return; }
      const { data: membership } = await client.from("store_memberships").select("role").eq("user_id", user.id).limit(1).maybeSingle();
      if (membership?.role !== "owner") { location.replace("/workspace"); return; }
      const { data: assurance } = await client.auth.mfa.getAuthenticatorAssuranceLevel();
      if (assurance?.currentLevel === "aal2") { location.replace(safeReturnTo()); return; }
      const { data: factors, error: factorsError } = await client.auth.mfa.listFactors();
      if (factorsError) { setMessage(copy.en.unavailable); setLoading(false); return; }
      const verified = factors.totp.find((factor) => factor.status === "verified");
      if (verified) {
        setExisting(true);
        setSetup({ factorId: verified.id });
        setLoading(false);
        return;
      }
      const { data: enrollment, error } = await client.auth.mfa.enroll({ factorType: "totp", friendlyName: "Blossom Royall owner" });
      if (error) { setMessage(copy.en.unavailable); setLoading(false); return; }
      setSetup({ factorId: enrollment.id, qrCode: enrollment.totp.qr_code, secret: enrollment.totp.secret });
      setLoading(false);
    };
    void prepare();
  }, []);

  const verify = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!setup) return;
    setVerifying(true);
    setMessage("");
    const code = String(new FormData(event.currentTarget).get("code") || "").trim();
    const { error } = await createClient().auth.mfa.challengeAndVerify({ factorId: setup.factorId, code });
    setVerifying(false);
    if (error) { setMessage(t.error); return; }
    setMessage(t.success);
    location.replace(safeReturnTo());
  };

  return <main className="mfa-page">
    <section className="mfa-card">
      <header className="mfa-header">
        <Link href="/auth" className="mfa-back"><ArrowLeft />{t.back}</Link>
        <label>{t.language}<select value={locale} onChange={(event) => setLocale(event.target.value as Locale)}><option value="en">English</option><option value="fr">Français</option><option value="es">Español</option></select></label>
      </header>
      <BrandMark className="mfa-mark" />
      <span className="eyebrow">{t.eyebrow}</span>
      <h1>{t.title}</h1>
      <p>{t.intro}</p>
      {loading && <div className="mfa-loading"><LoaderCircle className="spin" />{t.loading}</div>}
      {!loading && setup && <form onSubmit={verify}>
        <h2><ShieldCheck />{t.setup}</h2>
        {setup.qrCode && <><p>{t.scan}</p><img className="mfa-qr" src={setup.qrCode} alt={t.setup} /><p className="mfa-manual">{t.manual}<strong>{setup.secret}</strong></p></>}
        {existing && <p>{t.existing}</p>}
        <label className="mfa-code">{t.code}<span><KeyRound /><input name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required placeholder={t.placeholder} autoFocus /></span></label>
        {message && <output className="auth-message">{message}</output>}
        <button className="primary mfa-submit" disabled={verifying}>{verifying ? <><LoaderCircle className="spin" />{t.verifying}</> : <><CheckCircle2 />{t.verify}</>}</button>
      </form>}
      {!loading && !setup && <><output className="auth-message">{message || t.unavailable}</output><Link href="/auth" className="mfa-signin">{t.signout}</Link></>}
      <footer><b>Powered by TA Tech</b><span>Is not where you have been but where you are going.</span></footer>
    </section>
  </main>;
}
