import { NextAuthOptions } from "next-auth";
import GithubProvider from "next-auth/providers/github";

// Allowed users (empty = allow all)
const allowedUsers = (process.env.ALLOWED_USERS || "")
  .split(",")
  .map((u) => u.trim().toLowerCase())
  .filter((u) => u.length > 0);

export const authOptions: NextAuthOptions = {
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_ID || process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_SECRET || process.env.GITHUB_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "read:user user:email repo",
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // If no allowed users configured, allow everyone
      if (allowedUsers.length === 0) {
        return true;
      }

      // Check if user is in allowed list
      const githubUsername = (profile as { login?: string })?.login?.toLowerCase();

      if (!githubUsername) {
        console.log("No GitHub username found");
        return false;
      }

      if (!allowedUsers.includes(githubUsername)) {
        console.log(`User ${githubUsername} not in allowed list`);
        return false;
      }

      return true;
    },
    async jwt({ token, account, profile }) {
      // Save access token and username to JWT
      if (account) {
        token.accessToken = account.access_token;
        token.username = (profile as { login?: string })?.login;
      }
      return token;
    },
    async session({ session, token }) {
      // Expose access token and username in session
      return {
        ...session,
        accessToken: token.accessToken as string,
        user: {
          ...session.user,
          username: token.username as string,
        },
      };
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
};
