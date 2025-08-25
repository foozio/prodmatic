import "next-auth";
import { Membership, UserProfile } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      memberships?: (Membership & {
        organization: {
          id: string;
          name: string;
          slug: string;
        };
        team?: {
          id: string;
          name: string;
        } | null;
      })[];
      profile?: UserProfile | null;
    };
  }

  interface User {
    id: string;
    email: string;
    name?: string | null;
    image?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    memberships?: (Membership & {
      organization: {
        id: string;
        name: string;
        slug: string;
      };
      team?: {
        id: string;
        name: string;
      } | null;
    })[];
    profile?: UserProfile | null;
  }
}