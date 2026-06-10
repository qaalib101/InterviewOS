import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const hour = 1000 * 60 * 60;
const day = hour * 24;

async function main() {
  if (process.env.ALLOW_DESTRUCTIVE_SEED !== "true") {
    throw new Error("Refusing to run destructive seed. Use pnpm db:seed:reset if you intentionally want to replace local data.");
  }

  const user = await prisma.user.upsert({
    where: { email: "local@interview-os.dev" },
    update: {},
    create: {
      email: "local@interview-os.dev",
      name: "Local User"
    }
  });

  await prisma.activityEvent.deleteMany({ where: { userId: user.id } });
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
      nextActionAt: new Date(Date.now() + day),
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
      scheduledAt: new Date(Date.now() + day * 2),
      durationMinutes: 60,
      interviewers: "Engineering Manager, Staff Engineer",
      expectedTopics: "API design, Postgres data modeling, scaling read-heavy dashboards.",
      prepNotes: "Use Interview OS as the system design anchor.",
      rawPostInterviewNotes: "",
      outcome: "SCHEDULED"
    }
  });

  const prepNote = await prisma.interviewNote.create({
    data: {
      userId: user.id,
      interviewId: interview.id,
      type: "PREP",
      body: "Prepare concise tradeoff language for caching, database indexes, and queue boundaries."
    }
  });

  await prisma.interviewNote.create({
    data: {
      userId: user.id,
      interviewId: interview.id,
      type: "RAW_POST_INTERVIEW",
      body: "Placeholder for notes pasted after the interview."
    }
  });

  const thankYou = await prisma.followUp.create({
    data: {
      userId: user.id,
      applicationId: activeApplication.id,
      contactId: northstarContact.id,
      interviewId: interview.id,
      title: "Send architecture screen thank-you",
      dueAt: new Date(Date.now() + day),
      priority: "HIGH",
      type: "THANK_YOU",
      notes: "Reference the API design discussion and reiterate interest."
    }
  });

  const checkIn = await prisma.followUp.create({
    data: {
      userId: user.id,
      applicationId: savedApplication.id,
      contactId: latticeContact.id,
      title: "Check in on platform role",
      dueAt: new Date(Date.now() + day * 3),
      priority: "MEDIUM",
      type: "CHECK_IN",
      notes: "Ask whether the team has started reviewing candidates."
    }
  });

  const prepTask = await prisma.followUp.create({
    data: {
      userId: user.id,
      applicationId: activeApplication.id,
      title: "Review system design prep list",
      dueAt: new Date(Date.now() - day),
      completedAt: new Date(Date.now() - hour * 12),
      priority: "LOW",
      type: "PREP_TASK",
      notes: "Completed before the architecture screen."
    }
  });

  await prisma.activityEvent.createMany({
    data: [
      {
        userId: user.id,
        entityType: "COMPANY",
        entityId: northstar.id,
        eventType: "CREATED",
        occurredAt: new Date(Date.now() - day * 7),
        metadata: { name: northstar.name }
      },
      {
        userId: user.id,
        entityType: "APPLICATION",
        entityId: activeApplication.id,
        eventType: "CREATED",
        occurredAt: new Date(Date.now() - day * 6),
        metadata: { roleTitle: activeApplication.roleTitle, companyName: northstar.name, stage: activeApplication.stage }
      },
      {
        userId: user.id,
        entityType: "CONTACT",
        entityId: northstarContact.id,
        eventType: "CREATED",
        occurredAt: new Date(Date.now() - day * 5),
        metadata: { name: northstarContact.name, companyName: northstar.name }
      },
      {
        userId: user.id,
        entityType: "APPLICATION",
        entityId: activeApplication.id,
        eventType: "STAGE_CHANGED",
        occurredAt: new Date(Date.now() - day * 3),
        metadata: { roleTitle: activeApplication.roleTitle, companyName: northstar.name, previousStage: "RECRUITER_SCREEN", stage: activeApplication.stage }
      },
      {
        userId: user.id,
        entityType: "INTERVIEW",
        entityId: interview.id,
        eventType: "CREATED",
        occurredAt: new Date(Date.now() - day * 2),
        metadata: { roundName: interview.roundName, roleTitle: activeApplication.roleTitle, companyName: northstar.name }
      },
      {
        userId: user.id,
        entityType: "INTERVIEW_NOTE",
        entityId: prepNote.id,
        eventType: "CREATED",
        occurredAt: new Date(Date.now() - day),
        metadata: { interviewId: interview.id, noteType: prepNote.type }
      },
      {
        userId: user.id,
        entityType: "FOLLOW_UP",
        entityId: thankYou.id,
        eventType: "CREATED",
        occurredAt: new Date(Date.now() - hour * 20),
        metadata: { title: thankYou.title, priority: thankYou.priority, dueAt: thankYou.dueAt.toISOString() }
      },
      {
        userId: user.id,
        entityType: "FOLLOW_UP",
        entityId: prepTask.id,
        eventType: "COMPLETED",
        occurredAt: new Date(Date.now() - hour * 12),
        metadata: { title: prepTask.title, priority: prepTask.priority }
      },
      {
        userId: user.id,
        entityType: "APPLICATION",
        entityId: savedApplication.id,
        eventType: "CREATED",
        occurredAt: new Date(Date.now() - hour * 6),
        metadata: { roleTitle: savedApplication.roleTitle, companyName: lattice.name, stage: savedApplication.stage }
      },
      {
        userId: user.id,
        entityType: "FOLLOW_UP",
        entityId: checkIn.id,
        eventType: "CREATED",
        occurredAt: new Date(Date.now() - hour * 2),
        metadata: { title: checkIn.title, priority: checkIn.priority, dueAt: checkIn.dueAt.toISOString() }
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
