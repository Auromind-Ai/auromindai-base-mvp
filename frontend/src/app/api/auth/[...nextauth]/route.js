import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],

  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        try {
          const backendUrl = process.env.BACKEND_INTERNAL_URL || "http://localhost:8000";
          const res = await fetch(`${backendUrl}/auth/google-login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: user.email,
              name: user.name,
              google_id: account.providerAccountId,
            }),
          });

          if (!res.ok) {
            const errorText = await res.text();
            console.error("Backend error:", res.status, errorText);
            return false;
          }

          const data = await res.json();
          user.customToken = data.access_token;
          user.customUser = data.user;
          user.workspaces = data.workspaces || [];
          return true;
        } catch (err) {
          console.error("Google signIn error:", err);
          return false;
        }
      }
      return true;
    },

    async jwt({ token, user }) {
      if (user?.customToken) {
        token.customToken = user.customToken;
        token.customUser = user.customUser;
        token.workspaces = user.workspaces;
      }
      return token;
    },

    async session({ session, token }) {
      session.customToken = token.customToken;
      session.customUser = token.customUser;
      session.workspaces = token.workspaces;
      return session;
    },

    async redirect({ url, baseUrl }) {
      return `${baseUrl}/user/admin/dashboard`;
    },
  },

  secret: process.env.NEXTAUTH_SECRET,
});

export { handler as GET, handler as POST };