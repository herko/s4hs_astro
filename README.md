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

### Automatic (CI) — after first manual setup

| Setting          | Value         |
| :--------------- | :------------ |
| Build command    | `npm run build` |
| Output directory | `dist`        |
| Framework preset | Astro         |
| Environment vars | none          |

### First-time manual setup

1. In the [Cloudflare dashboard](https://dash.cloudflare.com/), create a new **Pages** project connected to this Git repository.
2. Set the build command to `npm run build` and the output directory to `dist`. Choose the **Astro** framework preset.
3. Click **Save and Deploy**. Cloudflare Pages will build and publish the site.
4. After the first successful deploy, add the custom domain `s4hs.sk` under the Pages project's **Custom domains** tab and follow the DNS instructions.

No environment variables are required for the static build.
