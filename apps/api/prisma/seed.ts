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

  await prisma.followUp.deleteMany({ where: { userId: user.id } });
  await prisma.interviewNote.deleteMany({ where: { userId: user.id } });
  await prisma.interview.deleteMany({ where: { userId: user.id } });
  await prisma.contact.deleteMany({ where: { userId: user.id } });
  await prisma.application.deleteMany({ where: { userId: user.id } });
  await prisma.company.deleteMany({ where: { userId: user.id } });

  const northstar = await prisma.company.create({
    data: {
      userId: user.id,
      name: "Northstar Systems",
      website: "https://northstarsystems.dev",
      industry: "Developer Tools",
      location: "Remote",
      notes: "Strong platform engineering team."
    }
  });

  const lattice = await prisma.company.create({
    data: {
      userId: user.id,
      name: "LatticeWorks",
      website: "https://latticeworks.io",
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
      jobUrl: "https://northstarsystems.dev/careers/senior-full-stack-engineer",
      source: "Talent contact outreach",
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
      jobUrl: "https://latticeworks.io/careers/platform-engineer",
      source: "Company careers page",
      stage: "SAVED",
      remoteMode: "HYBRID",
      priority: "MEDIUM",
      confidence: 3,
      nextAction: "Customize application materials."
    }
  });

  const northstarContact = await prisma.contact.create({
    data: {
        userId: user.id,
        companyId: northstar.id,
        applicationId: activeApplication.id,
        name: "Jamie Carter",
        role: "Talent Partner",
        email: "jamie.carter@northstarsystems.dev",
        linkedinUrl: "https://linkedin.com/in/jamie-carter-talent",
        notes: "Prefers concise email updates."
      }
  });

  const latticeContact = await prisma.contact.create({
    data: {
        userId: user.id,
        companyId: lattice.id,
        applicationId: savedApplication.id,
        name: "Morgan Lee",
        role: "Engineering Manager",
        email: "morgan.lee@latticeworks.io",
        notes: "Engineering contact for the platform team."
      }
  });

  const interview = await prisma.interview.create({
    data: {
      userId: user.id,
      applicationId: activeApplication.id,
      roundName: "Architecture Screen",
      roundNumber: 2,
      type: "SYSTEM_DESIGN",
      format: "VIDEO",
      scheduledAt: new Date(Date.now() + 1000 * 60 * 60 * 48),
      durationMinutes: 60,
      interviewers: "Engineering Manager, Staff Engineer",
      expectedTopics: "API design, Postgres data modeling, scaling read-heavy dashboards.",
      prepNotes: "Use Interview OS as the system design anchor.",
      rawPostInterviewNotes: "",
      outcome: "SCHEDULED"
    }
  });

  await prisma.interviewNote.createMany({
    data: [
      {
        userId: user.id,
        interviewId: interview.id,
        type: "PREP",
        body: "Prepare concise tradeoff language for caching, database indexes, and queue boundaries."
      },
      {
        userId: user.id,
        interviewId: interview.id,
        type: "RAW_POST_INTERVIEW",
        body: "Placeholder for notes pasted after the interview."
      }
    ]
  });

  await prisma.followUp.createMany({
    data: [
      {
        userId: user.id,
        applicationId: activeApplication.id,
        contactId: northstarContact.id,
        interviewId: interview.id,
        title: "Send architecture screen thank-you",
        dueAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
        priority: "HIGH",
        type: "THANK_YOU",
        notes: "Reference the API design discussion and reiterate interest."
      },
      {
        userId: user.id,
        applicationId: savedApplication.id,
        contactId: latticeContact.id,
        title: "Check in on platform role",
        dueAt: new Date(Date.now() + 1000 * 60 * 60 * 72),
        priority: "MEDIUM",
        type: "CHECK_IN",
        notes: "Ask whether the team has started reviewing candidates."
      },
      {
        userId: user.id,
        applicationId: activeApplication.id,
        title: "Review system design prep list",
        dueAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
        completedAt: new Date(Date.now() - 1000 * 60 * 60 * 12),
        priority: "LOW",
        type: "PREP_TASK",
        notes: "Completed before the architecture screen."
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
