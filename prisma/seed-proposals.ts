import { db } from '../src/lib/db';

async function seed() {
  console.log('Seeding packages and templates...');

  // Create default packages
  const packages = await Promise.all([
    db.package.upsert({
      where: { id: 'pkg-wedding-basic' },
      update: {},
      create: {
        id: 'pkg-wedding-basic',
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
