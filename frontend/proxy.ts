import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Everything except these requires a signed-in user. Signed-out visitors are
// redirected to sign-in instead of rendering an empty dashboard shell.
const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
]);

// Invitation links. Whoever opens one signed out is almost always new - the
// invitation is how they get an account - so send them to sign-up rather than
// sign-in (which can only say "Couldn't find your account"), and bring them
// back to the link afterwards. Sign-up links to sign-in for anyone who
// already has an account, and Clerk carries redirect_url across.
const isInviteLink = createRouteMatcher(["/join/(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req)) return;

  if (isInviteLink(req)) {
    const { userId } = await auth();
    if (userId) return;
    const signUp = new URL("/sign-up", req.url);
    // Relative: behind a proxy or in a container req.url carries the
    // internal host, which the browser can't reach.
    signUp.searchParams.set("redirect_url", req.nextUrl.pathname + req.nextUrl.search);
    return NextResponse.redirect(signUp);
  }

  // The redirect target is passed explicitly. Left to Clerk's default it comes
  // from NEXT_PUBLIC_CLERK_SIGN_IN_URL, which is inlined at build time and is
  // absent on any host that does not define it - and with no URL to redirect
  // to, protect() answers a signed-out request with 404 rather than a
  // redirect, making every protected route look like it does not exist.
  await auth.protect({
    unauthenticatedUrl: new URL("/sign-in", req.url).toString(),
  });
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
