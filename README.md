# CHXT - Premium AI Chat Experience

CHXT is a high-performance AI chat application built with Next.js 15, featuring multi-provider support (OpenAI, Anthropic, Google, DeepSeek), real-time streaming, and local-first encrypted API key storage.

## Features

- 🚀 **Multi-Provider Support**: OpenAI, Anthropic, Google Gemini, DeepSeek
- 🔐 **Secure**: Client-side encrypted API keys (never sent to server)
- ⚡ **Real-time Streaming**: Character-by-character streaming with adaptive speed
- 🎨 **Beautiful UI**: Glass morphism design with smooth animations
- 📱 **Responsive**: Works on desktop and mobile
- 🔄 **Real-time Sync**: Powered by Convex for instant updates
- 🔑 **Authentication**: Optional Clerk auth with anonymous session support

## Prerequisites

- Node.js 18.17 or later
- Git
- A package manager (npm, yarn, or pnpm)
- Account credentials for:
  - [Convex](https://convex.dev) (required)
  - [Clerk](https://clerk.dev) (optional, for authentication)
  - API keys for AI providers you want to use

## Installation

### Step 1: Clone the Repository

```bash
git clone https://github.com/yourusername/chxt.git
cd chxt
```

### Step 2: Install Dependencies

**Linux/macOS:**
```bash
npm install
# or
yarn install
# or
pnpm install
```

**Windows:**
```cmd
npm install
```

### Step 3: Set Up Convex

1. Install Convex CLI globally:
```bash
npm install -g convex
```

2. Login to Convex:
```bash
npx convex login
```

3. Initialize Convex in your project:
```bash
npx convex init
```

4. Deploy Convex functions:
```bash


```

### Step 4: Set Up Environment Variables

1. Copy the example environment file:

**Linux/macOS:**
```bash
cp .env.example .env.local
```

**Windows:**
```cmd
copy .env.example .env.local
```

2. Edit `.env.local` and add your credentials:

```env
# Convex (Required)
NEXT_PUBLIC_CONVEX_URL=https://your-project.convex.cloud

# Clerk (Optional - for authentication)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Optional - for enhanced security
NEXT_PUBLIC_ENCRYPTION_SALT=your-random-salt-here
```

### Step 5: Run the Development Server

**Linux/macOS:**
```bash
# Terminal 1 - Run Convex dev server
npx convex dev

# Terminal 2 - Run Next.js dev server
npm run dev
```

**Windows:**
```cmd
# Command Prompt 1 - Run Convex dev server
npx convex dev

# Command Prompt 2 - Run Next.js dev server
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000)

## Setting Up AI Providers

1. Navigate to the API Keys page in the app
2. Add your API keys for the providers you want to use:
   - **OpenAI**: Get from [platform.openai.com](https://platform.openai.com)
   - **Anthropic**: Get from [console.anthropic.com](https://console.anthropic.com)
   - **Google**: Get from [makersuite.google.com](https://makersuite.google.com)
   - **DeepSeek**: Get from [platform.deepseek.com](https://platform.deepseek.com)

## Building for Production

**Linux/macOS:**
```bash
npm run build
npm run start
```

**Windows:**
```cmd
npm run build
npm run start
```

## Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Import your repository on [Vercel](https://vercel.com)
3. Add environment variables in Vercel dashboard
4. Deploy

### Deploy Convex to Production

```bash
npx convex deploy --prod
```

## Project Structure

```
chxt/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   └── *.tsx              # Page components
├── components/            # React components
├── convex/               # Convex backend functions
│   ├── _generated/       # Auto-generated Convex files
│   └── *.ts             # Backend functions
├── lib/                  # Utility functions
│   ├── crypto.ts        # Encryption utilities
│   └── useStreamingChat.ts # Streaming hook
└── public/              # Static assets
```

## Troubleshooting

### Windows-Specific Issues

1. **PowerShell Execution Policy**:
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```

2. **Node.js Path Issues**:
   - Ensure Node.js is in your PATH
   - Restart terminal after Node.js installation

### Common Issues

1. **Convex Connection Failed**:
   - Ensure `NEXT_PUBLIC_CONVEX_URL` is correct
   - Run `npx convex dev` in development

2. **API Keys Not Working**:
   - Keys are encrypted locally using your user ID
   - Clear localStorage if switching auth providers

3. **Streaming Errors (ECONNRESET)**:
   - Some providers (DeepSeek, Gemini) have shorter timeouts
   - Try shorter prompts or switch providers

4. **Build Errors**:
   ```bash
   # Clear cache and reinstall
   rm -rf node_modules .next
   npm install
   ```

## Development Commands

```bash
# Start development server with Turbopack
npm run dev

# Build for production
npm run build

# Start production server
npm run start

# Run linting
npm run lint

# Convex commands
npx convex dev          # Development
npx convex deploy       # Deploy to production
npx convex logs         # View function logs
```

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_CONVEX_URL` | Yes | Your Convex deployment URL |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | No | Clerk public key for auth |
| `CLERK_SECRET_KEY` | No | Clerk secret key |
| `NEXT_PUBLIC_ENCRYPTION_SALT` | No | Custom salt for encryption |
| `BRAVE_SEARCH_API_KEY=` | yes | Web search api |


## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For issues and questions:
- Open an issue on GitHub
- Check existing issues for solutions
- Review Convex docs at [docs.convex.dev](https://docs.convex.dev)
- Review Next.js docs at [nextjs.org/docs](https://nextjs.org/docs)