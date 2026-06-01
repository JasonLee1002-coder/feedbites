#!/bin/bash
# Run this in the Feedbites project directory
# Installs NextAuth v5 + bcryptjs, removes Supabase packages

npm install next-auth@beta bcryptjs
npm install -D @types/bcryptjs
npm uninstall @supabase/supabase-js @supabase/ssr
