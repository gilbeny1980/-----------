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
        { name: "T1+2" },
        { name: "T3" },
        { name: "T4" },
        { name: "T5" },
        { name: "T6" },
        { name: "T7" },
        { name: "T8" },
        { name: "T9" },
        { name: "T10" },
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
