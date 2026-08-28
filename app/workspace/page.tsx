"use client";

import { LoaderCircle, LockKeyhole } from "lucide-react";
import { useEffect, useState } from "react";
import { createClient } from "../../lib/supabase/client";
import BrandMark from "../brand-mark";
import Home from "../page";

type AccessState = "checking" | "authorized" | "unassigned";

export default function WorkspacePage() {
  const [access, setAccess] = useState<AccessState>("checking");
  useEffect(() => {
    const verify = async () => {
      try {
        const client = createClient();
        const { data: { user }, error } = await client.auth.getUser();
        if (error || !user) {
          location.replace("/auth?returnTo=%2Fworkspace");
          return;
        }
        const { data: membership } = await client.from("store_memberships").select("id, role").eq("user_id", user.id).limit(1).maybeSingle();
        if (membership?.role === "owner") {
          const { data: assurance, error: assuranceError } = await client.auth.mfa.getAuthenticatorAssuranceLevel();
          if (assuranceError || assurance.currentLevel !== "aal2") {
            location.replace("/auth/mfa?returnTo=%2Fworkspace");
            return;
          }
        }
        setAccess(membership ? "authorized" : "unassigned");
      } catch {
        location.replace("/auth?returnTo=%2Fworkspace");
      }
    };
    void verify();
  }, []);
  if (access === "authorized") return <Home />;
  if (access === "unassigned") return <main className="workspace-gate"><BrandMark /><LockKeyhole /><h1>Your account is secure.</h1><p>Delly or a Blossom Royall owner must assign this account to the store before the operating workspace opens.</p><a href="/auth">Return to secure access</a></main>;
  return <main className="workspace-gate"><BrandMark /><LoaderCircle className="spin" /><h1>Opening your workspace</h1><p>Confirming your identity and Blossom Royall permissions.</p></main>;
}
