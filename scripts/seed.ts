import { PrismaClient } from "@prisma/client";
import { hashPassword } from "@/lib/auth-helpers";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting seed data creation...");

  // Clear existing data (be careful in production!)
  console.log("🗑️  Clearing existing data...");
  await prisma.auditLog.deleteMany();
  await prisma.webhook.deleteMany();
  await prisma.announcement.deleteMany();
  await prisma.feedback.deleteMany();
  await prisma.document.deleteMany();
  await prisma.dependency.deleteMany();
  await prisma.risk.deleteMany();
  await prisma.featureFlag.deleteMany();
  await prisma.changelog.deleteMany();
  await prisma.release.deleteMany();
  await prisma.roadmapItem.deleteMany();
  await prisma.experiment.deleteMany();
  await prisma.kPI.deleteMany();
  await prisma.keyResult.deleteMany();
  await prisma.oKR.deleteMany();
  await prisma.task.deleteMany();
  await prisma.sprint.deleteMany();
  await prisma.feature.deleteMany();
  await prisma.epic.deleteMany();
  await prisma.insight.deleteMany();
  await prisma.competitor.deleteMany();
  await prisma.interview.deleteMany();
  await prisma.persona.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.idea.deleteMany();
  await prisma.sunsetPlan.deleteMany();
  await prisma.product.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.team.deleteMany();
  await prisma.invitation.deleteMany();
  await prisma.organization.deleteMany();
  await prisma.userProfile.deleteMany();
  await prisma.account.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();

  // Create Users
  console.log("👥 Creating users...");
  const hashedPassword = await hashPassword("password123");
  
  const adminUser = await prisma.user.create({
    data: {
      id: "admin-user-1",
      name: "Alice Johnson",
      email: "alice@prodmatic.com",
      password: hashedPassword,
      emailVerified: new Date(),
      profile: {
        create: {
          bio: "Product strategy expert with 10+ years experience",
          title: "Chief Product Officer",
          timezone: "America/Los_Angeles",
        },
      },
    },
  });

  const pmUser = await prisma.user.create({
    data: {
      id: "pm-user-1",
      name: "Bob Smith",
      email: "bob@prodmatic.com",
      password: hashedPassword,
      emailVerified: new Date(),
      profile: {
        create: {
          bio: "Senior Product Manager focused on user experience",
          title: "Senior Product Manager",
          timezone: "America/New_York",
        },
      },
    },
  });

  const devUser = await prisma.user.create({
    data: {
      id: "dev-user-1",
      name: "Carol Wang",
      email: "carol@prodmatic.com",
      password: hashedPassword,
      emailVerified: new Date(),
      profile: {
        create: {
          bio: "Full-stack developer and tech lead",
          title: "Senior Software Engineer",
          timezone: "America/Los_Angeles",
        },
      },
    },
  });

  const stakeholderUser = await prisma.user.create({
    data: {
      id: "stakeholder-user-1",
      name: "David Chen",
      email: "david@prodmatic.com",
      password: hashedPassword,
      emailVerified: new Date(),
      profile: {
        create: {
          bio: "Executive stakeholder and business analyst",
          title: "Business Analyst",
          timezone: "America/Chicago",
        },
      },
    },
  });

  // Create Organizations
  console.log("🏢 Creating organizations...");
  const organization = await prisma.organization.create({
    data: {
      name: "TechCorp Solutions",
      slug: "techcorp",
      domain: "techcorp.com",
      description: "Innovative technology solutions for modern businesses",
      settings: {
        branding: {
          primaryColor: "#2563eb",
          logo: "/logos/techcorp.png",
        },
        features: {
          roadmapEnabled: true,
          analyticsEnabled: true,
          integrationsEnabled: true,
        },
      },
    },
  });

  const demoOrganization = await prisma.organization.create({
    data: {
      name: "Demo Company",
      slug: "demo",
      domain: "demo.com",
      description: "Sample organization for demonstration purposes",
      settings: {
        branding: {
          primaryColor: "#059669",
          logo: "/logos/demo.png",
        },
        features: {
          roadmapEnabled: true,
          analyticsEnabled: false,
          integrationsEnabled: false,
        },
      },
    },
  });

  // Create Teams
  console.log("🏗️ Creating teams...");
  const engineeringTeam = await prisma.team.create({
    data: {
      name: "Engineering",
      slug: "engineering",
      description: "Software development and technical implementation",
      organizationId: organization.id,
    },
  });

  const productTeam = await prisma.team.create({
    data: {
      name: "Product",
      slug: "product",
      description: "Product strategy and user experience",
      organizationId: organization.id,
    },
  });

  const designTeam = await prisma.team.create({
    data: {
      name: "Design",
      slug: "design",
      description: "User interface and experience design",
      organizationId: organization.id,
    },
  });

  // Create Memberships
  console.log("🤝 Creating memberships...");
  await prisma.membership.createMany({
    data: [
      {
        userId: adminUser.id,
        organizationId: organization.id,
        role: "ADMIN",
      },
      {
        userId: pmUser.id,
        organizationId: organization.id,
        teamId: productTeam.id,
        role: "PRODUCT_MANAGER",
      },
      {
        userId: devUser.id,
        organizationId: organization.id,
        teamId: engineeringTeam.id,
        role: "CONTRIBUTOR",
      },
      {
        userId: stakeholderUser.id,
        organizationId: organization.id,
        role: "STAKEHOLDER",
      },
    ],
  });

  // Create Products
  console.log("📦 Creating products...");
  const mobileApp = await prisma.product.create({
    data: {
      name: "TaskFlow Mobile",
      key: "taskflow-mobile",
      description: "Mobile task management application for teams",
      vision: "Empower teams to collaborate seamlessly on mobile devices",
      lifecycle: "DELIVERY",
      organizationId: organization.id,
      settings: {
        notifications: {
          emailEnabled: true,
          slackEnabled: false,
        },
        integrations: {
          jiraEnabled: false,
          githubEnabled: true,
        },
      },
      metrics: {
        monthlyActiveUsers: 15000,
        retention: 0.82,
        nps: 42,
      },
    },
  });

  const webPlatform = await prisma.product.create({
    data: {
      name: "TaskFlow Web Platform",
      key: "taskflow-web",
      description: "Comprehensive web-based project management platform",
      vision: "Create the most intuitive project management experience",
      lifecycle: "GROWTH",
      organizationId: organization.id,
      settings: {
        notifications: {
          emailEnabled: true,
          slackEnabled: true,
        },
        integrations: {
          jiraEnabled: true,
          githubEnabled: true,
        },
      },
      metrics: {
        monthlyActiveUsers: 45000,
        retention: 0.91,
        nps: 67,
      },
    },
  });

  const apiProduct = await prisma.product.create({
    data: {
      name: "TaskFlow API",
      key: "taskflow-api",
      description: "Developer API for TaskFlow integrations",
      vision: "Enable seamless third-party integrations",
      lifecycle: "MATURITY",
      organizationId: organization.id,
      settings: {
        notifications: {
          emailEnabled: true,
          slackEnabled: false,
        },
        integrations: {
          jiraEnabled: false,
          githubEnabled: true,
        },
      },
      metrics: {
        monthlyActiveUsers: 2500,
        retention: 0.95,
        nps: 78,
      },
    },
  });

  // Create Customers
  console.log("🎯 Creating customers...");
  const enterpriseCustomer = await prisma.customer.create({
    data: {
      name: "Acme Corporation",
      email: "contact@acme.com",
      company: "Acme Corp",
      segment: "Enterprise",
      tier: "ENTERPRISE",
      status: "ACTIVE",
      productId: webPlatform.id,
      attributes: {
        contractValue: 25000,
        teamSize: 150,
        industry: "Technology",
      },
    },
  });

  const startupCustomer = await prisma.customer.create({
    data: {
      name: "StartupXYZ",
      email: "hello@startupxyz.com",
      company: "StartupXYZ",
      segment: "SMB",
      tier: "BUSINESS",
      status: "ACTIVE",
      productId: mobileApp.id,
      attributes: {
        contractValue: 2400,
        teamSize: 12,
        industry: "Fintech",
      },
    },
  });

  await prisma.customer.create({
    data: {
      name: "Global Enterprises",
      email: "procurement@globalent.com",
      company: "Global Enterprises Inc",
      segment: "Enterprise",
      tier: "ENTERPRISE",
      status: "PROSPECT",
      productId: webPlatform.id,
      attributes: {
        potentialValue: 50000,
        teamSize: 500,
        industry: "Manufacturing",
      },
    },
  });

  // Create Personas
  console.log("🎭 Creating personas...");
  await prisma.persona.createMany({
    data: [
      {
        name: "Project Manager Paul",
        description: "Experienced project manager overseeing multiple teams",
        goals: [
          "Track project progress efficiently",
          "Improve team collaboration",
          "Meet deadlines consistently",
        ],
        pains: [
          "Too many tools to manage",
          "Lack of real-time visibility",
          "Difficulty in resource allocation",
        ],
        gains: [
          "Streamlined workflow",
          "Better team communication",
          "Data-driven decisions",
        ],
        demographics: {
          age: "35-45",
          experience: "8-15 years",
          teamSize: "10-50 people",
        },
        behaviors: {
          techSavvy: "medium",
          mobileFriendly: true,
          preferredCommunication: "email",
        },
        productId: webPlatform.id,
      },
      {
        name: "Developer Dana",
        description: "Full-stack developer working on agile teams",
        goals: [
          "Focus on coding without distractions",
          "Clear task prioritization",
          "Seamless CI/CD integration",
        ],
        pains: [
          "Context switching between tools",
          "Unclear requirements",
          "Frequent interruptions",
        ],
        gains: [
          "Integrated development workflow",
          "Real-time updates",
          "Automation capabilities",
        ],
        demographics: {
          age: "25-35",
          experience: "3-8 years",
          teamSize: "5-15 people",
        },
        behaviors: {
          techSavvy: "high",
          mobileFriendly: false,
          preferredCommunication: "slack",
        },
        productId: mobileApp.id,
      },
    ],
  });

  // Create Ideas
  console.log("💡 Creating ideas...");
  const ideas = await prisma.idea.createMany({
    data: [
      {
        title: "Dark Mode Support",
        description: "Add dark mode theme option for better user experience during night usage",
        problem: "Users report eye strain during night usage of the application",
        hypothesis: "Dark mode will reduce eye strain and improve user satisfaction",
        source: "User Feedback",
        tags: ["ui", "accessibility", "user-experience"],
        votes: 23,
        effortScore: 3,
        impactScore: 4,
        reachScore: 5,
        confidenceScore: 4,
        priority: "HIGH",
        status: "APPROVED",
        productId: mobileApp.id,
        creatorId: pmUser.id,
      },
      {
        title: "Advanced Search Filters",
        description: "Implement advanced filtering options for task search and discovery",
        problem: "Users have difficulty finding specific tasks in large projects",
        hypothesis: "Better search will improve productivity and user satisfaction",
        source: "User Interview",
        tags: ["search", "productivity", "features"],
        votes: 18,
        effortScore: 4,
        impactScore: 4,
        reachScore: 4,
        confidenceScore: 3,
        priority: "MEDIUM",
        status: "UNDER_REVIEW",
        productId: webPlatform.id,
        creatorId: devUser.id,
      },
      {
        title: "Real-time Collaboration",
        description: "Enable real-time collaborative editing and commenting on tasks",
        problem: "Team members lose context when working on shared tasks",
        hypothesis: "Real-time collaboration will improve team efficiency",
        source: "Internal Request",
        tags: ["collaboration", "real-time", "features"],
        votes: 31,
        effortScore: 5,
        impactScore: 5,
        reachScore: 4,
        confidenceScore: 3,
        priority: "HIGH",
        status: "SUBMITTED",
        productId: webPlatform.id,
        creatorId: pmUser.id,
      },
    ],
  });

  // Create Epics
  console.log("📚 Creating epics...");
  const userExperienceEpic = await prisma.epic.create({
    data: {
      title: "Enhanced User Experience",
      description: "Improve overall user experience across the platform",
      goal: "Increase user satisfaction and reduce churn",
      hypothesis: "Better UX will lead to higher retention and NPS scores",
      acceptanceCriteria: "User satisfaction score > 4.5, NPS > 50",
      priority: "HIGH",
      status: "IN_PROGRESS",
      effort: 21,
      businessValue: 85,
      productId: mobileApp.id,
      assigneeId: pmUser.id,
    },
  });

  const performanceEpic = await prisma.epic.create({
    data: {
      title: "Performance Optimization",
      description: "Optimize application performance and loading times",
      goal: "Achieve sub-2-second page load times",
      hypothesis: "Faster loading will improve user engagement",
      acceptanceCriteria: "Page load time < 2s, Time to interactive < 3s",
      priority: "HIGH",
      status: "NEW",
      effort: 13,
      businessValue: 70,
      productId: webPlatform.id,
      assigneeId: devUser.id,
    },
  });

  // Create Features
  console.log("⚡ Creating features...");
  await prisma.feature.createMany({
    data: [
      {
        title: "Dark Mode Toggle",
        description: "Add dark mode toggle in user settings",
        acceptanceCriteria: "Users can switch between light and dark themes",
        priority: "HIGH",
        status: "IN_PROGRESS",
        effort: 5,
        epicId: userExperienceEpic.id,
        productId: mobileApp.id,
        assigneeId: devUser.id,
      },
      {
        title: "Improved Navigation",
        description: "Redesign navigation for better usability",
        acceptanceCriteria: "Navigation is intuitive and accessible",
        priority: "MEDIUM",
        status: "NEW",
        effort: 8,
        epicId: userExperienceEpic.id,
        productId: mobileApp.id,
        assigneeId: pmUser.id,
      },
      {
        title: "Database Query Optimization",
        description: "Optimize slow database queries",
        acceptanceCriteria: "All queries execute in < 100ms",
        priority: "HIGH",
        status: "NEW",
        effort: 8,
        epicId: performanceEpic.id,
        productId: webPlatform.id,
        assigneeId: devUser.id,
      },
    ],
  });

  // Create Sprints
  console.log("🏃 Creating sprints...");
  const currentSprint = await prisma.sprint.create({
    data: {
      name: "Sprint 24.1",
      goal: "Complete dark mode implementation and performance improvements",
      startDate: new Date("2024-01-15"),
      endDate: new Date("2024-01-29"),
      capacity: 40,
      status: "ACTIVE",
      productId: mobileApp.id,
    },
  });

  const nextSprint = await prisma.sprint.create({
    data: {
      name: "Sprint 24.2",
      goal: "Navigation improvements and user testing",
      startDate: new Date("2024-01-30"),
      endDate: new Date("2024-02-13"),
      capacity: 40,
      status: "PLANNED",
      productId: mobileApp.id,
    },
  });

  // Create OKRs
  console.log("🎯 Creating OKRs...");
  const q1OKR = await prisma.oKR.create({
    data: {
      objective: "Improve User Engagement Q1 2024",
      description: "Focus on increasing user engagement and satisfaction",
      quarter: "Q1",
      year: 2024,
      status: "ACTIVE",
      productId: mobileApp.id,
      ownerId: pmUser.id,
    },
  });

  await prisma.keyResult.createMany({
    data: [
      {
        description: "Grow DAU by 25% compared to Q4 2023",
        type: "INCREASE",
        target: 25000,
        current: 18500,
        unit: "users",
        status: "ACTIVE",
        okrId: q1OKR.id,
      },
      {
        description: "Achieve 85% 7-day retention rate",
        type: "INCREASE",
        target: 85,
        current: 78,
        unit: "%",
        status: "ACTIVE",
        okrId: q1OKR.id,
      },
      {
        description: "Decrease support tickets by 30%",
        type: "DECREASE",
        target: 30,
        current: 15,
        unit: "%",
        status: "AT_RISK",
        okrId: q1OKR.id,
      },
    ],
  });

  // Create KPIs
  console.log("📊 Creating KPIs...");
  await prisma.kPI.createMany({
    data: [
      {
        name: "Monthly Active Users",
        description: "Number of unique users who engage with the product monthly",
        metric: "Monthly Active Users",
        target: 50000,
        currentValue: 45000,
        unit: "users",
        frequency: "MONTHLY",
        isActive: true,
        category: "Growth",
        productId: webPlatform.id,
        ownerId: pmUser.id,
      },
      {
        name: "Customer Satisfaction Score",
        description: "Average customer satisfaction rating",
        metric: "CSAT",
        target: 4.5,
        currentValue: 4.2,
        unit: "rating",
        frequency: "WEEKLY",
        isActive: true,
        category: "Satisfaction",
        productId: mobileApp.id,
        ownerId: pmUser.id,
      },
      {
        name: "API Response Time",
        description: "Average API response time across all endpoints",
        metric: "Response Time",
        target: 150,
        currentValue: 180,
        unit: "ms",
        frequency: "DAILY",
        isActive: true,
        category: "Performance",
        productId: apiProduct.id,
        ownerId: devUser.id,
      },
    ],
  });

  // Create Releases
  console.log("🚀 Creating releases...");
  const v2_1_0 = await prisma.release.create({
    data: {
      name: "Mobile App v2.1.0",
      version: "2.1.0",
      description: "Dark mode support and performance improvements",
      type: "MINOR",
      status: "PLANNED",
      releaseDate: new Date("2024-02-15"),
      notes: "Major UI improvements and performance optimizations",
      productId: mobileApp.id,
    },
  });

  const v1_5_0 = await prisma.release.create({
    data: {
      name: "Web Platform v1.5.0",
      version: "1.5.0",
      description: "Advanced search and filtering capabilities",
      type: "MINOR",
      status: "IN_PROGRESS",
      releaseDate: new Date("2024-01-30"),
      notes: "Enhanced search functionality and new filtering options",
      productId: webPlatform.id,
    },
  });

  // Create Changelogs
  console.log("📝 Creating changelogs...");
  await prisma.changelog.createMany({
    data: [
      {
        title: "Dark Mode Support",
        description: "Added dark mode toggle in user settings for better night usage",
        type: "FEATURE",
        visibility: "PUBLIC",
        releaseId: v2_1_0.id,
        productId: mobileApp.id,
      },
      {
        title: "Performance Improvements",
        description: "Optimized loading times and reduced memory usage",
        type: "IMPROVEMENT",
        visibility: "PUBLIC",
        releaseId: v2_1_0.id,
        productId: mobileApp.id,
      },
      {
        title: "Fixed Task Sorting Bug",
        description: "Resolved issue where tasks were not sorting correctly by due date",
        type: "BUG_FIX",
        visibility: "PUBLIC",
        releaseId: v1_5_0.id,
        productId: webPlatform.id,
      },
    ],
  });

  // Create Feature Flags
  console.log("🏳️ Creating feature flags...");
  await prisma.featureFlag.createMany({
    data: [
      {
        name: "Dark Mode",
        key: "dark-mode",
        description: "Enable dark mode theme option",
        enabled: true,
        rollout: 0.5,
        productId: mobileApp.id,
      },
      {
        name: "Advanced Search",
        key: "advanced-search",
        description: "Enable advanced search filters",
        enabled: false,
        rollout: 0.0,
        productId: webPlatform.id,
      },
      {
        name: "Real-time Collaboration",
        key: "realtime-collab",
        description: "Enable real-time collaborative features",
        enabled: true,
        rollout: 0.1,
        productId: webPlatform.id,
      },
    ],
  });

  // Create Experiments
  console.log("🧪 Creating experiments...");
  await prisma.experiment.createMany({
    data: [
      {
        name: "Dark Mode A/B Test",
        description: "Test user preference for dark mode vs light mode",
        hypothesis: "Dark mode will increase user engagement",
        type: "AB_TEST",
        status: "RUNNING",
        startDate: new Date("2024-01-10"),
        endDate: new Date("2024-02-10"),
        metrics: ["session_duration", "completion_rate"],
        variants: [{ name: "Light Mode", weight: 0.5 }, { name: "Dark Mode", weight: 0.5 }],
        productId: mobileApp.id,
        ownerId: pmUser.id,
      },
      {
        name: "Search UX Test",
        description: "Compare different search interface designs",
        hypothesis: "Improved search UI will increase search usage",
        type: "MULTIVARIATE",
        status: "DRAFT",
        metrics: ["search_usage", "success_rate"],
        variants: [{ name: "Current", weight: 0.33 }, { name: "Simplified", weight: 0.33 }, { name: "Advanced", weight: 0.34 }],
        productId: webPlatform.id,
        ownerId: pmUser.id,
      },
    ],
  });

  // Create Documents
  console.log("📄 Creating documents...");
  await prisma.document.createMany({
    data: [
      {
        title: "TaskFlow Mobile PRD",
        content: "# Product Requirements Document\n\n## Vision\nCreate the most intuitive mobile task management experience...",
        type: "PRD",
        status: "PUBLISHED",
        version: 1,
        productId: mobileApp.id,
        authorId: pmUser.id,
      },
      {
        title: "Dark Mode Implementation RFC",
        content: "# Request for Comments: Dark Mode Implementation\n\n## Problem\nUsers request dark mode support...",
        type: "RFC",
        status: "APPROVED",
        version: 1,
        productId: mobileApp.id,
        authorId: devUser.id,
      },
      {
        title: "Q1 2024 Launch Plan",
        content: "# Q1 2024 Product Launch Plan\n\n## Objectives\n- Launch mobile app v2.1.0...",
        type: "LAUNCH_PLAN",
        status: "REVIEW",
        version: 1,
        productId: mobileApp.id,
        authorId: pmUser.id,
      },
    ],
  });

  // Create Feedback
  console.log("💬 Creating feedback...");
  await prisma.feedback.createMany({
    data: [
      {
        title: "Love the new search feature!",
        description: "The advanced search makes finding tasks so much easier. Great work!",
        source: "PORTAL",
        type: "COMPLIMENT",
        priority: "LOW",
        status: "SUBMITTED",
        rating: 5,
        productId: webPlatform.id,
        customerId: enterpriseCustomer.id,
      },
      {
        title: "Dark mode is too dark",
        description: "The dark mode is hard to read. Could you make it lighter?",
        source: "EMAIL",
        type: "IMPROVEMENT",
        priority: "MEDIUM",
        status: "UNDER_REVIEW",
        rating: 3,
        productId: mobileApp.id,
        customerId: startupCustomer.id,
      },
      {
        title: "App crashes on login",
        description: "The mobile app crashes every time I try to log in on iOS 17",
        source: "PORTAL",
        type: "BUG_REPORT",
        priority: "HIGH",
        status: "IN_PROGRESS",
        rating: 1,
        productId: mobileApp.id,
      },
    ],
  });

  console.log("✅ Seed data creation completed!");
  console.log(`
🎉 Successfully created:
- 4 Users (Admin, PM, Developer, Stakeholder)
- 2 Organizations (TechCorp, Demo)
- 3 Teams (Engineering, Product, Design)
- 3 Products (Mobile App, Web Platform, API)
- 3 Customers with different tiers
- 2 User Personas
- 3 Ideas with different statuses
- 2 Epics with features
- 3 Features
- 2 Sprints (current and planned)
- 1 OKR with 3 Key Results
- 3 KPIs across different categories
- 2 Releases with changelogs
- 3 Feature Flags
- 2 Experiments
- 3 Documents (PRD, RFC, Launch Plan)
- 3 Feedback items

🔗 Demo accounts:
- Admin: alice@prodmatic.com / password123
- PM: bob@prodmatic.com / password123
- Developer: carol@prodmatic.com / password123
- Stakeholder: david@prodmatic.com / password123

📊 Organizations:
- TechCorp Solutions (techcorp.com)
- Demo Company (demo.com)
  `);
}

main()
  .catch((e) => {
    console.error("❌ Error seeding data:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });