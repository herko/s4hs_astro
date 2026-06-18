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

## Deployment (Cloudflare Pages)

Fully static site deployed as **Cloudflare Pages**. Pages supports custom
domains via an external DNS CNAME/ALIAS, so the domain's nameservers can stay
at the current provider (e.g. websupport.sk).

### CI build settings (Pages → Git)

| Setting                 | Value           |
| :---------------------- | :-------------- |
| Build command           | `npm run build` |
| Build output directory  | `dist`          |
| Framework preset        | Astro           |
| Env vars                | none            |

### Local / manual deploy

```bash
npm run build
npx wrangler login            # once
npx wrangler pages deploy dist
```

### Custom domain (external DNS, no nameserver change)

1. In the Pages project → **Custom domains** → add `s4hs.sk` and `www.s4hs.sk`.
   Note the assigned `<project>.pages.dev` target.
2. At the DNS provider (websupport.sk):
   - `ALIAS`/`ANAME` record: host `@` → `<project>.pages.dev`
   - `CNAME` record: host `www` → `<project>.pages.dev`
3. Cloudflare validates the records and issues SSL automatically.
