"use client";

import { useEffect, useState } from "react";
import MallLanding from "./mall-landing";
import { OperatingSystem } from "./operating-system";

export default function Home() {
  const [showOperatingSystem, setShowOperatingSystem] = useState(false);

  useEffect(() => {
    const hostname = window.location.hostname;
    const publicPreview = new URLSearchParams(window.location.search).get("public") === "1";
    setShowOperatingSystem(!publicPreview && (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "app.blossomroyall.com"));
  }, []);

  return showOperatingSystem ? <OperatingSystem /> : <MallLanding />;
}
