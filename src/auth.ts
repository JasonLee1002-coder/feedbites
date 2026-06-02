// src/auth.ts — Gmail-only login (no password), upsert on first login
import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { authConfig } from './auth.config'

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Gmail', type: 'email' },
      },
      async authorize(credentials) {
        const email = (credentials?.email as string | undefined)?.toLowerCase().trim()
        if (!email || !email.includes('@')) return null

        // Upsert — create user on first login, no password needed
        const [user] = await db
          .insert(users)
          .values({ email })
          .onConflictDoUpdate({
            target: users.email,
            set: { updated_at: new Date() },
          })
          .returning({ id: users.id, email: users.email })

        if (!user) return null
        return { id: user.id, email: user.email }
      },
    }),
  ],
})
