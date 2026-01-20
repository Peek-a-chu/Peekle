# Peekle Frontend

Next.js 15 frontend application for the Peekle project, built with TypeScript, Tailwind CSS, and Shadcn/UI.

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 3.4
- **UI Components**: Shadcn/UI
- **Package Manager**: pnpm 10.28.1
- **Linting**: ESLint (Strict mode) + Prettier
- **Git Hooks**: Husky + lint-staged

## Prerequisites

- Node.js 20 or higher
- pnpm 10.28.1

## Installation

1. Install pnpm globally (if not already installed):
```bash
npm install -g pnpm@10.28.1
```

2. Install dependencies:
```bash
pnpm install
```

3. Set up Git hooks:
```bash
pnpm run prepare
```

## Development

Run the development server:
```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Available Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint
- `pnpm lint:fix` - Fix ESLint errors
- `pnpm format` - Format code with Prettier
- `pnpm format:check` - Check code formatting
- `pnpm type-check` - Run TypeScript type checking

## Code Quality

### Pre-commit Hooks

Git hooks are configured to run automatically before commits:
- ESLint checks and auto-fixes
- Prettier formatting
- TypeScript type checking

### Linting Rules

The project uses strict TypeScript and ESLint rules:
- No unused variables
- No explicit `any` types
- Explicit function return types (warning)
- Prettier formatting enforced

## Project Structure

```
apps/frontend/
├── src/
│   ├── app/              # Next.js App Router pages
│   │   ├── layout.tsx    # Root layout
│   │   ├── page.tsx      # Home page
│   │   └── globals.css   # Global styles
│   ├── components/       # React components
│   │   └── ui/          # Shadcn/UI components
│   └── lib/             # Utility functions
│       └── utils.ts     # cn() helper for Tailwind
├── public/              # Static assets
├── .husky/              # Git hooks
├── components.json      # Shadcn/UI configuration
├── tailwind.config.ts   # Tailwind configuration
├── tsconfig.json        # TypeScript configuration
└── package.json         # Dependencies and scripts
```

## Adding Shadcn/UI Components

To add new Shadcn/UI components:
```bash
pnpm dlx shadcn-ui@latest add [component-name]
```

Example:
```bash
pnpm dlx shadcn-ui@latest add button
pnpm dlx shadcn-ui@latest add card
pnpm dlx shadcn-ui@latest add dialog
```

## Building for Production

```bash
pnpm build
```

The optimized production build will be created in the `.next` directory.

## Troubleshooting

### UNC Path Issues (WSL on Windows)

If you encounter UNC path errors when using pnpm, you can:
1. Use npm instead: `npm install`
2. Work from within WSL directly instead of accessing via Windows path
3. Clone the repository to a Windows native path (e.g., `C:\projects\peekle`)

### Type Errors

Run type checking to identify issues:
```bash
pnpm type-check
```

### Linting Errors

Fix linting errors automatically:
```bash
pnpm lint:fix
```

## Contributing

1. Create a feature branch
2. Make your changes
3. Run `pnpm type-check` and `pnpm lint` to ensure code quality
4. Commit your changes (pre-commit hooks will run automatically)
5. Push and create a merge request

## Related Documentation

- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Shadcn/UI Documentation](https://ui.shadcn.com)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)
