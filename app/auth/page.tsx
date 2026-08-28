"use client";

import {
  ArrowLeft,
  Check,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  Mail,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { createClient } from "../../lib/supabase/client";
import BrandMark from "../brand-mark";

const authErrors: Record<string, string> = {
  "Invalid login credentials": "The email or password is not correct.",
  "Email not confirmed": "Please confirm your email before signing in.",
  "User already registered": "An account already exists for this email.",
  "Password should be at least 6 characters":
    "Use at least six characters for your password.",
};

export default function AuthPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [method, setMethod] = useState<"password" | "email">("password");
  const [emailCodeSent, setEmailCodeSent] = useState(false);
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [rememberEmail, setRememberEmail] = useState(false);
  useEffect(() => {
    const remembered = localStorage.getItem("br-remembered-email");
    localStorage.removeItem("br-saved-credentials");
    if (remembered) {
      setEmail(remembered);
      setRememberEmail(true);
    }
  }, []);
  const sendRecovery = async (event: FormEvent<HTMLButtonElement>) => {
    const form = event.currentTarget.form;
    const email = String(new FormData(form ?? undefined).get("email") || "");
    if (!email) {
      setMessage("Enter your email address to reset your password.");
      return;
    }
    setLoading(true);
    setMessage("");
    const { error } = await createClient().auth.resetPasswordForEmail(email, {
      redirectTo: `${location.origin}/reset-password`,
    });
    setLoading(false);
    setMessage(
      error
        ? authErrors[error.message] ||
            "We could not send the recovery email. Please try again."
        : "Check your email for a secure password reset link.",
    );
  };
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    const form = new FormData(event.currentTarget),
      email = String(form.get("email") || ""),
      password = String(form.get("password") || "");
    if (mode === "signup" && form.get("agreement") !== "accepted") {
      setMessage("Please accept the account terms to create your profile.");
      return;
    }
    const supabase = createClient();
    if (mode === "signin" && method === "email") {
      const code = String(form.get("emailCode") || "").trim();
      const { error } = emailCodeSent
        ? await supabase.auth.verifyOtp({ email, token: code, type: "email" })
        : await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
      setLoading(false);
      if (!error && emailCodeSent) {
        location.assign("/workspace");
        return;
      }
      if (!error) setEmailCodeSent(true);
      setMessage(
        error
          ? authErrors[error.message] || "We could not verify your email code. Please try again."
          : "A six digit sign in code was sent to your email.",
      );
      return;
    }
    const result =
      mode === "signin"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
            email,
            password,
            options: { emailRedirectTo: `${location.origin}/auth?returnTo=%2Fworkspace` },
          });
    setLoading(false);
    if (result.error) {
      setMessage(
        authErrors[result.error.message] ||
          "We could not complete that request. Please try again.",
      );
      return;
    }
    if (rememberEmail) localStorage.setItem("br-remembered-email", email);
    else localStorage.removeItem("br-remembered-email");
    if (mode === "signup") {
      setMessage("Check your email to confirm your Blossom Royall account.");
      return;
    }
    location.assign("/workspace");
  };
  const signInWithGoogle = async () => {
    setLoading(true);
    setMessage("");
    const { data, error } = await createClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${location.origin}/auth/callback?returnTo=%2Fworkspace` },
    });
    if (error) {
      setLoading(false);
      setMessage("Google sign in is unavailable right now. Please use email instead.");
      return;
    }
    if (data.url) location.assign(data.url);
  };
  return (
    <main className="auth-page">
      <section className="auth-story">
        <div className="auth-story-shade" />
        <div className="auth-story-copy">
          <BrandMark className="auth-mark" />
          <span className="eyebrow">THE PRIVATE ENTRANCE</span>
          <h1>Where beautiful retail begins.</h1>
          <p>Step into one connected world for fashion, people, places, and every thoughtful detail behind the experience.</p>
          <div className="auth-promises">
            <span><Check />Your entire mall, beautifully connected</span>
            <span><Check />Private, role scoped access</span>
            <span><Check />Intelligence shaped around your business</span>
          </div>
        </div>
        <footer>
          <b>Powered by TA Tech</b>
          <span>Is not where you have been but where you are going.</span>
        </footer>
      </section>
      <section className="auth-form-wrap">
        <Link href="/" className="back-link">
          <ArrowLeft />
          Back to Blossom Royall
        </Link>
        <form className="auth-form" onSubmit={submit}>
          <div className="auth-icon">
            <Sparkles />
          </div>
          <span className="eyebrow">SECURE ACCESS</span>
          <h2>{mode === "signin" ? "Welcome back" : "Create your account"}</h2>
          <p>
            {mode === "signin"
              ? "Sign in to continue to your workspace."
              : "Start your secure Blossom Royall profile."}
          </p>
          {mode === "signin" && (
            <>
              <button type="button" className="auth-google" onClick={signInWithGoogle} disabled={loading}><b>G</b>Continue with Google</button>
              <div className="auth-divider"><span>or continue with email</span></div>
              <div className="auth-methods" aria-label="Sign in method">
                <button type="button" className={method === "password" ? "active" : ""} onClick={() => setMethod("password")}>Password</button>
                <button type="button" className={method === "email" ? "active" : ""} onClick={() => { setMethod("email"); setEmailCodeSent(false); }}>Email code</button>
              </div>
            </>
          )}
          <label>
            Email address
            <div>
              <Mail />
              <input
                name="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
                placeholder="you@example.com"
              />
            </div>
          </label>
          {mode === "signin" && method === "email" && emailCodeSent && <label>
            Six digit email code
            <div>
              <LockKeyhole />
              <input name="emailCode" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required placeholder="123456" />
            </div>
          </label>}
          {(mode === "signup" || method === "password") && <label>
            Password
            <div>
              <LockKeyhole />
              <input
                name="password"
                type={show ? "text" : "password"}
                autoComplete={
                  mode === "signin" ? "current-password" : "new-password"
                }
                minLength={6}
                required
                placeholder="Your password"
              />
              <button
                type="button"
                onClick={() => setShow((value) => !value)}
                aria-label={show ? "Hide password" : "Show password"}
              >
                {show ? <EyeOff /> : <Eye />}
              </button>
            </div>
          </label>}
          {mode === "signup" && (
            <label className="agreement">
              <input
                name="agreement"
                type="checkbox"
                value="accepted"
                required
              />
              <span>
                I agree to the Blossom Royall account terms and privacy notice.
              </span>
            </label>
          )}
          {mode === "signin" && (
            <div className="auth-options">
              {method === "password" && <label className="remember-email"><input type="checkbox" checked={rememberEmail} onChange={(event) => setRememberEmail(event.target.checked)} />Remember my email</label>}
              {method === "password" && <button type="button" className="auth-recovery" onClick={sendRecovery} disabled={loading}>Forgot password?</button>}
            </div>
          )}
          {message && <output className="auth-message">{message}</output>}
          <button className="primary auth-submit" disabled={loading}>
            {loading ? (
              <>
                <LoaderCircle className="spin" />
                Please wait
              </>
            ) : mode === "signin" ? (
              method === "email" ? emailCodeSent ? "Verify email code" : "Send email code" : "Sign in"
            ) : (
              "Create account"
            )}
          </button>
          <button
            type="button"
            className="auth-switch"
            onClick={() => {
              setMode((value) => (value === "signin" ? "signup" : "signin"));
              setMethod("password");
              setMessage("");
            }}
          >
            {mode === "signin"
              ? "New to Blossom Royall? Create an account"
              : "Already have an account? Sign in"}
          </button>
          <small className="auth-conditions">
            By continuing, you confirm that you are authorized to use this
            workspace. <Link href="/privacy">Privacy policy</Link> · <Link href="/account/delete">Account deletion</Link>
          </small>
        </form>
      </section>
    </main>
  );
}
