import { dark } from "@clerk/themes";

/**
 * Clerk's hosted components restyled onto the Enigma-Cube system (flat
 * surfaces, hairlines, square corners, signal red), so the sign-in and sign-up
 * screens read as part of the product rather than a third-party widget.
 * Values mirror the tokens in app/globals.css - Clerk can't read CSS vars for
 * its colour maths, so they are repeated here.
 */
export const clerkAppearance = {
  baseTheme: dark,
  variables: {
    colorPrimary: "#d14a54",
    colorPrimaryForeground: "#ffffff",
    colorBackground: "#161616",
    colorForeground: "#eaeaea",
    colorMutedForeground: "#a9a9a9",
    colorMuted: "#1c1c1c",
    colorInput: "#0d0d0d",
    colorInputForeground: "#eaeaea",
    colorBorder: "rgba(234,234,234,0.16)",
    colorRing: "#de8992",
    colorShadow: "transparent",
    colorNeutral: "#eaeaea",
    colorDanger: "#e8737c",
    colorSuccess: "#6fcf97",
    colorWarning: "#e3b35c",
    borderRadius: "0px",
    fontFamily: "var(--font-geist), ui-sans-serif, system-ui, sans-serif",
  },
  elements: {
    rootBox: "w-full",
    // The page already shows the wordmark above the card.
    logoBox: "!hidden",
    cardBox: "w-full shadow-none rounded-none",
    card: "!bg-raised !border !border-hairline !shadow-none rounded-none",
    headerTitle: "!font-display !text-fg-strong !text-2xl !font-normal tracking-tight",
    headerSubtitle: "text-muted",
    socialButtonsBlockButton:
      "!bg-base !border !border-hairline-strong text-fg hover:!bg-elevated transition-colors",
    socialButtonsBlockButtonText: "text-fg font-medium",
    dividerLine: "bg-hairline",
    dividerText: "font-mono uppercase tracking-[0.08em] text-subtle",
    formFieldLabel: "text-muted font-medium",
    formFieldInput:
      "!border !border-hairline-strong text-fg placeholder:text-faint focus:!border-brand-soft/60",
    formButtonPrimary:
      "ec-cta after:!hidden before:!hidden !bg-brand !bg-none hover:!bg-brand-hover active:!bg-brand-press !text-white !font-bold normal-case !shadow-none",
    footerActionText: "text-subtle",
    footerActionLink: "!text-brand-soft hover:text-fg-strong transition-colors",
    identityPreviewText: "text-fg",
    identityPreviewEditButton: "text-brand-soft",
    formFieldInputShowPasswordButton: "text-subtle hover:text-fg",
    otpCodeFieldInput: "bg-raised border-hairline text-fg",
    footer: "!bg-none bg-transparent",
  },
};
