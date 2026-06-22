import { db } from '../src/lib/db';

async function seed() {
  console.log('Seeding packages and templates...');

  // Resolve a organização multi-tenant pelo slug (criada pelo seed principal).
  const org = await db.organization.findUnique({
    where: { slug: 'gotake-studio' },
  });

  if (!org) {
    console.log('Organization "gotake-studio" not found. Please run the main seed first.');
    return;
  }

  // Create default packages
  const packages = await Promise.all([
    db.package.upsert({
      where: { id: 'pkg-wedding-basic' },
      update: {},
      create: {
        id: 'pkg-wedding-basic',
        organizationId: org.id,
        name: 'Wedding Essential',
        description: 'Perfect for intimate weddings. Coverage of the ceremony and reception.',
        price: 3500,
        deliverables: JSON.stringify([
          '6 hours of coverage',
          '300+ edited photos',
          'Online gallery',
          'USB drive with all images',
          '1 album (20 pages)',
        ]),
        duration: 6,
        category: 'photography',
      },
    }),
    db.package.upsert({
      where: { id: 'pkg-wedding-premium' },
      update: {},
      create: {
        id: 'pkg-wedding-premium',
        organizationId: org.id,
        name: 'Wedding Premium',
        description: 'Complete wedding coverage with two photographers and engagement session.',
        price: 6500,
        deliverables: JSON.stringify([
          '10 hours of coverage',
          '2 photographers',
          '500+ edited photos',
          'Engagement session included',
          'Premium online gallery',
          'USB drive with all images',
          '2 albums (30 pages each)',
          'Prints package',
        ]),
        duration: 10,
        category: 'photography',
      },
    }),
    db.package.upsert({
      where: { id: 'pkg-portrait-basic' },
      update: {},
      create: {
        id: 'pkg-portrait-basic',
        organizationId: org.id,
        name: 'Portrait Session',
        description: 'Professional portrait session for individuals or couples.',
        price: 500,
        deliverables: JSON.stringify([
          '1 hour session',
          '1 location',
          '30+ edited photos',
          'Online gallery',
          'Print release',
        ]),
        duration: 1,
        category: 'photography',
      },
    }),
    db.package.upsert({
      where: { id: 'pkg-portrait-premium' },
      update: {},
      create: {
        id: 'pkg-portrait-premium',
        organizationId: org.id,
        name: 'Portrait Extended',
        description: 'Extended portrait session with multiple outfits and locations.',
        price: 900,
        deliverables: JSON.stringify([
          '2 hour session',
          '2-3 locations',
          '3-4 outfit changes',
          '50+ edited photos',
          'Premium online gallery',
          'USB drive',
          'Print release',
        ]),
        duration: 2,
        category: 'photography',
      },
    }),
    db.package.upsert({
      where: { id: 'pkg-video-wedding' },
      update: {},
      create: {
        id: 'pkg-video-wedding',
        organizationId: org.id,
        name: 'Wedding Cinematic',
        description: 'Cinematic wedding film with ceremony and reception highlights.',
        price: 4500,
        deliverables: JSON.stringify([
          '8 hours of coverage',
          '5-7 minute cinematic film',
          'Ceremony edit (full)',
          'Speeches edit (full)',
          'Social media teasers (3x)',
          'Drone footage',
          '2 videographers',
        ]),
        duration: 8,
        category: 'videography',
      },
    }),
    db.package.upsert({
      where: { id: 'pkg-corporate' },
      update: {},
      create: {
        id: 'pkg-corporate',
        organizationId: org.id,
        name: 'Corporate Event',
        description: 'Professional coverage for corporate events, conferences, and meetings.',
        price: 2000,
        deliverables: JSON.stringify([
          '4 hours of coverage',
          '200+ edited photos',
          'Key moments highlights',
          'Headshots for speakers',
          'Online gallery',
          'Commercial usage license',
        ]),
        duration: 4,
        category: 'photography',
      },
    }),
    db.package.upsert({
      where: { id: 'pkg-graduation' },
      update: {},
      create: {
        id: 'pkg-graduation',
        organizationId: org.id,
        name: 'Graduation Session',
        description: 'Celebrate your achievement with professional graduation photos.',
        price: 400,
        deliverables: JSON.stringify([
          '1 hour session',
          'Campus/outdoor location',
          '25+ edited photos',
          'Online gallery',
          'Print release',
        ]),
        duration: 1,
        category: 'photography',
      },
    }),
  ]);

  console.log(`Created ${packages.length} packages`);

  // Create default templates
  const templates = await Promise.all([
    db.proposalTemplate.upsert({
      where: { id: 'tpl-wedding' },
      update: {},
      create: {
        id: 'tpl-wedding',
        organizationId: org.id,
        name: 'Wedding Photography',
        description: 'Template for wedding photography proposals with premium packages.',
        defaultTerms: `Payment Terms:
- 30% deposit to reserve date
- 40% due 30 days before event
- 30% due on event day

What's Included:
- Full day coverage as specified
- Professional editing and color grading
- Online gallery for sharing
- High-resolution digital files

Timeline:
- Photos delivered within 4-6 weeks
- Album design within 2 weeks after selection`,
        defaultPackages: JSON.stringify(['pkg-wedding-basic', 'pkg-wedding-premium']),
      },
    }),
    db.proposalTemplate.upsert({
      where: { id: 'tpl-portrait' },
      update: {},
      create: {
        id: 'tpl-portrait',
        organizationId: org.id,
        name: 'Portrait & Personal',
        description: 'Template for portrait sessions, family photos, and personal branding.',
        defaultTerms: `Payment Terms:
- Full payment due at booking
- Rescheduling allowed with 48 hours notice

What's Included:
- Session time as specified
- Professional editing
- Online gallery for download
- Print release for personal use

Timeline:
- Gallery delivered within 2 weeks`,
        defaultPackages: JSON.stringify(['pkg-portrait-basic', 'pkg-portrait-premium', 'pkg-graduation']),
      },
    }),
    db.proposalTemplate.upsert({
      where: { id: 'tpl-corporate' },
      update: {},
      create: {
        id: 'tpl-corporate',
        organizationId: org.id,
        name: 'Corporate & Events',
        description: 'Template for corporate events, conferences, and commercial projects.',
        defaultTerms: `Payment Terms:
- 50% deposit to confirm booking
- 50% due upon delivery

What's Included:
- Coverage as specified
- Professional editing
- Commercial usage license
- Rush delivery available (additional fee)

Timeline:
- Standard delivery: 5-7 business days
- Rush delivery: 48 hours (+25% fee)`,
        defaultPackages: JSON.stringify(['pkg-corporate', 'pkg-video-wedding']),
      },
    }),
  ]);

  console.log(`Created ${templates.length} templates`);

  // Create sample proposals linked to existing deals
  console.log('Creating sample proposals...');

  // Fetch existing deals with clients
  const deals = await db.deal.findMany({
    include: { client: true },
    take: 5,
  });

  if (deals.length > 0) {
    // Clear existing proposals first
    await db.proposal.deleteMany({});

    const sampleProposals = [
      {
        dealId: deals[0]?.id,
        clientId: deals[0]?.clientId,
        organizationId: org.id,
        templateId: 'tpl-wedding',
        title: `Wedding Photography Proposal - ${deals[0]?.title || 'Project'}`,
        description: 'Complete wedding photography package with premium coverage.',
        status: 'draft' as const,
        packages: JSON.stringify([
          { id: 'pkg-wedding-premium', name: 'Wedding Premium', customPrice: 6500, deliverables: ['10 hours of coverage', '2 photographers', '500+ edited photos'] },
        ]),
        portfolioLinks: JSON.stringify(['https://portfolio.example.com/weddings', 'https://instagram.com/studio']),
        terms: '30% deposit to reserve date. Remaining balance due on event day.',
        totalValue: 6500,
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      },
      {
        dealId: deals[1]?.id,
        clientId: deals[1]?.clientId,
        organizationId: org.id,
        templateId: 'tpl-portrait',
        title: `Portrait Session - ${deals[1]?.title || 'Project'}`,
        description: 'Professional portrait session with multiple outfit changes.',
        status: 'sent' as const,
        packages: JSON.stringify([
          { id: 'pkg-portrait-premium', name: 'Portrait Extended', customPrice: 900, deliverables: ['2 hour session', '50+ edited photos'] },
        ]),
        portfolioLinks: JSON.stringify(['https://portfolio.example.com/portraits']),
        terms: 'Full payment due at booking. Rescheduling allowed with 48 hours notice.',
        totalValue: 900,
        sentAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        validUntil: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      },
      {
        dealId: deals[2]?.id,
        clientId: deals[2]?.clientId,
        organizationId: org.id,
        templateId: 'tpl-corporate',
        title: `Corporate Event Coverage - ${deals[2]?.title || 'Project'}`,
        description: 'Full day corporate event photography and videography.',
        status: 'accepted' as const,
        packages: JSON.stringify([
          { id: 'pkg-corporate', name: 'Corporate Event', customPrice: 2000, deliverables: ['4 hours of coverage', '200+ edited photos'] },
          { id: 'pkg-video-wedding', name: 'Wedding Cinematic', customPrice: 3500, deliverables: ['5-7 minute cinematic film'] },
        ]),
        portfolioLinks: JSON.stringify(['https://portfolio.example.com/corporate']),
        terms: '50% deposit to confirm. Remaining upon delivery.',
        totalValue: 5500,
        sentAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        viewedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        respondedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      },
      {
        dealId: deals[3]?.id || deals[0]?.id,
        clientId: deals[3]?.clientId || deals[0]?.clientId,
        organizationId: org.id,
        templateId: 'tpl-wedding',
        title: `Wedding Video Package - ${deals[3]?.title || deals[0]?.title || 'Project'}`,
        description: 'Cinematic wedding film with drone footage.',
        status: 'viewed' as const,
        packages: JSON.stringify([
          { id: 'pkg-video-wedding', name: 'Wedding Cinematic', customPrice: 4500, deliverables: ['8 hours of coverage', '5-7 minute cinematic film'] },
        ]),
        portfolioLinks: JSON.stringify(['https://vimeo.com/studio/weddings']),
        terms: '30% deposit required. Delivery within 6 weeks.',
        totalValue: 4500,
        sentAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        viewedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        validUntil: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
      },
    ];

    for (const proposalData of sampleProposals) {
      if (proposalData.clientId && proposalData.dealId) {
        await db.proposal.create({ data: proposalData as any });
        console.log(`Created proposal: ${proposalData.title}`);
      }
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
