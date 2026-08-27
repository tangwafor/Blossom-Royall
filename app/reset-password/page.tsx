"use client";

import { ArrowLeft, Eye, EyeOff, LoaderCircle, LockKeyhole } from "lucide-react";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { createClient } from "../../lib/supabase/client";
import BrandMark from "../brand-mark";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [sessionReady, setSessionReady] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    createClient().auth.getSession().then(({ data }) => setSessionReady(Boolean(data.session)));
  }, []);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (password.length < 8) return setMessage("Use at least eight characters for your new password.");
    if (password !== confirm) return setMessage("The passwords do not match.");
    setLoading(true);
    const { error } = await createClient().auth.updateUser({ password });
    setLoading(false);
    if (error) return setMessage("We could not update your password. Request a new recovery link and try again.");
    setMessage("Your password is updated. You can now return to your workspace.");
  };
  return (
    <main className="auth-page reset-page">
      <section className="auth-story">
        <div className="auth-story-shade" />
        <div className="auth-story-copy"><BrandMark className="auth-mark" /><span className="eyebrow">SECURE RECOVERY</span><h1>A graceful return to your world.</h1><p>Choose a new password and continue with your mall exactly as you left it.</p></div>
        <footer><b>Powered by TA Tech</b><span>Is not where you have been but where you are going.</span></footer>
      </section>
      <section className="auth-form-wrap">
        <Link href="/auth" className="back-link"><ArrowLeft />Back to sign in</Link>
        <form className="auth-form" onSubmit={submit}>
          <span className="eyebrow">PROTECTED RESET</span><h2>Create a new password</h2><p>Your recovery link is checked before any account change is accepted.</p>
          {sessionReady === false && <output className="auth-message">This recovery link is invalid or has expired. Request a new link from sign in.</output>}
          <label>New password<div><LockKeyhole /><input aria-label="New password" type={show ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} required /><button type="button" onClick={() => setShow((value) => !value)} aria-label={show ? "Hide password" : "Show password"}>{show ? <EyeOff /> : <Eye />}</button></div></label>
          <label>Confirm password<div><LockKeyhole /><input aria-label="Confirm password" type={show ? "text" : "password"} value={confirm} onChange={(event) => setConfirm(event.target.value)} minLength={8} required /></div></label>
          {message && <output className="auth-message">{message}</output>}
          <button className="primary auth-submit" disabled={loading || sessionReady === false}>{loading ? <><LoaderCircle className="spin" />Please wait</> : "Update password"}</button>
        </form>
      </section>
    </main>
  );
}
