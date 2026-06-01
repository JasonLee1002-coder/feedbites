// src/auth.ts
// NextAuth v5 (Auth.js) — Credentials provider backed by users table in omnicore-postgres
// Node.js runtime only — do NOT import this in middleware (use auth.config.ts instead)
import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { compare } from 'bcryptjs'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { authConfig } from './auth.config'

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email:    { label: 'Email',    type: 'email'    },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, credentials.email as string))
          .limit(1)

        if (!user) return null

        const valid = await compare(credentials.password as string, user.password_hash)
        if (!valid) return null

        return { id: user.id, email: user.email }
      },
    }),
  ],
})
