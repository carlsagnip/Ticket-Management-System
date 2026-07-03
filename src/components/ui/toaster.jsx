import React from "react"
import { Toaster as Sonner } from "sonner"

export function Toaster({ ...props }) {
  return (
    <Sonner
      position="top-right"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-[var(--bg-card)] group-[.toaster]:text-[var(--text-primary)] group-[.toaster]:border-[var(--border)] group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-[var(--text-muted)] opacity-90",
          actionButton:
            "group-[.toast]:bg-[var(--primary)] group-[.toast]:text-white",
          cancelButton:
            "group-[.toast]:bg-[var(--bg-elevated)] group-[.toast]:text-[var(--text-muted)]",
        },
      }}
      {...props}
    />
  )
}
