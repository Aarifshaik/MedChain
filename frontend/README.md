# Healthcare DLT Frontend

A Next.js frontend application for the Healthcare DLT (Distributed Ledger Technology) system with quantum-resistant cryptography.

## Features

### ✅ Completed Setup (Task 9.1)

- **Next.js 16** with TypeScript configuration
- **shadcn/ui** component library integration
- **Magic UI** components for animations and effects
- **Healthcare-focused theming** with medical color palette
- **Responsive layout** with sidebar navigation
- **Theme switching** with animated theme toggler
- **Post-quantum cryptography** integration ready

### Components Installed

#### shadcn/ui Components
- Button, Card, Form, Input, Label
- Dialog, Table, Badge, Avatar
- Navigation Menu, Sidebar
- Dropdown Menu, Sonner (notifications)
- Separator, Sheet, Tooltip, Skeleton

#### Magic UI Components
- Animated Theme Toggler
- Blur Fade animations
- Animated Shiny Text
- Magic Card with spotlight effects

### Project Structure

```
frontend/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── auth/login/         # Authentication pages
│   │   ├── dashboard/          # Dashboard redirect
│   │   ├── records/            # Medical records pages
│   │   ├── layout.tsx          # Root layout with theme provider
│   │   ├── page.tsx            # Main dashboard page
│   │   └── globals.css         # Global styles with healthcare theme
│   ├── components/
│   │   ├── layout/             # Layout components
│   │   │   ├── main-layout.tsx # Main application layout
│   │   │   ├── app-sidebar.tsx # Navigation sidebar
│   │   │   └── header.tsx      # Application header
│   │   ├── ui/                 # shadcn/ui components
│   │   └── theme-provider.tsx  # Theme context provider
│   ├── lib/
│   │   ├── config.ts           # Application configuration
│   │   └── utils.ts            # Utility functions
│   └── types/                  # TypeScript type definitions
├── components.json             # shadcn/ui configuration
├── next.config.ts              # Next.js configuration
├── package.json                # Dependencies and scripts
└── tsconfig.json               # TypeScript configuration
```

### Healthcare Theme

The application uses a medical-focused color palette:

- **Primary**: Medical blue (`oklch(0.55 0.15 220)`)
- **Accent**: Medical green (`oklch(0.55 0.12 160)`)
- **Destructive**: Medical red for alerts
- **Consistent theming** across light and dark modes
- **Accessible color contrasts** for healthcare environments

### User Roles & Navigation

The sidebar navigation adapts based on user roles:

- **Patient**: Dashboard, Records, Upload, Consent, Access History
- **Doctor**: Dashboard, Patient Records, Upload Results, Patient Approvals, Audit Trail
- **Laboratory**: Dashboard, Test Results, Upload Results, Audit Trail
- **Insurer**: Dashboard, Claims Review, Patient Records, Audit Trail
- **Auditor**: Dashboard, Audit Trail, Compliance Reports, System Users
- **System Admin**: Dashboard, User Management, Registration Approvals, Settings, Audit Trail

### Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

### Next Steps

The frontend is now ready for implementing:

1. **Authentication interfaces** (Task 9.2)
2. **User registration and approval** (Task 9.3)
3. **Medical record interfaces** (Task 10.x)
4. **Consent management interfaces** (Task 11.x)
5. **Audit and compliance interfaces** (Task 12.x)

### Technologies Used

- **Next.js 16** - React framework with App Router
- **TypeScript** - Type safety and developer experience
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - High-quality component library
- **Magic UI** - Animation and effect components
- **next-themes** - Theme switching functionality
- **Lucide React** - Icon library
- **Inter & JetBrains Mono** - Typography fonts

### Requirements Satisfied

This implementation satisfies the following requirements from the specification:

- **1.1**: Post-quantum cryptography foundation (UI ready for PQC integration)
- **2.1**: Authentication interface structure (login page created)
- **4.1**: Consent management interface foundation (navigation and layout ready)
- **5.1**: Record access interface foundation (records page created)