import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

// Validacao de variaveis de ambiente obrigatórias para autenticacao
const requiredEnvVars = ['NEXTAUTH_SECRET', 'NEXTAUTH_GOOGLE_ID', 'NEXTAUTH_GOOGLE_SECRET'] as const;
const missing = requiredEnvVars.filter(v => !process.env[v]);
if (missing.length > 0) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  } else {
    console.warn(`Warning: Missing environment variables: ${missing.join(', ')}`);
  }
}

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async signIn() {
      return true;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
    async jwt({ token }) {
      return token;
    },
  },
});

export { handler as GET, handler as POST };
