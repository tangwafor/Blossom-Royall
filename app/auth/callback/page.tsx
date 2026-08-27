"use client";

import { LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "../../../lib/supabase/client";
import BrandMark from "../../brand-mark";

export default function AuthCallbackPage() {
  const [error, setError] = useState("");
  useEffect(() => {
    const code = new URLSearchParams(location.search).get("code");
    if (!code) {
      setError("This secure sign in link is incomplete or has expired.");
      return;
    }
    createClient().auth.exchangeCodeForSession(code).then(({ error }) => {
      if (error) setError("We could not verify this sign in link. Please request a new one.");
      else location.replace("/");
    });
  }, []);
  return (
    <main className="auth-callback-page">
      <BrandMark className="auth-mark" />
      {error ? <><h1>Let us get you a fresh entrance.</h1><p>{error}</p><Link href="/auth">Return to sign in</Link></> : <><LoaderCircle className="spin" /><h1>Opening Blossom Royall</h1><p>Your secure access is being confirmed.</p></>}
    </main>
  );
}
