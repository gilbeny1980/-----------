import { prisma } from "../src/lib/prisma";

async function main() {
  const electricianCount = await prisma.electrician.count();
  if (electricianCount === 0) {
    await prisma.electrician.createMany({
      data: [{ name: "משה כהן" }, { name: "דוד לוי" }],
    });
  }

  const transformerCount = await prisma.transformer.count();
  if (transformerCount === 0) {
    await prisma.transformer.createMany({
      data: [
        { name: "T1+2", order: 1 },
        { name: "T3", order: 2 },
        { name: "T4", order: 3 },
        { name: "T5", order: 4 },
        { name: "T6", order: 5 },
        { name: "T7", order: 6 },
        { name: "T8", order: 7 },
        { name: "T9", order: 8 },
        { name: "T10", order: 9 },
      ],
    });
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
