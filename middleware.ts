export { default } from "next-auth/middleware";

export const config = {
  matcher: ["/((?!api/auth|auth/signin|auth/access-denied|_next/static|_next/image|favicon.ico).*)"]
};
