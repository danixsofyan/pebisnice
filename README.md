# Pebisnice

**Pebisnice** is a powerful marketplace profit management and business analytics application built for scale and efficiency. This application is designed to help sellers track their omzet, profit, inventory, and transactions across multiple platforms (e.g., Shopee, TikTok Shop) securely and intuitively.

![Pebisnice Dashboard](public/preview.png)

## Tech Stack

Pebisnice is built with a modern web development stack optimized for performance, security, and developer experience.

- **Framework**: [Next.js](https://nextjs.org/) (App Router, Server Actions)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) & [Shadcn UI](https://ui.shadcn.com/)
- **Authentication**: [Auth.js (NextAuth v5 beta)](https://authjs.dev/) with Google OAuth
- **Database**: PostgreSQL (via [Supabase](https://supabase.com/))
- **ORM**: [Drizzle ORM](https://orm.drizzle.team/)
- **Charts**: [Recharts](https://recharts.org/)
- **Validation**: [Zod](https://zod.dev/)

## Core Features

- 🔐 **Secure Authentication**: End-to-end authentication via OAuth with strict session handling.
- 📊 **Dynamic Dashboard**: Beautiful dark/light mode adaptable dashboard for business KPIs (Omzet, Gross/Net Profit, ROAS).
- 🔄 **Marketplace Integration**: Extensible architecture to synchronize data from popular marketplaces (Shopee, TikTok Shop).
- 🛒 **Inventory & Transactions**: Manage SKUs, track the Cost of Goods Sold (COGS/HPP), and observe transaction flow.
- 🛡️ **Hardened Security**: Pre-configured with CSP headers, DOMPurify for sanitization, server-side RBAC checks, and rate limiting.

## Getting Started

### Prerequisites

Ensure you have the following installed on your machine:

- Node.js (v18.18 or higher)
- pnpm (Recommended package manager)
- A PostgreSQL database (e.g., Supabase)
- Google Cloud Console account (for Google OAuth credentials)

### Installation

1. **Clone the repository:**

   ```bash
   git clone https://github.com/danixsofyan/pebisnice.git
   cd pebisnice
   ```

2. **Install dependencies:**

   ```bash
   pnpm install
   ```

3. **Set up Environment Variables:**

   Copy the provided `.env.example` file to create your local `.env.local` configuration.

   ```bash
   cp .env.example .env.local
   ```

   Fill in all the required credentials inside `.env.local`:
   - Database Connection string (`NODE_ENV`, `DATABASE_URL`)
   - NextAuth Secrets (`AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`)
   - Encryption Keys (if required)

4. **Initialize Database Schema:**

   Push the Drizzle ORM schema to your database.

   ```bash
   pnpm dlx drizzle-kit push
   ```

   *(Optional)* If you want to view your database using Drizzle Studio:
   ```bash
   pnpm dlx drizzle-kit studio
   ```

5. **Start the Development Server:**

   ```bash
   pnpm dev
   ```

   Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Project Structure

```text
pebisnice/
├── app/                  # Next.js App Router (pages, layouts, api, actions)
├── components/           # React Components (UI, layout elements)
├── lib/                  # Application core 
│   ├── db/               # Drizzle ORM schemas and connections
│   ├── security/         # Middleware headers, Rate Limiting, Sanitization
│   ├── services/         # Business logic layer
│   └── errors/           # Custom error handlers
├── public/               # Static assets
└── .env.example          # Template for required environment variables
```

## Security Best Practices Built-in

- No execution of untrusted DOM nodes (`isomorphic-dompurify`).
- Strong AES-256-GCM encryption utilities ready for token management.
- Hardened HTTP Content-Security-Policy responses.
- Centralized `auth.ts` Edge-compatible validation preventing IDORs (Insecure Direct Object References).
- All interactions with the database are cleanly mapped and sanitized via Drizzle.

## Contribution

Contributions, issues, and feature requests are welcome!  
Feel free to check [issues page](#).

## License

This project is licensed under the MIT License.
