import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Checking database state...");
  
  // Check organizations
  const organizations = await prisma.organization.findMany();
  console.log("Organizations:", organizations);
  
  // Check users
  const users = await prisma.user.findMany({
    include: {
      memberships: {
        include: {
          organization: true
        }
      }
    }
  });
  console.log("Users:", users);
  
  // Check teams
  const teams = await prisma.team.findMany();
  console.log("Teams:", teams);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });