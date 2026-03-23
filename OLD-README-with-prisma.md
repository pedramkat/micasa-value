# Next.js & Prisma Postgres Auth Starter

This repository provides a boilerplate to quickly set up a Next.js demo application with authentication using [NextAuth.js v4](https://next-auth.js.org/), [Prisma Postgres](https://www.prisma.io/postgres) and [Prisma ORM](https://www.prisma.io/orm), and deploy it to Vercel. It includes an easy setup process and example routes that demonstrate basic CRUD operations against the database.

## Features

- Next.js 15 app with App Router, Server Actions & API Routes
- Data modeling, database migrations, seeding & querying
- Log in and sign up authentication flows
- CRUD operations to create, view and delete blog posts
- Pagination, filtering & relations queries

## Getting started

### 1. Install dependencies

After cloning the repo and navigating into it, install dependencies:

```
npm install
```

### 1. Create a Prisma Postgres instance

Create a Prisma Postgres instance by running the following command:

```
npx prisma init --db
```

This command is interactive and will prompt you to:

1. Log in to the [Prisma Console](https://console.prisma.io)
1. Select a **region** for your Prisma Postgres instance
1. Give a **name** to your Prisma project

Once the command has terminated, copy the **Database URL** from the terminal output. You'll need it in the next step when you configure your `.env` file.

<!-- Create a Prisma Postgres database instance using [Prisma Data Platform](https://console.prisma.io):

1. Navigate to [Prisma Data Platform](https://console.prisma.io).
2. Click **New project** to create a new project.
3. Enter a name for your project in the **Name** field.
4. Inside the **Prisma Postgres** section, click **Get started**.
5. Choose a region close to your location from the **Region** dropdown.
6. Click **Create project** to set up your database. This redirects you to the database setup page.
7. In the **Set up database access** section, copy the `DATABASE_URL`. You will use this in the next steps. -->

### 2. Set up your `.env` file

You now need to configure your database connection via an environment variable.

First, create an `.env` file:

```bash
touch .env
```

Then update the `.env` file by replacing the existing `DATABASE_URL` value with the one you previously copied. It will look similar to this:

```bash
DATABASE_URL="prisma+postgres://accelerate.prisma-data.net/?api_key=PRISMA_POSTGRES_API_KEY"
```

To ensure your authentication works properly, you'll also need to set [env vars for NextAuth.js](https://next-auth.js.org/configuration/options):

```bash
AUTH_SECRET="RANDOM_32_CHARACTER_STRING"
```

You can generate a random 32 character string for the `AUTH_SECRET` secret with this command:

```
npx auth secret
```

In the end, your entire `.env` file should look similar to this (but using _your own values_ for the env vars):

```bash
DATABASE_URL="prisma+postgres://accelerate.prisma-data.net/?api_key=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhcGlfa2V5IjoiMWEzMjBiYTEtYjg2Yy00ZTA5LThmZTktZDBhODA3YjQwZjBkIiwidGVuYW50X2lkIjoiY2RhYmM3ZTU1NzdmMmIxMmM0ZTI1Y2IwNWJhZmZhZmU4NjAxNzkxZThlMzhlYjI1NDgwNmIzZjI5NmU1NTkzNiIsImludGVybmFsX3NlY3JldCI6ImI3YmQzMjFhLTY2ODQtNGRiMC05ZWRiLWIyMGE2ZTQ0ZDMwMSJ9.JgKXQBatjjh7GIG3_fRHDnia6bDv8BdwvaX5F-XdBfw"

AUTH_SECRET="gTwLSXFeNWFRpUTmxlRniOfegXYw445pd0k6JqXd7Ag="
```

### 3. Migrate the database

Run the following commands to set up your database and Prisma schema:

```bash
npx prisma migrate dev --name init
```

<!--
<details>

<summary>Expand for <code>yarn</code>, <code>pnpm</code> or <code>bun</code></summary>

```bash
# Using yarn
yarn prisma migrate dev --name init

# Using pnpm
pnpm prisma migrate dev --name init

# Using bun
bun prisma migrate dev --name init
```

</details> -->

### 4. Seed the database

Add initial data to your database:

```bash
npx prisma db seed
```

<details>

<summary>Expand for <code>yarn</code>, <code>pnpm</code> or <code>bun</code></summary>

```bash
# Using yarn
yarn prisma db seed

# Using pnpm
pnpm prisma db seed

# Using bun
bun prisma db seed
```

</details>

### 5. Run the app

Start the development server:

```bash
npm run dev
```

<details>

<summary>Expand for <code>yarn</code>, <code>pnpm</code> or <code>bun</code></summary>

```bash
# Using yarn
yarn dev

# Using pnpm
pnpm run dev

# Using bun
bun run dev
```

</details>

Once the server is running, visit `http://localhost:3000` to start using the app.

## Next steps

- [Prisma ORM documentation](https://www.prisma.io/docs/orm)
- [Prisma Client API reference](https://www.prisma.io/docs/orm/prisma-client)
- [Join our Discord community](https://discord.com/invite/prisma)
- [Follow us on Twitter](https://twitter.com/prisma)

--- Database URL ---

Connect Prisma ORM to your Prisma Postgres database with this URL:

postgres://be1d1063ac2119a5dda4c13adc613f879dc95be3cea17d51bb4ce4fc1b64df29:sk_eD-cMv-NHFvydhnxeKwIm@db.prisma.io:5432/postgres?sslmode=require

--- Next steps ---

Go to https://pris.ly/ppg-init for detailed instructions.

1. Install the Postgres adapter
npm install @prisma/adapter-pg

...and add it to your Prisma Client instance:

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client";

const connectionString = `${process.env.DATABASE_URL}`;

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

2. Apply migrations
Run the following command to create and apply a migration:
npx prisma migrate dev

3. Manage your data
View and edit your data locally by running this command:
npx prisma studio
...or online in Console:
https://console.prisma.io/of88r4m2z5z1uwr7cppulsoo/cmlikits203lwwjecxaj5d0i0/cmlikits203lswjectyymfkvs/studio

4. Send queries from your app
If you already have an existing app with Prisma ORM, you can now run it and it will send queries against your newly created Prisma Postgres instance.

5. Learn more
For more info, visit the Prisma Postgres docs: https://pris.ly/ppg-docs

### Prisma restart
ps aux | grep prisma   
kill -9 <PID>
pkill -9 node 
npx prisma studio --port 5555 &

### NGROK setup

--- NGROK ---
ngrok http --url=https://audrina-nondedicative-jacquiline.ngrok-free.app http://localhost:3010/

--- TELEGRAM ---
curl -X POST \
https://api.telegram.org/bot8355444921:AAFB3MIGEv1qt5E64fA3LXblzWsqYcSrFCA/setWebhook \
-d "url=https://audrina-nondedicative-jacquiline.ngrok-free.app/api/telegram/webhook"

curl -X POST https://api.telegram.org/bot8355444921:AAFB3MIGEv1qt5E64fA3LXblzWsqYcSrFCA/deleteWebhook

curl -X POST https://api.telegram.org/bot8355444921:AAFB3MIGEv1qt5E64fA3LXblzWsqYcSrFCA/getWebhookInfo

// Add Menu Button to chat
curl -X POST https://api.telegram.org/bot8355444921:AAFB3MIGEv1qt5E64fA3LXblzWsqYcSrFCA/setChatMenuButton \
-H "Content-Type: application/json" \
-d '{
  "menu_button": {
    "type": "commands"
  }
}'

curl -X POST https://api.telegram.org/bot8355444921:AAFB3MIGEv1qt5E64fA3LXblzWsqYcSrFCA/setMyCommands \
-H "Content-Type: application/json" \
-d '{
  "commands": [
    {"command": "start", "description": "Show menu"},
    {"command": "add", "description": "Add new item"},
    {"command": "select", "description": "Select item"}
  ]
}'