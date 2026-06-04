import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.upsert({
    where: { email: "local@interview-os.dev" },
    update: {},
    create: {
      email: "local@interview-os.dev",
      name: "Local User"
    }
  });

  await prisma.contact.deleteMany({ where: { userId: user.id } });
  await prisma.application.deleteMany({ where: { userId: user.id } });
  await prisma.company.deleteMany({ where: { userId: user.id } });

  const northstar = await prisma.company.create({
    data: {
      userId: user.id,
      name: "Northstar Systems",
      website: "https://northstar.example",
      industry: "Developer Tools",
      location: "Remote",
      notes: "Strong platform engineering team."
    }
  });

  const lattice = await prisma.company.create({
    data: {
      userId: user.id,
      name: "LatticeWorks",
      website: "https://lattice.example",
      industry: "B2B SaaS",
      location: "Chicago, IL",
      notes: "Hybrid team with product-focused engineering culture."
    }
  });

  const activeApplication = await prisma.application.create({
    data: {
      userId: user.id,
      companyId: northstar.id,
      roleTitle: "Senior Full-Stack Engineer",
      jobUrl: "https://northstar.example/jobs/senior-full-stack",
      source: "Recruiter outreach",
      stage: "TECH_SCREEN",
      compensationMin: 150000,
      compensationMax: 180000,
      remoteMode: "REMOTE",
      priority: "HIGH",
      confidence: 4,
      concerns: "Need stronger system design examples.",
      nextAction: "Prepare architecture screen notes.",
      nextActionAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
      notes: "Imported as an existing process already in progress."
    }
  });

  const savedApplication = await prisma.application.create({
    data: {
      userId: user.id,
      companyId: lattice.id,
      roleTitle: "Platform Engineer",
      jobUrl: "https://lattice.example/careers/platform",
      source: "Company careers page",
      stage: "SAVED",
      remoteMode: "HYBRID",
      priority: "MEDIUM",
      confidence: 3,
      nextAction: "Customize application materials."
    }
  });

  await prisma.contact.createMany({
    data: [
      {
        userId: user.id,
        companyId: northstar.id,
        applicationId: activeApplication.id,
        name: "Jamie Carter",
        role: "Technical Recruiter",
        email: "jamie@example.com",
        linkedinUrl: "https://linkedin.com/in/example",
        notes: "Prefers concise email updates."
      },
      {
        userId: user.id,
        companyId: lattice.id,
        applicationId: savedApplication.id,
        name: "Morgan Lee",
        role: "Engineering Manager",
        email: "morgan@example.com",
        notes: "Potential hiring manager for platform team."
      }
    ]
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
