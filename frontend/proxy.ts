import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Everything except these requires a signed-in user. Signed-out visitors are
// redirected to sign-in instead of rendering an empty dashboard shell.
const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req)) return;

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
