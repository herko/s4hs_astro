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

## Deployment (Cloudflare Workers — static assets)

Fully static site (no Worker script). `wrangler.toml` deploys the built
`dist/` directory as **Workers Assets** (`[assets] directory = "./dist"`), so a
plain `wrangler deploy` works.

### CI build settings

| Setting        | Value                 |
| :------------- | :-------------------- |
| Build command  | `npm run build`       |
| Deploy command | `npx wrangler deploy` |
| Env vars       | none                  |

### Local / manual deploy

```bash
npm run build
npx wrangler login     # once
npx wrangler deploy
```

### Custom domain (`s4hs.sk`)

A Workers custom domain requires the zone to be on Cloudflare:

1. Cloudflare → **Add a site** → `s4hs.sk` → review the imported DNS records
   (especially **MX/email**), then set the domain's nameservers (at the
   registrar, e.g. websupport.sk) to the two Cloudflare nameservers.
2. Once the zone is Active: Worker `s4hs` → **Settings → Domains & Routes →
   Add Custom Domain** → `s4hs.sk` (and `www.s4hs.sk`). DNS + SSL are automatic.
