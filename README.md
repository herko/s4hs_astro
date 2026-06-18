# Astro Starter Kit: Minimal

```sh
npm create astro@latest -- --template minimal
```

> 🧑‍🚀 **Seasoned astronaut?** Delete this file. Have fun!

## 🚀 Project Structure

Inside of your Astro project, you'll see the following folders and files:

```text
/
├── public/
├── src/
│   └── pages/
│       └── index.astro
└── package.json
```

Astro looks for `.astro` or `.md` files in the `src/pages/` directory. Each page is exposed as a route based on its file name.

There's nothing special about `src/components/`, but that's where we like to put any Astro/React/Vue/Svelte/Preact components.

Any static assets, like images, can be placed in the `public/` directory.

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `npm run astro -- --help` | Get help using the Astro CLI                     |

## 👀 Want to learn more?

Feel free to check [our documentation](https://docs.astro.build) or jump into our [Discord server](https://astro.build/chat).

## Deployment (Cloudflare)

This is a fully static site (no Worker script). `wrangler.toml` deploys the
built `dist/` directory as **Workers Assets** (`[assets] directory = "./dist"`),
so a plain `wrangler deploy` works.

### CI build settings

| Setting        | Value                 |
| :------------- | :-------------------- |
| Build command  | `npm run build`       |
| Deploy command | `npx wrangler deploy` |
| Env vars       | none                  |

The build must run before deploy so `dist/` exists; `wrangler deploy` then
uploads it (no entry-point/Worker script needed for an assets-only project).

### Local / first-time deploy

```bash
npm run build
npx wrangler login   # once
npx wrangler deploy
```

After the first successful deploy, add the custom domain `s4hs.sk` in the
Cloudflare dashboard (the project's **Domains & Routes**) and follow the DNS
instructions. No environment variables are required.
