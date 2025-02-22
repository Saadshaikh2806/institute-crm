# Institute CRM

A modern CRM system built with Next.js, Supabase, and TypeScript.

## Tech Stack

- **Framework**: Next.js 14
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **State Management**: Zustand
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI
- **Form Handling**: React Hook Form + Zod

## Project Structure

```
├── app/                # Next.js app directory
│   ├── admin/         # Admin dashboard pages
│   ├── api/           # API routes
│   ├── auth/          # Authentication pages
│   └── login/         # Login pages
├── components/        # React components
│   ├── admin/         # Admin-specific components
│   ├── auth/          # Authentication components
│   ├── ui/            # Reusable UI components
│   └── providers/     # Context providers
├── hooks/             # Custom React hooks
├── lib/               # Utility functions and configurations
├── store/             # Zustand store definitions
├── types/             # TypeScript type definitions
└── supabase/          # Supabase configurations and migrations
```

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables:
   Create a `.env.local` file with the following:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```
4. Run the development server:
   ```bash
   npm run dev
   ```

## Development Guidelines

- Use TypeScript for all new files
- Follow the existing component structure
- Use Zustand for global state management
- Implement proper error handling and loading states
- Write unit tests for utility functions
- Use React Hook Form + Zod for form validation

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build production bundle
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Deployment

The project is configured for deployment on Vercel with the following settings:
- Build Command: `next build`
- Development Command: `next dev`
- Install Command: `npm install`

## License

Private - All rights reserved