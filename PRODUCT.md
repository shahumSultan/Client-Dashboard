# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
- **Clients**: owners and members of client businesses that Enigma-Cube builds systems for. They come back between calls to see where their project stands: milestones, deliverables, requests, invoices and the onboarding steps (sign the agreement, pay, book the kickoff call).
- **The Enigma-Cube team ("partners")**: the founders and team, who run the admin side. Admins manage clients, projects, onboarding and the company's own records. Employees see the company side only (team, departments, policy and brand documents), never clients or money.

## Product Purpose
Enigma-Cube's private client portal. Every client project lives in one place, so clients never need to email to ask how it's going, and the team runs onboarding, delivery and company records from a single admin panel. Success means clients trust the progress they see, act on the next step without being chased, and the team stops tracking clients and company paperwork in scattered tools.

## Positioning
This is the working side of enigma-cube.com: the same company and voice that sells "the systems behind better businesses", now showing those systems being built for one client at a time. It should feel like the website continues after sign-in, not like a third-party SaaS template.

## Operating Context
- Clients sign in through invite-only Clerk accounts; each sees only their own organisation's projects.
- The onboarding sequence (agreement e-signature, then invoice, then welcome pack, then kickoff call) gates the project until the agreement is signed.
- Agreements and invoices print or save as PDF on the company letterhead.
- Admin also holds the company section: documents in private object storage, the company profile, bank accounts that pre-fill invoices, and the team directory.

## Capabilities and Constraints
- Next.js 16 App Router frontend on Vercel; FastAPI + Postgres backend on Railway; Clerk auth; Cloudflare R2 for files.
- Roles: admin, employee (company side only), client_owner, client_member.
- The product is dark-only, like the website. Printed documents and emails use the website's light tone.

## Brand Commitments
- enigma-cube.com is the binding visual authority. The portal follows its palette (#0d0d0d ground, #161616 surface, signal red #d14a54 used as a fill and a small accent, never for body text), its type (Roboto Serif display with italic emphasis, Geist body, Geist Mono lowercase system labels), its square corners, and its point-cloud cube / particle-wave signature.
- The cube mark is at frontend/public/enigma-cube-white.png (also on the site at /brand/ec-logo-white.png).
- Website tagline: "business systems · automation · ai · software".

## Evidence on Hand
- No client testimonials, logos or metrics are approved for use in the portal. Don't invent any.
- Demo data on the public landing preview must read as illustrative.

## Product Principles
1. Status at a glance: whoever signs in should know what's done, what's next and what needs them within one screen.
2. Calm by default: work screens stay quiet, and brand moments (particles, display type) live at the threshold (landing and sign-in).
3. Same company, after sign-in: every surface is recognisably enigma-cube.com.
4. Nothing to chase: the next action is always explicit and one click away.
