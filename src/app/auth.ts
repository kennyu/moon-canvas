import type { NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";

// Simple in-memory user store. Replace with a database in production.
type LocalUser = { id: string; email: string; name: string; passwordHash: string; image?: string };
const users = new Map<string, LocalUser>();

export function findUserByEmail(email: string): LocalUser | null {
  return users.get(email.toLowerCase()) ?? null;
}

export function createUser({ email, name, password }: { email: string; name: string; password: string }): LocalUser {
  const lower = email.toLowerCase();
  const existing = users.get(lower);
  if (existing) return existing;
  const passwordHash = bcrypt.hashSync(password, 10);
  const user: LocalUser = { id: lower, email: lower, name, passwordHash };
  users.set(lower, user);
  return user;
}

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }),
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = (credentials?.email || "").toString();
        const password = (credentials?.password || "").toString();
        const user = findUserByEmail(email);
        if (user && bcrypt.compareSync(password, user.passwordHash)) {
          return { id: user.id, email: user.email, name: user.name, image: user.image } as any;
        }
        return null;
      },
    }),
  ],
};


