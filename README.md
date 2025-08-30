This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## QuickFix QR — How to Demo

This app simulates a QR-powered issue reporting system with a real-time admin dashboard. All data is mocked.

1. Report flow
   - Open `/r/BIN-123`, `/r/LGT-456`, or `/r/WTR-789` to see category preselected.
   - Fill form: category segmented control, urgency, optional note, attach photo (<=3MB), and map pin/GPS.
   - Submit to see success page at `/r/success` with ticket ID.

2. Admin dashboard
   - Open `/admin`.
   - Left: map with markers by status; urgent items show a soft pulsing ring. Right: searchable/filterable issue list.
   - Selecting in the list highlights the map marker (and vice versa).
   - Export CSV of filtered issues.

3. Demo controls (development only)
   - A sticky DemoBar appears in dev mode on `/admin`.
   - Trigger Urgent Issue: inserts a nearby urgent item, shows toast and a short chime.
   - Random Status Update: cycles a random issue status.

Notes
- Real-time is mocked with a subscription that randomly inserts or updates issues.
- Animations respect `prefers-reduced-motion`.
- Dark mode supported; toggle in the header.
