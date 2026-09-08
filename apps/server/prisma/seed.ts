import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Life-domain groupings ("where they fit") -- Tags starts empty so it's free
// for freeform attributes ("what I know about them").
const DEFAULT_CIRCLES = [
  { name: "Family", color: "#5C97CB" },
  { name: "Close Friends", color: "#3E7CB1" },
  { name: "Work", color: "#7FB1DE" },
  { name: "College", color: "#A9CBEE" },
  { name: "Mentors", color: "#2C5F8A" },
];

async function main() {
  for (const circle of DEFAULT_CIRCLES) {
    await prisma.circle.upsert({
      where: { name: circle.name },
      update: {},
      create: circle,
    });
  }
  console.log(`Seeded ${DEFAULT_CIRCLES.length} default circles.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
