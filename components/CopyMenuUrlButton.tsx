"use client";

import { useState } from "react";

export function CopyMenuUrlButton() {
  const [state, setState] = useState<"idle" | "ok" | "err">("idle");

  async function copy() {
    try {
      const url = `${window.location.origin}/menu`;
      await navigator.clipboard.writeText(url);
      setState("ok");
      setTimeout(() => setState("idle"), 2000);
    } catch {
      setState("err");
      setTimeout(() => setState("idle"), 2000);
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="rounded-full border border-cocoa/15 bg-white px-4 py-2 text-sm font-semibold text-cocoa shadow-sm active:scale-[0.99]"
    >
      {state === "ok" ? "Link copied" : state === "err" ? "Could not copy" : "Copy shareable menu link"}
    </button>
  );
}
