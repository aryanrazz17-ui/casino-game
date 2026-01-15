# ⚠️ ACTION REQUIRED: DATABASE SETUP

The backend is configured and running, but the **database tables do not exist**.
You will see "Could not find the table..." errors until you run the SQL schema.

## 🟢 How to Fix (1 Minute Task)

1.  **Copy the Schema**:
    - Open the file `supabase_schema.sql` in this project.
    - Copy **ALL** the text inside it.

2.  **Run in Supabase**:
    - Click this link to open your project's SQL Editor:
      👉 [**OPEN SQL EDITOR**](https://supabase.com/dashboard/project/jpoezbkxaeqyeirvkddc/sql)
    - Click **"New query"**.
    - **Paste** the code you copied.
    - Click **"Run"**.

3.  **Done!**
    - Your app will now work immediately. No restart needed.

---
**Why is this needed?**
Supabase is an empty database by default. You must tell it to create the `users`, `games`, and `wallets` tables so the app has somewhere to store data.
