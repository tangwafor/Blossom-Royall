"use client";

import {
  ArrowLeft,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  Mail,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { createClient } from "../../lib/supabase/client";

const authErrors: Record<string, string> = {
  "Invalid login credentials": "The email or password is not correct.",
  "Email not confirmed": "Please confirm your email before signing in.",
  "User already registered": "An account already exists for this email.",
  "Password should be at least 6 characters":
    "Use at least six characters for your password.",
};

export default function AuthPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
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
    const result =
      mode === "signin"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
            email,
            password,
            options: { emailRedirectTo: `${location.origin}/auth` },
          });
    setLoading(false);
    if (result.error) {
      setMessage(
        authErrors[result.error.message] ||
          "We could not complete that request. Please try again.",
      );
      return;
    }
    if (mode === "signup") {
      setMessage("Check your email to confirm your Blossom Royall account.");
      return;
    }
    location.assign("/");
  };
  return (
    <main className="auth-page">
      <section className="auth-story">
        <div className="auth-mark">BR</div>
        <span className="eyebrow">BLOSSOM ROYALL</span>
        <h1>One beautiful place to run it all.</h1>
        <p>
          Commerce, customers, vendors, staff, and intelligence, working
          together.
        </p>
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
          <label>
            Email address
            <div>
              <Mail />
              <input
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="you@example.com"
              />
            </div>
          </label>
          <label>
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
          </label>
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
            <button
              type="button"
              className="auth-recovery"
              onClick={sendRecovery}
              disabled={loading}
            >
              Forgot password?
            </button>
          )}
          {message && <output className="auth-message">{message}</output>}
          <button className="primary auth-submit" disabled={loading}>
            {loading ? (
              <>
                <LoaderCircle className="spin" />
                Please wait
              </>
            ) : mode === "signin" ? (
              "Sign in"
            ) : (
              "Create account"
            )}
          </button>
          <button
            type="button"
            className="auth-switch"
            onClick={() => {
              setMode((value) => (value === "signin" ? "signup" : "signin"));
              setMessage("");
            }}
          >
            {mode === "signin"
              ? "New to Blossom Royall? Create an account"
              : "Already have an account? Sign in"}
          </button>
          <small className="auth-conditions">
            By continuing, you confirm that you are authorized to use this
            workspace.
          </small>
        </form>
      </section>
    </main>
  );
}
