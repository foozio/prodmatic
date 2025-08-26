import { PrismaClient } from "@prisma/client";
import { createOrganization } from "@/server/actions/organizations";

// Mock the getCurrentUser function to return a specific user
jest.mock("@/lib/auth-helpers", () => ({
  getCurrentUser: jest.fn().mockResolvedValue({
    id: "cmeqy38xx0000ph7m9214o09c",
    name: "Admin User",
    email: "admin@prodmatic.com",
    memberships: []
  })
}));

const prisma = new PrismaClient();

async function main() {
  console.log("Testing organization creation...");
  
  try {
    // Try to create an organization
    const result = await createOrganization({
      name: "Test Organization",
      description: "A test organization"
    });
    
    console.log("Result:", result);
  } catch (error) {
    console.error("Error creating organization:", error);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });