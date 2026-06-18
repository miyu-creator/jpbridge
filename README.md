# JP Bridge

AI-powered Japanese conversation practice with Sayuki, your AI teacher.

## What's in here

- `src/JPBridge.jsx` — the app itself (levels, topics, chat UI)
- `api/chat.js` — a small secure backend. This is the only place your
  Anthropic API key is read, so it never reaches the browser.

## Deploying (step by step)

### 1. Push this folder to GitHub

If you're starting from this folder on your computer:

```
git init
git add .
git commit -m "JP Bridge initial version"
```

Then go to github.com, click "New repository", name it `jpbridge`,
leave it empty (no README/license), and follow the page's instructions
under "...or push an existing repository from the command line" —
it'll give you 2 commands to paste that look like:

```
git remote add origin https://github.com/YOUR-USERNAME/jpbridge.git
git push -u origin main
```

### 2. Get an Anthropic API key

Go to console.anthropic.com, sign in, go to "API Keys", and create one.
Keep this page open — you'll paste it into Vercel next.

### 3. Deploy on Vercel

1. Go to vercel.com and sign up using your GitHub account (just click
   "Continue with GitHub").
2. Click "Add New... > Project".
3. Select your `jpbridge` repo and click "Import".
4. Before clicking Deploy, expand "Environment Variables" and add:
   - Name: `ANTHROPIC_API_KEY`
   - Value: (paste the key from step 2)
5. Click "Deploy".

In about a minute you'll get a live URL like `jpbridge.vercel.app`.
That's the link to send Sayuki — she can open it right in her phone's
browser, no app store needed.

### 4. Updating it later

Any time you want to change something (after Sayuki reviews the
Japanese prompts, for example), edit the files, then:

```
git add .
git commit -m "describe what you changed"
git push
```

Vercel automatically redeploys within a minute or two. No need to
repeat the setup steps.

## Editing the teaching prompts

The instructions that shape how Sayuki (the AI) responds at each level
live in `api/chat.js`, in the `buildSystemPrompt` function. This is
the file to edit once Sayuki (the person) reviews and corrects the
Japanese.
