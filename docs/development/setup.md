# Development Setup Guide

## Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- Git

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd healthcare-dlt-core
```

2. Install dependencies:
```bash
npm run install:all
```

3. Set up environment variables:
```bash
# Frontend
cp frontend/.env.local.example frontend/.env.local

# Middleware
cp middleware/.env.example middleware/.env
```

4. Start development servers:
```bash
npm run dev
```

This will start:
- Frontend: http://localhost:3000
- Middleware: http://localhost:3001

## Project Structure

```
healthcare-dlt-core/
├── frontend/          # Next.js frontend application
├── middleware/        # Node.js Express API gateway
├── docs/             # Project documentation
└── .kiro/            # Kiro specifications and configurations
```

## Development Workflow

1. Make changes to the code
2. Test locally using `npm run dev`
3. Run tests with `npm test` (when available)
4. Commit changes following conventional commit format
5. Push to feature branch and create pull request