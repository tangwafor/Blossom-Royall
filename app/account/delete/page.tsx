"use client";

import { ArrowLeft, Check, LoaderCircle, ShieldCheck, Trash2 } from "lucide-react";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { createClient } from "../../../lib/supabase/client";
import BrandMark from "../../brand-mark";

type Locale = "en" | "fr" | "es";
type RequestState = { status: string; scheduled_for: string; retention_summary: Record<string, string> } | null;
const words = {
  en: { back: "Back", language: "Language", eyebrow: "PRIVACY CHOICES", title: "Delete your Blossom Royall account", intro: "Request deletion of your account and personal data. Your request is scheduled for completion within seven days.", signedOut: "Sign in to verify your identity and request account deletion.", signIn: "Sign in securely", consequences: "What happens", one: "Your profile, saved measurements, preferences, messages, and uploaded personal content are deleted.", two: "Transaction records required for tax, fraud, disputes, or legal obligations may be retained in anonymized form.", three: "A sole store owner must transfer ownership before requesting deletion.", confirm: "I understand that account deletion removes access and cannot be reversed after completion.", type: "Type DELETE to confirm", request: "Request account deletion", requesting: "Submitting request", pending: "Deletion scheduled", scheduled: "Scheduled completion", cancel: "Cancel deletion request", canceled: "Your deletion request was canceled.", privacy: "Read privacy policy", error: "The request could not be completed.", transfer: "Transfer store ownership to another owner before deleting this account." },
  fr: { back: "Retour", language: "Langue", eyebrow: "CHOIX DE CONFIDENTIALITÉ", title: "Supprimer votre compte Blossom Royall", intro: "Demandez la suppression de votre compte et de vos données personnelles. La demande sera traitée sous sept jours.", signedOut: "Connectez vous pour vérifier votre identité et demander la suppression.", signIn: "Connexion sécurisée", consequences: "Conséquences", one: "Votre profil, mesures, préférences, messages et contenus personnels sont supprimés.", two: "Les transactions exigées pour les impôts, la fraude, les litiges ou la loi peuvent être conservées anonymement.", three: "Le propriétaire unique doit transférer la propriété avant la suppression.", confirm: "Je comprends que la suppression retire l’accès et devient irréversible après son achèvement.", type: "Saisissez DELETE pour confirmer", request: "Demander la suppression", requesting: "Envoi de la demande", pending: "Suppression programmée", scheduled: "Achèvement prévu", cancel: "Annuler la demande", canceled: "Votre demande a été annulée.", privacy: "Lire la politique de confidentialité", error: "La demande n’a pas pu être traitée.", transfer: "Transférez la propriété du magasin avant de supprimer ce compte." },
  es: { back: "Volver", language: "Idioma", eyebrow: "OPCIONES DE PRIVACIDAD", title: "Eliminar su cuenta de Blossom Royall", intro: "Solicite la eliminación de su cuenta y datos personales. La solicitud se completará en un plazo de siete días.", signedOut: "Inicie sesión para verificar su identidad y solicitar la eliminación.", signIn: "Inicio de sesión seguro", consequences: "Qué sucede", one: "Se eliminan su perfil, medidas, preferencias, mensajes y contenido personal.", two: "Los registros exigidos por impuestos, fraude, disputas o ley pueden conservarse de forma anónima.", three: "El único propietario debe transferir la propiedad antes de eliminar la cuenta.", confirm: "Entiendo que perderé el acceso y que la eliminación no puede revertirse tras completarse.", type: "Escriba DELETE para confirmar", request: "Solicitar eliminación", requesting: "Enviando solicitud", pending: "Eliminación programada", scheduled: "Finalización prevista", cancel: "Cancelar solicitud", canceled: "Su solicitud fue cancelada.", privacy: "Leer la política de privacidad", error: "No se pudo completar la solicitud.", transfer: "Transfiera la propiedad de la tienda antes de eliminar esta cuenta." },
} as const;

export default function DeleteAccountPage() {
  const [locale, setLocale] = useState<Locale>("en");
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [request, setRequest] = useState<RequestState>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const t = words[locale];
  useEffect(() => {
    const browserLocale = navigator.language.slice(0, 2) as Locale;
    if (browserLocale in words) setLocale(browserLocale);
    const load = async () => {
      const client = createClient();
      const { data: { user } } = await client.auth.getUser();
      setSignedIn(Boolean(user));
      if (!user) return;
      const { data } = await client.from("account_deletion_requests").select("status, scheduled_for, retention_summary").eq("user_id", user.id).maybeSingle();
      if (data?.status === "pending") setRequest(data as RequestState);
    };
    void load();
  }, []);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setLoading(true); setMessage("");
    const data = new FormData(event.currentTarget);
    if (data.get("confirmation") !== "accepted" || String(data.get("phrase")).trim() !== "DELETE") { setLoading(false); setMessage(t.error); return; }
    const { data: rows, error } = await createClient().rpc("request_account_deletion");
    setLoading(false);
    if (error) { setMessage(error.message.includes("transfer_store_ownership_required") ? t.transfer : t.error); return; }
    const row = Array.isArray(rows) ? rows[0] : rows;
    setRequest(row as RequestState);
  };
  const cancel = async () => {
    setLoading(true); const { error } = await createClient().rpc("cancel_account_deletion"); setLoading(false);
    if (error) { setMessage(t.error); return; } setRequest(null); setMessage(t.canceled);
  };
  return <main className="deletion-page"><section className="deletion-card">
    <header><Link href="/workspace"><ArrowLeft />{t.back}</Link><label>{t.language}<select value={locale} onChange={(event) => setLocale(event.target.value as Locale)}><option value="en">English</option><option value="fr">Français</option><option value="es">Español</option></select></label></header>
    <BrandMark className="deletion-mark" /><span className="eyebrow">{t.eyebrow}</span><h1>{t.title}</h1><p>{t.intro}</p>
    {signedIn === null && <LoaderCircle className="spin" />}
    {signedIn === false && <div className="deletion-signin"><ShieldCheck /><p>{t.signedOut}</p><Link className="primary" href="/auth?returnTo=%2Faccount%2Fdelete">{t.signIn}</Link></div>}
    {signedIn && request && <div className="deletion-pending"><Check /><h2>{t.pending}</h2><p>{t.scheduled}: {new Date(request.scheduled_for).toLocaleString(locale)}</p><button onClick={() => void cancel()} disabled={loading}>{t.cancel}</button></div>}
    {signedIn && !request && <><section className="deletion-effects"><h2>{t.consequences}</h2><ol><li>{t.one}</li><li>{t.two}</li><li>{t.three}</li></ol></section><form onSubmit={submit}><label className="agreement"><input name="confirmation" type="checkbox" value="accepted" required /><span>{t.confirm}</span></label><label>{t.type}<input name="phrase" autoComplete="off" required pattern="DELETE" /></label>{message && <output className="auth-message">{message}</output>}<button className="danger deletion-submit" disabled={loading}><Trash2 />{loading ? t.requesting : t.request}</button></form></>}
    {message && request && <output className="auth-message">{message}</output>}
    <footer><Link href="/privacy">{t.privacy}</Link><b>Powered by TA Tech</b><span>Is not where you have been but where you are going.</span></footer>
  </section></main>;
}
