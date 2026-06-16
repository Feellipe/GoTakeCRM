import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from '@/lib/db';

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.NEXTAUTH_GOOGLE_ID ?? "",
      clientSecret: process.env.NEXTAUTH_GOOGLE_SECRET ?? "",
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await db.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.passwordHash) {
          return null;
        }

        const isValid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.avatar,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt" as const,
  },
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async signIn({ user, account }: { user: any; account: any }) {
      // Google sign-in: create or update User record
      if (account?.provider === "google" && user.email) {
        await db.user.upsert({
          where: { email: user.email },
          update: {
            googleId: user.id,
            name: user.name ?? '',
            avatar: user.image,
            lastLoginAt: new Date(),
          },
          create: {
            email: user.email,
            googleId: user.id,
            name: user.name ?? '',
            avatar: user.image,
          },
        });

        // Auto-create organization for new Google users
        const userRecord = await db.user.findUnique({ where: { email: user.email } });
        const existingMembership = await db.userOrganization.findFirst({
          where: { userId: userRecord!.id },
        });
        if (!existingMembership && userRecord) {
          const orgSlug = (user.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-') ?? user.id).slice(0, 50);
          const org = await db.organization.create({
            data: { name: `${user.name}'s Studio`, slug: orgSlug },
          });
          await db.userOrganization.create({
            data: { userId: userRecord.id, organizationId: org.id, role: "owner" },
          });
          await db.dashboardSettings.create({
            data: { organizationId: org.id, businessName: `${user.name}'s Studio` },
          });
        }
      }

      // Credentials sign-in: update lastLoginAt
      if (account?.provider === "credentials" && user.email) {
        await db.user.update({
          where: { email: user.email },
          data: { lastLoginAt: new Date() },
        });
      }

      return true;
    },
    async session({ session, token }: { session: any; token: any }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
    async jwt({ token, user }: { token: any; user: any }) {
      if (user) {
        token.sub = user.id;
      }
      return token;
    },
  },
  pages: {
    signIn: '/login',
  },
};
