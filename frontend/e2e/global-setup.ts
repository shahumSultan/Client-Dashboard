import { clerkSetup } from "@clerk/testing/playwright";

/**
 * Fetches a Clerk testing token so the sign-in form is not blocked by bot
 * protection. Requires a development instance - production instances do not
 * issue these, which is why this suite runs against the local stack.
 */
export default async function globalSetup() {
  await clerkSetup();
}
