import { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import EmailProvider from "next-auth/providers/email";
import GoogleProvider from "next-auth/providers/google";
import GitHubProvider from "next-auth/providers/github";
import CredentialsProvider from "next-auth/providers/credentials";
import bcryptjs from "bcryptjs";
import { db } from "@/lib/db";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db) as any,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/auth/signin",
    signUp: "/auth/signup",
    error: "/auth/error",
  },
  providers: [
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
          include: {
            profile: true,
            memberships: {
              include: {
                organization: true,
                team: true,
              },
            },
          },
        });

        if (!user || !user.password) {
          return null;
        }

        const isPasswordValid = await bcryptjs.compare(
          credentials.password,
          user.password
        );

        if (!isPasswordValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),

    EmailProvider({
      server: {
        host: process.env.EMAIL_SERVER_HOST,
        port: process.env.EMAIL_SERVER_PORT,
        auth: {
          user: process.env.EMAIL_SERVER_USER,
          pass: process.env.EMAIL_SERVER_PASSWORD,
        },
      },
      from: process.env.EMAIL_FROM,
    }),

    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),

    GitHubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }

      if (token.id) {
        const userWithMemberships = await db.user.findUnique({
          where: { id: token.id as string },
          include: {
            memberships: {
              include: {
                organization: true,
                team: true,
              },
            },
            profile: true,
          },
        });

        if (userWithMemberships) {
          token.memberships = userWithMemberships.memberships;
          token.profile = userWithMemberships.profile;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.memberships = token.memberships as any;
        session.user.profile = token.profile as any;
      }
      return session;
    },
    async signIn({ user, account }) {
      if (account?.provider === "credentials") {
        return true;
      }

      if (account?.provider === "google" || account?.provider === "github") {
        try {
          const existingUser = await db.user.findUnique({
            where: { email: user.email! },
          });

          if (!existingUser) {
            await db.user.create({
              data: {
                email: user.email!,
                name: user.name,
                image: user.image,
                emailVerified: new Date(),
                profile: {
                  create: {
                    locale: "en",
                  },
                },
              },
            });
          }
          return true;
        } catch (error) {
          console.error("Error creating user:", error);
          return false;
        }
      }

      return true;
    },
  },
  events: {
    async createUser({ user }) {
      await db.userProfile.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          locale: "en",
        },
        update: {},
      });
    },
  },
};