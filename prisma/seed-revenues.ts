import { db } from '../src/lib/db';

async function seed() {
  console.log('Seeding revenues...');

  // Fetch existing deals
  const deals = await db.deal.findMany({
    include: { client: true },
    take: 10,
  });

  if (deals.length === 0) {
    console.log('No deals found. Please run the main seed first.');
    return;
  }

  // Clear existing revenues
  await db.revenue.deleteMany({});
  console.log('Cleared existing revenues');

  const sampleRevenues = [
    {
      dealId: deals[0]?.id,
      description: 'Initial deposit - Wedding Photography',
      amount: 1950, // 30% of 6500
      date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      status: 'received',
    },
    {
      dealId: deals[0]?.id,
      description: 'Second payment - Wedding Photography',
      amount: 2600, // 40% of 6500
      date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
      status: 'received',
    },
    {
      dealId: deals[1]?.id,
      description: 'Portrait session payment',
      amount: 900,
      date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      status: 'received',
    },
    {
      dealId: deals[2]?.id,
      description: 'Corporate event deposit',
      amount: 2750, // 50% of 5500
      date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      status: 'received',
    },
    {
      dealId: deals[2]?.id,
      description: 'Corporate event final payment',
      amount: 2750,
      date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      status: 'pending',
    },
    {
      dealId: deals[3]?.id || deals[0]?.id,
      description: 'Music video production deposit',
      amount: 1500,
      date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      status: 'received',
    },
    {
      dealId: deals[4]?.id || deals[1]?.id,
      description: 'Product photography payment',
      amount: 800,
      date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      status: 'received',
    },
    {
      dealId: deals[0]?.id,
      description: 'Final payment - Wedding',
      amount: 1950, // remaining 30%
      date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // future
      status: 'pending',
    },
  ];

  for (const revenueData of sampleRevenues) {
    if (revenueData.dealId) {
      await db.revenue.create({ data: revenueData as any });
      console.log(`Created revenue: ${revenueData.description}`);
    }
  }

  console.log('Seed complete!');
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
