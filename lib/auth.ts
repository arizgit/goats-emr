import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

const allowedEmails = (process.env.ALLOWED_EMAILS || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || ""
    })
  ],
  pages: {
    signIn: "/auth/signin",
    error: "/auth/access-denied"
  },
  callbacks: {
    async signIn({ user }) {
      const email = user.email?.toLowerCase() || "";
      return allowedEmails.includes(email);
    }
  },
  session: {
    strategy: "jwt"
  }
};
