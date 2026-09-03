import { dark } from "@clerk/themes";

/**
 * Clerk's hosted components restyled onto the Enigma-Cube system, so the
 * sign-in and sign-up screens read as part of the product rather than a
 * third-party widget dropped into it.
 */
export const clerkAppearance = {
  baseTheme: dark,
  variables: {
    colorPrimary: "#a92e2e",
    colorBackground: "transparent",
    colorText: "#ffffff",
    colorTextSecondary: "rgba(255,255,255,0.72)",
    colorInputBackground: "rgba(255,255,255,0.05)",
    colorInputText: "#ffffff",
    colorDanger: "#f87171",
    colorSuccess: "#34d399",
    colorWarning: "#fbbf24",
    borderRadius: "14px",
    fontFamily: "var(--font-figtree), ui-sans-serif, system-ui, sans-serif",
  },
  elements: {
    rootBox: "w-full",
    cardBox: "w-full shadow-none",
    card: "bg-white/[0.05] backdrop-blur-xl border border-white/[0.12] shadow-[0_24px_60px_-24px_rgba(0,0,0,0.9)]",
    headerTitle: "text-white text-xl font-semibold tracking-tight",
    headerSubtitle: "text-white/70",
    socialButtonsBlockButton:
      "bg-white/[0.05] border border-white/[0.12] text-white hover:bg-white/[0.09] transition-colors",
    socialButtonsBlockButtonText: "text-white font-medium",
    dividerLine: "bg-white/[0.12]",
    dividerText: "text-white/48",
    formFieldLabel: "text-white/72 font-medium",
    formFieldInput:
      "bg-white/[0.05] border border-white/[0.12] text-white placeholder:text-white/30 focus:border-[#ffb3b3]/40",
    formButtonPrimary:
      "bg-[#a92e2e] hover:bg-[#c13838] active:bg-[#8b2424] text-white font-semibold normal-case shadow-[0_8px_28px_-10px_rgba(169,46,46,0.5)]",
    footerActionText: "text-white/48",
    footerActionLink: "text-[#ffb3b3] hover:text-white transition-colors",
    identityPreviewText: "text-white",
    identityPreviewEditButton: "text-[#ffb3b3]",
    formFieldInputShowPasswordButton: "text-white/48 hover:text-white",
    otpCodeFieldInput: "bg-white/[0.05] border-white/[0.12] text-white",
    footer: "bg-transparent",
  },
};
