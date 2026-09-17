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

  const distributionItemCount = await prisma.distributionItem.count();
  if (distributionItemCount === 0) {
    await prisma.distributionItem.createMany({
      data: [
        { name: "כפפות עבודה", unit: "זוג", order: 1 },
        { name: "משקפי מגן", unit: "יח'", order: 2 },
        { name: "נורת LED", unit: "יח'", order: 3 },
        { name: "מפסק פחת", unit: "יח'", order: 4 },
        { name: "כבל חשמל 2.5 ממ\"ר", unit: "מ'", order: 5 },
        { name: "סרט בידוד", unit: "גליל", order: 6 },
      ],
    });

    const items = await prisma.distributionItem.findMany();
    const byName = (name: string) =>
      items.find((i) => i.name === name)?.id ?? items[0].id;

    await prisma.distributionRecord.createMany({
      data: [
        {
          recipient: "משה כהן",
          itemId: byName("כפפות עבודה"),
          quantity: 2,
        },
        {
          recipient: "משה כהן",
          itemId: byName("נורת LED"),
          quantity: 5,
        },
        {
          recipient: "דוד לוי",
          itemId: byName("מפסק פחת"),
          quantity: 1,
        },
        {
          recipient: "דוד לוי",
          itemId: byName("כבל חשמל 2.5 ממ\"ר"),
          quantity: 20,
        },
        {
          recipient: "מחסן תחזוקה",
          itemId: byName("סרט בידוד"),
          quantity: 3,
        },
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
