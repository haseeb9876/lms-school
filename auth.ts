import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      credentials: {
        cnic: { label: "CNIC", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.cnic) return null;
        
        const cleanCnic = String(credentials.cnic).replace(/[^0-9]/g, "");
        
        const user = await prisma.user.findFirst({
          where: {
            OR: [{ cnic: cleanCnic }, { fatherCnic: cleanCnic }],
          },
        });

        if (!user) return null;
        
        return { 
          id: user.id, 
          name: user.name, 
          role: user.role 
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) token.role = user.role;
      return token;
    },
    session({ session, token }) {
      if (session.user) session.user.role = token.role;
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
