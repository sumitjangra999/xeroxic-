# How to Fix Supabase RLS Security Issue (rls_disabled_in_public)

### 📌 Problem:
Supabase detected that the table `print_jobs` in the `public` schema has **Row Level Security (RLS) disabled**, meaning any unauthorized user with the public URL/anon key could theoretically alter or delete data.

---

### 🚀 Solution (Takes 30 seconds):

1. **Open Supabase SQL Editor:**
   Go to: **[https://supabase.com/dashboard/project/tjmwwnheuphnrxyxkvhx/sql/new](https://supabase.com/dashboard/project/tjmwwnheuphnrxyxkvhx/sql/new)**
   *(Or click the "Resolve issue" button in your Supabase email)*

2. **Copy and Paste the SQL:**
   Open the file [`supabase/fix_rls_security.sql`](./fix_rls_security.sql), copy the entire SQL content, and paste it into the Supabase SQL Editor.

3. **Click "Run" (or press Ctrl + Enter / Cmd + Enter):**
   - You will see `Success. No rows returned`.
   - Row Level Security will be immediately active.
   - The security warning in your Supabase project dashboard will turn green / resolved.
   - The Xeroxic web app will continue to work seamlessly without interruption.
