# GoatsEMR

GoatsEMR is a mobile-first electronic medical records system for a goat livestock cooperative in the Philippines, built with Next.js 14, Tailwind CSS, NextAuth.js, Google Sheets API v4, and ZXing camera scanning.

## 1) Clone and install

```bash
git clone https://github.com/your-org/goats-emr.git
cd goats-emr
npm install
```

## 2) Create the Google Sheet

1. Create a Google Spreadsheet.
2. Rename the first sheet to `Goats`.
3. Set row 1 headers in exact order:

`ID | Gender | Birthdate | Description | Barcode | Image | Parent Buck | Parent Doe | State | Deceased | Weight | Remarks`

4. Copy the Spreadsheet ID from the URL (between `/d/` and `/edit`).

## 3) Set up Google Sheets API service account

1. Open [Google Cloud Console](https://console.cloud.google.com/).
2. Create/select a project.
3. Enable **Google Sheets API**.
4. Go to **IAM & Admin > Service Accounts**.
5. Create a service account.
6. Create a JSON key for that service account and download it.
7. Copy the service account `client_email` and `private_key` from the JSON.
8. Share the Google Sheet with the service account email as Editor.

## 4) Configure Google OAuth for NextAuth

1. In Google Cloud Console, go to **APIs & Services > Credentials**.
2. Create an **OAuth client ID** (Web application).
3. Add authorized redirect URI:
   - Local: `http://localhost:3000/api/auth/callback/google`
   - Production: `https://YOUR-VERCEL-DOMAIN/api/auth/callback/google`
4. Copy the client ID and client secret.

## 5) Configure environment variables

1. Copy `.env.example` to `.env.local`.
2. Fill all values:

```env
GOOGLE_SHEETS_SPREADSHEET_ID=
GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY=
NEXTAUTH_SECRET=
NEXTAUTH_URL=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
ALLOWED_EMAILS=
```

### Notes

- `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` must preserve line breaks (or use escaped `\\n`).
- `ALLOWED_EMAILS` is comma-separated, e.g. `juan@gmail.com,maria@gmail.com`

## 6) Run locally

```bash
npm run dev
```

Open `http://localhost:3000`.

## 7) Deploy to Vercel

1. Push code to GitHub.
2. Import the repo in [Vercel](https://vercel.com/).
3. Add all env vars from `.env.local` into Project Settings > Environment Variables.
4. Deploy.
5. Update `NEXTAUTH_URL` to your Vercel domain.
6. Ensure Google OAuth redirect URI includes your Vercel callback URL.
