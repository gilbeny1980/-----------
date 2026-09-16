import { prisma } from "../src/lib/prisma";

async function main() {
  const count = await prisma.electrician.count();
  if (count > 0) return;

  await prisma.electrician.createMany({
    data: [{ name: "משה כהן" }, { name: "דוד לוי" }],
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
