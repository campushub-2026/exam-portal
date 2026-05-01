# How to Deploy to Vercel

Since you are facing issues with `localhost` connections (which are often blocked by security policies or firewall issues), the best solution is to deploy your site live.

## Option 1: The Easy Way (Command Line)

1. **Open your terminal** (Ctrl + `).
2. Run the following command:
   ```bash
   npx vercel
   ```
3. Follow the prompts:
   - "Set up and deploy?" -> **Y**
   - "Which scope?" -> (Select your account)
   - "Link to existing project?" -> **N**
   - "Project Name?" -> (Press Enter)
   - "In which directory?" -> **./** (Press Enter)
   - "Want to modify settings?" -> **N**

The tool will upload your site and give you a **Production URL** (ends in `.vercel.app`).
**Use this URL** in your browser.

## Option 2: The UI Way (GitHub)

1. Push your code to a GitHub repository.
2. UI Log in to [Vercel.com](https://vercel.com).
3. Click **"Add New Project"**.
4. Import your GitHub repository.
5. Click **Deploy**.

## IMPORTANT: Update Supabase
Once you have your new `.vercel.app` URL:
1. Go to **Supabase Dashboard** > Authentication > URL Configuration.
2. Add your new `https://....vercel.app` URL to the **Redirect URLs** list.
3. Save.

Now Google Login will work perfectly.
