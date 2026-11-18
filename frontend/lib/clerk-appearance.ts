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
    // The page supplies the column; Clerk fills it exactly so the form, the
    // heading above it and the page's centre all line up.
    rootBox: "!w-full",
    // The page already shows the wordmark above the card.
    logoBox: "!hidden",
    cardBox: "!w-full !max-w-none !shadow-none !rounded-none !border-0",
    // No box: on the threshold page the form sits on the ground, like the
    // site's contact form, rather than in a floating card.
    card: "!bg-transparent !border-0 !shadow-none !rounded-none !p-0",
    // The page already says who this is for; Clerk's own header repeats the
    // app name, so it stays hidden except on later steps (verify, factor two).
    header: "[.cl-signIn-start_&]:!hidden [.cl-signUp-start_&]:!hidden",
    headerTitle: "!font-display !text-fg-strong !text-2xl !font-normal tracking-tight",
    headerSubtitle: "text-muted",
    socialButtonsBlockButton:
      "!bg-transparent !border !border-hairline-strong !shadow-none !rounded-none text-fg hover:!bg-tint-strong transition-colors",
    socialButtonsBlockButtonText: "text-fg font-medium",
    dividerLine: "bg-hairline",
    dividerText: "!font-mono !lowercase !tracking-normal !text-subtle",
    formFieldLabel: "text-muted font-medium",
    formFieldInput:
      // The site's field: underline only, red rule on focus.
      "!bg-transparent !border-0 !border-b !border-hairline-strong !shadow-none !rounded-none !px-0 text-fg placeholder:!text-subtle focus:!border-brand focus:!shadow-none focus:!ring-0",
    formButtonPrimary:
      "ec-cta after:!hidden before:!hidden [&_svg]:!hidden !h-12 !text-[15px] !bg-brand !bg-none hover:!bg-brand-hover active:!bg-brand-press !text-white !font-bold normal-case !shadow-none",
    footerActionText: "text-subtle",
    footerActionLink: "!text-brand-soft hover:text-fg-strong transition-colors",
    identityPreviewText: "text-fg",
    identityPreviewEditButton: "text-brand-soft",
    formFieldInputShowPasswordButton: "text-subtle hover:text-fg",
    otpCodeFieldInput: "!bg-transparent !border-0 !border-b !border-hairline-strong !shadow-none !rounded-none text-fg",
    footer: "!bg-none !bg-transparent [&>*]:!bg-transparent !mt-2",
    footerAction: "!justify-start !px-0",
  },
};
