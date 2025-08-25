import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/auth-helpers";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seed...");

  // Create sample users
  const hashedPassword = await hashPassword("password123");

  const adminUser = await prisma.user.upsert({
    where: { email: "admin@prodmatic.com" },
    update: {},
    create: {
      email: "admin@prodmatic.com",
      name: "Admin User",
      password: hashedPassword,
      emailVerified: new Date(),
      profile: {
        create: {
          bio: "Product management platform administrator",
          title: "Platform Admin",
          timezone: "UTC",
          locale: "en",
        },
      },
    },
  });

  const pmUser = await prisma.user.upsert({
    where: { email: "pm@prodmatic.com" },
    update: {},
    create: {
      email: "pm@prodmatic.com",
      name: "Product Manager",
      password: hashedPassword,
      emailVerified: new Date(),
      profile: {
        create: {
          bio: "Senior Product Manager with 5+ years experience",
          title: "Senior Product Manager",
          timezone: "America/New_York",
          locale: "en",
        },
      },
    },
  });

  const developerUser = await prisma.user.upsert({
    where: { email: "dev@prodmatic.com" },
    update: {},
    create: {
      email: "dev@prodmatic.com",
      name: "Developer",
      password: hashedPassword,
      emailVerified: new Date(),
      profile: {
        create: {
          bio: "Full-stack developer passionate about building great products",
          title: "Senior Software Engineer",
          timezone: "America/Los_Angeles",
          locale: "en",
        },
      },
    },
  });

  // Create sample organizations
  const organization = await prisma.organization.upsert({
    where: { slug: "acme-corp" },
    update: {},
    create: {
      name: "Acme Corp",
      slug: "acme-corp",
      description: "A technology company building the future",
      domain: "acme.com",
      settings: {
        allowPublicIdeas: true,
        defaultRole: "STAKEHOLDER",
      },
    },
  });

  const techCorpOrg = await prisma.organization.upsert({
    where: { slug: "techcorp" },
    update: {},
    create: {
      name: "TechCorp",
      slug: "techcorp",
      description: "A leading technology corporation focused on innovation",
      domain: "techcorp.com",
      settings: {
        allowPublicIdeas: true,
        defaultRole: "STAKEHOLDER",
      },
    },
  });

  // Create teams
  const engineeringTeam = await prisma.team.upsert({
    where: {
      organizationId_slug: {
        organizationId: organization.id,
        slug: "engineering",
      },
    },
    update: {},
    create: {
      name: "Engineering",
      slug: "engineering",
      description: "Product development and engineering team",
      organizationId: organization.id,
    },
  });

  const productTeam = await prisma.team.upsert({
    where: {
      organizationId_slug: {
        organizationId: organization.id,
        slug: "product",
      },
    },
    update: {},
    create: {
      name: "Product",
      slug: "product",
      description: "Product strategy and management team",
      organizationId: organization.id,
    },
  });

  // Create memberships
  await prisma.membership.upsert({
    where: {
      userId_organizationId: {
        userId: adminUser.id,
        organizationId: organization.id,
      },
    },
    update: {},
    create: {
      userId: adminUser.id,
      organizationId: organization.id,
      role: "ADMIN",
    },
  });

  await prisma.membership.upsert({
    where: {
      userId_organizationId: {
        userId: pmUser.id,
        organizationId: organization.id,
      },
    },
    update: {},
    create: {
      userId: pmUser.id,
      organizationId: organization.id,
      teamId: productTeam.id,
      role: "PRODUCT_MANAGER",
    },
  });

  await prisma.membership.upsert({
    where: {
      userId_organizationId: {
        userId: developerUser.id,
        organizationId: organization.id,
      },
    },
    update: {},
    create: {
      userId: developerUser.id,
      organizationId: organization.id,
      teamId: engineeringTeam.id,
      role: "CONTRIBUTOR",
    },
  });

  // Create teams for techcorp
  const techEngTeam = await prisma.team.upsert({
    where: {
      organizationId_slug: {
        organizationId: techCorpOrg.id,
        slug: "engineering",
      },
    },
    update: {},
    create: {
      name: "Engineering",
      slug: "engineering",
      description: "Product development and engineering team",
      organizationId: techCorpOrg.id,
    },
  });

  const techProductTeam = await prisma.team.upsert({
    where: {
      organizationId_slug: {
        organizationId: techCorpOrg.id,
        slug: "product",
      },
    },
    update: {},
    create: {
      name: "Product",
      slug: "product",
      description: "Product strategy and management team",
      organizationId: techCorpOrg.id,
    },
  });

  // Create memberships for techcorp
  await prisma.membership.upsert({
    where: {
      userId_organizationId: {
        userId: adminUser.id,
        organizationId: techCorpOrg.id,
      },
    },
    update: {},
    create: {
      userId: adminUser.id,
      organizationId: techCorpOrg.id,
      role: "ADMIN",
    },
  });

  await prisma.membership.upsert({
    where: {
      userId_organizationId: {
        userId: pmUser.id,
        organizationId: techCorpOrg.id,
      },
    },
    update: {},
    create: {
      userId: pmUser.id,
      organizationId: techCorpOrg.id,
      teamId: techProductTeam.id,
      role: "PRODUCT_MANAGER",
    },
  });

  await prisma.membership.upsert({
    where: {
      userId_organizationId: {
        userId: developerUser.id,
        organizationId: techCorpOrg.id,
      },
    },
    update: {},
    create: {
      userId: developerUser.id,
      organizationId: techCorpOrg.id,
      teamId: techEngTeam.id,
      role: "CONTRIBUTOR",
    },
  });

  // Create sample products
  const webAppProduct = await prisma.product.upsert({
    where: { key: "web-app" },
    update: {},
    create: {
      name: "Web Application",
      key: "web-app",
      description: "Customer-facing web application for our SaaS platform",
      vision: "To provide the most intuitive and powerful web interface for our users",
      lifecycle: "GROWTH",
      organizationId: organization.id,
      settings: {
        enableFeatureFlags: true,
        enableAnalytics: true,
      },
    },
  });

  const mobileAppProduct = await prisma.product.upsert({
    where: { key: "mobile-app" },
    update: {},
    create: {
      name: "Mobile App",
      key: "mobile-app",
      description: "iOS and Android mobile application",
      vision: "To bring our platform to mobile users with native experiences",
      lifecycle: "DELIVERY",
      organizationId: organization.id,
    },
  });

  // Create sample products for techcorp
  const techWebPlatform = await prisma.product.upsert({
    where: { key: "tech-platform" },
    update: {},
    create: {
      name: "Tech Platform",
      key: "tech-platform",
      description: "Advanced technology platform for enterprise solutions",
      vision: "To provide the most powerful and scalable technology platform",
      lifecycle: "GROWTH",
      organizationId: techCorpOrg.id,
      settings: {
        enableFeatureFlags: true,
        enableAnalytics: true,
      },
    },
  });

  const techAPIProduct = await prisma.product.upsert({
    where: { key: "tech-api" },
    update: {},
    create: {
      name: "Tech API",
      key: "tech-api",
      description: "RESTful API for third-party integrations",
      vision: "To enable seamless integrations with external systems",
      lifecycle: "MATURITY",
      organizationId: techCorpOrg.id,
    },
  });

  // Create sample ideas
  const ideas = [
    {
      title: "Dark Mode Support",
      description: "Add dark mode theme option for better user experience in low-light environments",
      problem: "Users complain about eye strain when using the app at night",
      hypothesis: "Dark mode will reduce eye strain and improve user satisfaction",
      source: "User feedback",
      tags: ["UI", "UX", "accessibility"],
      productId: webAppProduct.id,
      creatorId: pmUser.id,
      effortScore: 3,
      impactScore: 4,
      reachScore: 5,
      confidenceScore: 4,
      priority: "HIGH" as const,
    },
    {
      title: "Mobile Push Notifications",
      description: "Implement push notifications for important updates and reminders",
      problem: "Users miss important updates when they're not actively using the app",
      hypothesis: "Push notifications will increase user engagement and retention",
      source: "Analytics data",
      tags: ["mobile", "engagement", "notifications"],
      productId: mobileAppProduct.id,
      creatorId: developerUser.id,
      effortScore: 4,
      impactScore: 5,
      reachScore: 4,
      confidenceScore: 3,
      priority: "MEDIUM" as const,
    },
    {
      title: "Advanced Search Filters",
      description: "Add more granular search and filtering options",
      problem: "Users have difficulty finding specific content in large datasets",
      hypothesis: "Better search will improve user productivity and satisfaction",
      source: "Support tickets",
      tags: ["search", "productivity", "data"],
      productId: webAppProduct.id,
      creatorId: pmUser.id,
      effortScore: 5,
      impactScore: 3,
      reachScore: 3,
      confidenceScore: 4,
      priority: "LOW" as const,
    },
  ];

  for (const ideaData of ideas) {
    await prisma.idea.create({
      data: ideaData,
    });
  }

  // Create sample ideas for techcorp
  const techIdeas = [
    {
      title: "API Rate Limiting",
      description: "Implement smart rate limiting for API endpoints to prevent abuse",
      problem: "API abuse is causing performance issues for legitimate users",
      hypothesis: "Rate limiting will improve API performance and user experience",
      source: "Support tickets",
      tags: ["api", "performance", "security"],
      productId: techAPIProduct.id,
      creatorId: developerUser.id,
      effortScore: 4,
      impactScore: 5,
      reachScore: 4,
      confidenceScore: 5,
      priority: "HIGH" as const,
    },
    {
      title: "Real-time Analytics Dashboard",
      description: "Create a real-time analytics dashboard for platform monitoring",
      problem: "Lack of real-time visibility into platform performance",
      hypothesis: "Real-time dashboards will help teams respond faster to issues",
      source: "Internal feedback",
      tags: ["analytics", "dashboard", "monitoring"],
      productId: techWebPlatform.id,
      creatorId: pmUser.id,
      effortScore: 5,
      impactScore: 4,
      reachScore: 3,
      confidenceScore: 4,
      priority: "MEDIUM" as const,
    },
  ];

  for (const ideaData of techIdeas) {
    await prisma.idea.create({
      data: ideaData,
    });
  }

  // Create sample personas
  await prisma.persona.create({
    data: {
      name: "Enterprise Admin",
      description: "IT administrator managing the platform for their organization",
      goals: [
        "Efficiently manage user accounts and permissions",
        "Ensure data security and compliance",
        "Monitor system performance and usage",
      ],
      pains: [
        "Complex permission management",
        "Lack of detailed audit logs",
        "Difficulty in bulk operations",
      ],
      gains: [
        "Streamlined user management",
        "Comprehensive security controls",
        "Detailed reporting and analytics",
      ],
      demographics: {
        age: "35-50",
        experience: "5+ years in IT",
        location: "Global",
      },
      behaviors: {
        techSavvy: true,
        frequency: "Daily",
        devicePreference: "Desktop",
      },
      productId: webAppProduct.id,
    },
  });

  // Create sample customers
  await prisma.customer.create({
    data: {
      name: "John Smith",
      email: "john@enterprise.com",
      company: "Enterprise Solutions Inc",
      segment: "Enterprise",
      tier: "ENTERPRISE",
      status: "ACTIVE",
      attributes: {
        employeeCount: "500+",
        industry: "Technology",
        signupDate: "2023-01-15",
      },
      productId: webAppProduct.id,
    },
  });

  // Create sample KPIs
  const kpis = [
    {
      name: "Monthly Active Users",
      description: "Number of unique users who used the platform in the last 30 days",
      metric: "Active Users",
      target: 10000,
      currentValue: 8500,
      unit: "users",
      frequency: "MONTHLY",
      category: "Engagement",
      productId: webAppProduct.id,
      ownerId: pmUser.id,
    },
    {
      name: "Customer Satisfaction Score",
      description: "Average CSAT score from customer surveys",
      metric: "CSAT Score",
      target: 4.5,
      currentValue: 4.2,
      unit: "score",
      frequency: "QUARTERLY",
      category: "Satisfaction",
      productId: webAppProduct.id,
      ownerId: pmUser.id,
    },
  ];

  for (const kpiData of kpis) {
    await prisma.kPI.create({
      data: kpiData,
    });
  }

  // Create sample documents
  const documents = [
    {
      title: "Web Application PRD",
      content: "Product Requirements Document for the main web application",
      type: "PRD",
      status: "PUBLISHED",
      version: 1,
      productId: webAppProduct.id,
      authorId: pmUser.id,
    },
    {
      title: "Mobile App RFC",
      content: "Request for Comments on mobile app architecture",
      type: "RFC",
      status: "REVIEW",
      version: 1,
      productId: mobileAppProduct.id,
      authorId: developerUser.id,
    },
    {
      title: "API Integration Guide",
      content: "Documentation for third-party API integrations",
      type: "GUIDE",
      status: "PUBLISHED",
      version: 2,
      productId: techAPIProduct.id,
      authorId: developerUser.id,
    },
  ];

  for (const docData of documents) {
    await prisma.document.create({
      data: docData,
    });
  }

  console.log("✅ Database seeded successfully!");
  console.log("🔑 Login credentials:");
  console.log("   Email: admin@prodmatic.com");
  console.log("   Password: password123");
  console.log("🌐 Organizations: acme-corp, techcorp");
  console.log("📦 Sample products, ideas, and documents have been created for testing");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("❌ Seed failed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });