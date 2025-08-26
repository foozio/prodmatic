import { PrismaClient } from "@prisma/client";

const client = new PrismaClient();

async function verifyOrgCreation() {
  console.log("Testing organization creation...");
  
  try {
    // Test creating an organization with a team
    const org = await client.organization.create({
      data: {
        name: "Test Org",
        slug: "test-org",
        description: "Test organization"
      }
    });
    
    console.log("Organization created:", org);
    
    // Test creating a team for the organization
    const team = await client.team.create({
      data: {
        name: "General",
        slug: "general",
        description: "Default team for all organization members",
        organizationId: org.id,
      },
    });
    
    console.log("Team created:", team);
    
    console.log("✅ Organization creation test passed!");
    
    // Clean up
    await client.team.delete({ where: { id: team.id } });
    await client.organization.delete({ where: { id: org.id } });
    console.log("Cleaned up test data");
  } catch (error) {
    console.error("❌ Error in organization creation test:", error);
  } finally {
    await client.$disconnect();
  }
}

verifyOrgCreation();