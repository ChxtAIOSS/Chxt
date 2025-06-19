# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CHXT is a Next.js 15 application that appears to be an AI chat interface with multi-provider support. It uses:
- **Frontend**: Next.js 15 with App Router, React 19, TypeScript, Tailwind CSS
- **Backend**: Convex for real-time data sync and backend functions
- **Auth**: Clerk for authentication
- **State**: Local-first approach with encrypted API key storage

## Commands

```bash
# Development
npm run dev          # Start development server with Turbopack

# Building
npm run build        # Build for production
npm run start        # Start production server

# Code Quality
npm run lint         # Run ESLint

# Convex Backend
npx convex dev       # Start Convex development
npx convex deploy    # Deploy Convex functions
```

## Architecture

### Key Directories
- `/app` - Next.js App Router pages and components
  - `ApiKeysPage.tsx` - Manages encrypted API keys for multiple AI providers
  - `ConvexClientProvider.tsx` & `ConvexProviderWithClerk.tsx` - Auth and data sync setup
- `/convex` - Backend functions and schema
  - `schema.ts` - Database schema for threads, messages, sessions
  - `sessions.ts` - Session management for anonymous/authenticated users
- `/lib` - Shared utilities
  - `crypto.ts` - API key encryption/decryption
  - `api-verifier.ts` - Client-side API key validation

### Data Flow
1. **Authentication**: Clerk handles user auth, with support for anonymous sessions
2. **API Keys**: Stored encrypted in localStorage, never sent to backend
3. **Messages/Threads**: Stored in Convex with user isolation
4. **Real-time**: Convex provides reactive queries and mutations

### Security Considerations
- API keys are encrypted client-side using Web Crypto API
- Keys stored in localStorage, not in Convex database
- User data isolation enforced at the Convex query/mutation level
- Session IDs used for anonymous users

## Development Notes

- The app uses React Compiler (experimental) for optimization
- All routes rewrite to `/` (SPA behavior) via Next.js config
- Turbopack enabled for faster development builds
- ESLint configured with Next.js recommended rules
- TypeScript strict mode enabled