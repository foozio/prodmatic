# ProdMatic - Production-Ready Product Management Platform

**A comprehensive product lifecycle management platform from ideation to sunset.**

ProdMatic is a full-stack web application built with Next.js 14, TypeScript, and modern web technologies. It provides product managers with everything they need to manage products through their entire lifecycle: ideation → discovery → definition → delivery → launch → growth → maturity → sunset.

## 🚀 Features

### Core Functionality
- **Multi-tenant Architecture**: Organizations, teams, and role-based access control
- **Product Lifecycle Management**: Track products through all stages with proper workflows
- **Idea Management**: Intake, scoring (RICE/WSJF/ICE), prioritization, and conversion
- **Discovery Tools**: Customer interviews, personas, insights extraction
- **Definition Phase**: PRD/RFC builder with approval gates and versioning
- **Delivery Management**: Kanban boards, Sprint management, backlog grooming
- **Roadmap Planning**: Timeline views with drag-and-drop, OKR management
- **Release Management**: Release composer, changelogs, launch checklists
- **Analytics & Growth**: KPI dashboards, experiment tracking, feature flags
- **Sunset Planning**: EOL tracking, migration planning, data retention

### Advanced Features
- **Authentication**: Email/password, Google OAuth, GitHub OAuth with NextAuth
- **Real-time Updates**: Server components with optimistic updates
- **File Storage**: Document management and template system
- **Rich Text Editor**: Markdown support for documents and PRDs
- **Data Export**: CSV and PDF export for all major entities
- **Integration Stubs**: GitHub, Jira, Slack integration capabilities
- **Audit Logging**: Complete activity tracking and audit trails
- **Feature Flags**: Gradual rollouts and A/B testing support

## 🛠 Tech Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: TailwindCSS + shadcn/ui components
- **Icons**: Lucide React
- **State Management**: React Server Components + TanStack Query
- **Forms**: React Hook Form + Zod validation
- **Drag & Drop**: @dnd-kit
- **Charts**: Recharts
- **Animation**: Framer Motion

### Backend
- **Runtime**: Node.js
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js
- **Email**: Resend (production) / Nodemailer (development)
- **PDF Generation**: @react-pdf/renderer

### Development & Deployment
- **Package Manager**: npm
- **Testing**: Vitest + React Testing Library + Playwright
- **Linting**: ESLint + Prettier
- **Git Hooks**: Husky + lint-staged
- **CI/CD**: GitHub Actions
- **Deployment**: Vercel-ready

## 📋 Prerequisites

- Node.js 18+ and npm
- PostgreSQL database (local or hosted)

## 🚀 Quick Start

### 1. Clone and Install

```bash
git clone https://github.com/your-username/prodmatic.git
cd prodmatic
npm install
```

### 2. Environment Setup

```bash
cp .env.example .env.local
```

Edit `.env.local` with your configuration:

```env
# Database (required)
DATABASE_URL="postgresql://postgres:password@localhost:5432/prodmatic"

# NextAuth (required)
NEXTAUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"

# OAuth Providers (optional)
GITHUB_ID="your-github-client-id"
GITHUB_SECRET="your-github-client-secret"
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Supabase (optional)
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_ANON_KEY="your-supabase-anon-key"

# Email (optional)
RESEND_API_KEY="your-resend-api-key"
```

### 3. Database Setup

```bash
# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:migrate

# Seed with sample data
npm run db:seed
```

### 4. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in with:
- **Email**: `alice@prodmatic.com`
- **Password**: `password123`

## 📁 Project Structure

```
prodmatic/
├── src/
│   ├── app/                 # Next.js App Router pages
│   │   ├── api/            # API routes
│   │   ├── auth/           # Authentication pages
│   │   ├── orgs/           # Organization-scoped routes
│   │   └── [orgSlug]/      # Dynamic organization routes
│   ├── components/         # Reusable UI components
│   │   └── ui/            # shadcn/ui components
│   ├── lib/               # Utility functions and configs
│   ├── server/            # Server actions and services
│   ├── types/             # TypeScript type definitions
│   └── test/              # Test utilities
├── prisma/                # Database schema and migrations
│   ├── schema.prisma      # Prisma schema
│   └── migrations/        # Database migrations
├── scripts/              # Utility scripts
│   ├── seed.ts           # Sample data seeder
│   └── update-changelog.js # Changelog management
├── templates/            # Document templates
├── e2e/                  # End-to-end tests
├── docs/                 # Documentation
└── public/               # Static assets
```

## 🧪 Testing

```bash
# Unit tests
npm run test

# Unit tests with UI
npm run test:ui

# E2E tests
npm run test:e2e

# Type checking
npm run typecheck

# Linting
npm run lint

# Code formatting
npm run format
```

## 📋 Sample Data

The seed script creates:
- 4 demo user accounts with different roles
- 2 sample organizations (TechCorp Solutions, Demo Company)
- 3 sample products with complete lifecycle data
- Ideas, epics, features, sprints, and releases
- OKRs, KPIs, experiments, and feedback

**Demo Accounts:**
- Admin: `alice@prodmatic.com` / `password123`
- Product Manager: `bob@prodmatic.com` / `password123`
- Developer: `carol@prodmatic.com` / `password123`
- Stakeholder: `david@prodmatic.com` / `password123`

## 🚀 Deployment

**📖 For comprehensive deployment instructions, see [DEPLOYMENT_GUIDE.md](./docs/DEPLOYMENT_GUIDE.md)**

### Quick Start Options

#### Option 1: Vercel + Supabase (Recommended)

1. **Deploy to Vercel**: Connect GitHub repo, configure env vars, auto-deploy
2. **Database**: Use Supabase PostgreSQL or your preferred provider
3. **Domain**: Configure custom domain and SSL

#### Option 2: Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose -f docker-compose.prod.yml up -d

# Run migrations
docker-compose exec app npx prisma migrate deploy
```

#### Option 3: Cloud Platforms

- **AWS**: App Runner, ECS Fargate, or EC2
- **Google Cloud**: Cloud Run or Compute Engine  
- **Azure**: Container Instances or App Service

### Essential Environment Variables

For production deployments, reference the comprehensive environment template:
- **[Production Environment Template](./.env.production.example)** - Complete template with all environment variables and security best practices

```env
# Core (Required)
DATABASE_URL=postgresql://user:pass@host:port/db
NEXTAUTH_SECRET=your-32-char-secret
NEXTAUTH_URL=https://your-domain.com

# Email (Required for notifications)
RESEND_API_KEY=your-resend-key

# OAuth (Optional)
GITHUB_ID=your-github-client-id
GITHUB_SECRET=your-github-secret
```

**⚠️ See the [Deployment Guide](./docs/DEPLOYMENT_GUIDE.md) for detailed instructions, security configuration, monitoring setup, and troubleshooting.**

**📋 Use the [Deployment Checklist](./docs/DEPLOYMENT_CHECKLIST.md) to ensure nothing is missed during production deployment.**

## 🔧 Configuration

### Authentication Providers

Configure OAuth providers in `src/lib/auth.ts`. Supported providers:
- Email/Password (built-in)
- Google OAuth
- GitHub OAuth

### Database Schema

The Prisma schema includes 25+ entities covering:
- User management and authentication
- Multi-tenant organization structure
- Complete product lifecycle entities
- Analytics and reporting data
- Integration and webhook support

## 📊 Analytics & Monitoring

### Built-in Features
- User activity tracking
- Product lifecycle metrics
- KPI dashboard and visualization
- Experiment tracking and A/B testing
- Comprehensive audit logging

### Health Check
Endpoint available at `/api/health` for monitoring.

## 🛡️ Security

- **Authentication**: Secure session management with NextAuth
- **Authorization**: Role-based access control (RBAC)
- **Data Validation**: Zod schemas for all inputs
- **Audit Logging**: Complete activity tracking
- **Multi-tenant Security**: Organization-level data isolation

## 📝 Changelog

We maintain a detailed changelog following [Keep a Changelog](https://keepachangelog.com/) format.

### Updating the Changelog

```bash
# Add new changelog entry
npm run changelog:add [version] [type] "[description]"

# Example: Bug fix
npm run changelog:add 1.0.1 fixed "Fixed authentication redirect issue"

# Example: New feature
npm run changelog:add 1.1.0 added "Added dashboard analytics feature"
```

**Change Types:** `added`, `changed`, `deprecated`, `removed`, `fixed`, `security`

See [CHANGELOG.md](./CHANGELOG.md) for full version history and [docs/CHANGELOG_GUIDE.md](./docs/CHANGELOG_GUIDE.md) for detailed guidelines.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. **Update the changelog**: `npm run changelog:add 1.x.x added "Amazing feature description"`
5. Push to branch: `git push origin feature/amazing-feature`
6. Open a Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Write tests for new features
- Use conventional commit messages
- Ensure code passes linting and formatting
- Update documentation and changelog

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📚 Documentation

- **[Deployment Guide](./docs/DEPLOYMENT_GUIDE.md)** - Comprehensive deployment instructions for all platforms
- **[Deployment Checklist](./docs/DEPLOYMENT_CHECKLIST.md)** - Step-by-step checklist for production deployments
- **[Changelog Guide](./docs/CHANGELOG_GUIDE.md)** - Guidelines for maintaining version history
- **[System Architecture](./docs/ARCHITECTURE.md)** - Detailed system architecture and design patterns
- **[Production Environment Example](./.env.production.example)** - Template for production environment variables

## 🆘 Support

- **Documentation**: Check the `/docs` folder for detailed guides
- **Issues**: Report bugs and request features on GitHub Issues
- **Changelog**: See [CHANGELOG.md](./CHANGELOG.md) for version history

## 🗺️ Current Status

ProdMatic v1.0.0 is a complete, production-ready product management platform with:

✅ **Complete Feature Set**
- Full product lifecycle management
- Multi-tenant architecture with RBAC
- Comprehensive testing infrastructure
- CI/CD pipelines and deployment automation
- Extensive documentation and sample data

✅ **Production Ready**
- Scalable architecture
- Security best practices
- Performance optimizations
- Monitoring and analytics
- Comprehensive error handling

---

## 🧑‍💻 Creator

**Nuzli L. Hernawan**
- LinkedIn: [https://www.linkedin.com/in/nuzlilatief](https://www.linkedin.com/in/nuzlilatief)
- GitHub: [https://github.com/foozio](https://github.com/foozio)

---

**Built with ❤️ for product teams everywhere**
