import { db } from '@/lib/db';

// Mock data for the WhatsApp CRM Dashboard MVP

const firstNames = [
  'Ana', 'Bruno', 'Carlos', 'Diana', 'Eduardo', 'Fernanda', 'Gabriel', 'Helena',
  'Igor', 'Julia', 'Lucas', 'Marina', 'Nicolas', 'Olivia', 'Pedro', 'Rafaela',
  'Samuel', 'Tatiana', 'Victor', 'Yasmin'
];

const lastNames = [
  'Silva', 'Santos', 'Oliveira', 'Souza', 'Rodrigues', 'Ferreira', 'Almeida',
  'Pereira', 'Costa', 'Carvalho', 'Gomes', 'Martins', 'Araújo', 'Melo', 'Barbosa'
];

const eventTypes = [
  'Wedding', 'Corporate Event', 'Portrait Session', 'Product Photography',
  'Music Video', 'Documentary', 'Real Estate', 'Fashion Shoot', 'Birthday Party',
  'Conference', 'Graduation', 'Family Portrait', 'Engagement', 'Brand Campaign'
];

const dealStages = ['novo', 'briefing', 'contando', 'producao', 'finalizado'];

const expenseCategories = [
  'Equipment Rental', 'Location Fee', 'Crew', 'Props', 'Travel', 'Post-Production', 'Insurance', 'Other'
];

const cities = [
  'São Paulo', 'Rio de Janeiro', 'Belo Horizonte', 'Curitiba', 'Porto Alegre',
  'Salvador', 'Brasília', 'Fortaleza', 'Recife', 'Campinas'
];

const avatarUrls = [
  'https://api.dicebear.com/7.x/avataaars/svg?seed=',
  'https://api.dicebear.com/7.x/bottts/svg?seed=',
  'https://api.dicebear.com/7.x/fun-emoji/svg?seed=',
];

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function generatePhone(): string {
  const ddd = randomInt(11, 99);
  const part1 = randomInt(90000, 99999);
  const part2 = randomInt(1000, 9999);
  return `+55 ${ddd} 9${part1}-${part2}`;
}

function generateEmail(name: string): string {
  const domains = ['gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com.br', 'company.com.br'];
  const cleanName = name.toLowerCase().replace(/\s+/g, '.').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return `${cleanName}@${randomElement(domains)}`;
}

async function generateMockData() {
  console.log('🚀 Starting mock data generation...');

  // Clear existing data
  console.log('📦 Clearing existing data...');
  await db.document.deleteMany();
  await db.booking.deleteMany()
  await db.revenue.deleteMany()
  await db.expense.deleteMany()
  await db.briefing.deleteMany()
  await db.message.deleteMany()
  await db.conversation.deleteMany()
  await db.deal.deleteMany()
  await db.client.deleteMany()

  console.log('👥 Creating clients...');
  const clients = [];
  
  for (let i = 0; i < 20; i++) {
    const firstName = randomElement(firstNames);
    const lastName = randomElement(lastNames);
    const name = `${firstName} ${lastName}`;
    const eventType = randomElement(eventTypes);
    const city = randomElement(cities);
    
    const client = await db.client.create({
      data: {
        phone: generatePhone(),
        name,
        email: generateEmail(name),
        eventType,
        notes: `Interested in ${eventType.toLowerCase()} services. Located in ${city}.`,
        source: randomElement(['whatsapp', 'referral', 'website', 'instagram']),
        status: randomElement(['active', 'lead', 'inactive']),
        avatar: `${randomElement(avatarUrls)}${firstName.toLowerCase()}-${i}`,
      }
    });
    clients.push(client);
  }

  console.log('💼 Creating deals...');
  const deals = [];
  
  for (let i = 0; i < 30; i++) {
    const client = randomElement(clients);
    const status = randomElement(dealStages);
    const baseValue = randomInt(2000, 25000);
    const value = status === 'finalizado' ? baseValue : (status === 'novo' ? baseValue * 0.5 : baseValue * 0.75);
    
    const deal = await db.deal.create({
      data: {
        clientId: client.id,
        title: `${client.eventType} - ${client.name.split(' ')[0]}`,
        description: `${client.eventType} project for ${client.name}`,
        status,
        value,
        currency: 'BRL',
        createdAt: randomDate(new Date('2024-01-01'), new Date()),
      }
    });
    deals.push(deal);
  }

  console.log('📝 Creating briefings...');
  for (let i = 0; i < 25; i++) {
    const deal = randomElement(deals.filter(d => d.status !== 'novo'));
    if (!deal) continue;
    
    await db.briefing.create({
      data: {
        dealId: deal.id,
        content: `Client wants a ${randomInt(30, 120)} minute ${deal.title.toLowerCase()}. Style reference: ${randomElement(['Cinematic', 'Documentary', 'Classic', 'Modern', 'Editorial'])}. Delivery: ${randomInt(1, 4)} weeks after shoot.`,
        author: randomElement(['Studio Team', 'Lead Photographer', 'Creative Director']),
        createdAt: randomDate(new Date('2024-01-01'), new Date()),
      }
    });
  }

  console.log('💰 Creating expenses...');
  const totalExpenses: Record<string, number> = {};
  
  for (let i = 0; i < 50; i++) {
    const deal = randomElement(deals);
    const amount = randomInt(200, 3000);
    
    totalExpenses[deal.id] = (totalExpenses[deal.id] || 0) + amount;
    
    await db.expense.create({
      data: {
        dealId: deal.id,
        category: randomElement(expenseCategories),
        description: `${randomElement(expenseCategories)} for ${deal.title}`,
        amount,
        currency: 'BRL',
        date: randomDate(new Date('2024-01-01'), new Date()),
      }
    });
  }

  console.log('💵 Creating revenue records...');
  for (const deal of deals.filter(d => d.status === 'finalizado' || d.status === 'producao')) {
    const totalAmount = deal.value;
    const payments = randomInt(1, 3);
    let remaining = totalAmount;
    
    for (let p = 0; p < payments; p++) {
      const isLast = p === payments - 1;
      const amount = isLast ? remaining : Math.floor(remaining / (payments - p)) * randomInt(30, 70) / 100;
      remaining -= amount;
      
      await db.revenue.create({
        data: {
          dealId: deal.id,
          description: `Payment ${p + 1}/${payments} - ${deal.title}`,
          amount,
          currency: 'BRL',
          date: randomDate(new Date('2024-01-01'), new Date()),
          status: randomElement(['received', 'received', 'received', 'pending']),
        }
      });
    }
  }

  console.log('📅 Creating bookings...');
  const now = new Date();
  const upcomingDates = Array.from({ length: 30 }, (_, i) => {
    const date = new Date(now);
    date.setDate(date.getDate() + i);
    return date;
  });

  for (let i = 0; i < 20; i++) {
    const client = randomElement(clients);
    const deal = randomElement(deals.filter(d => d.clientId === client.id)) || null;
    const date = i < 10 ? randomElement(upcomingDates) : randomDate(new Date('2024-01-01'), new Date());
    
    await db.booking.create({
      data: {
        clientId: client.id,
        dealId: deal?.id || null,
        eventType: client.eventType,
        eventDate: date,
        duration: randomInt(60, 480),
        location: `${randomElement(cities)}, Brazil`,
        status: date > now ? randomElement(['pending', 'confirmed']) : randomElement(['completed', 'completed', 'cancelled']),
        notes: i % 3 === 0 ? 'Client requested early arrival' : null,
      }
    });
  }

  console.log('📄 Creating documents...');
  const documentTypes = ['contract', 'quote', 'invoice'];
  
  for (let i = 0; i < 35; i++) {
    const client = randomElement(clients);
    const deal = randomElement(deals.filter(d => d.clientId === client.id)) || null;
    const type = randomElement(documentTypes);
    
    await db.document.create({
      data: {
        clientId: client.id,
        dealId: deal?.id || null,
        type,
        title: `${type.charAt(0).toUpperCase() + type.slice(1)} - ${client.name.split(' ')[0]}`,
        filename: `${type}_${client.name.toLowerCase().replace(/\s+/g, '_')}.pdf`,
        storageUrl: `/documents/${type}/${client.id}.pdf`,
        sentAt: randomDate(new Date('2024-01-01'), new Date()),
        status: randomElement(['draft', 'sent', 'viewed', 'signed']),
      }
    });
  }

  console.log('💬 Creating conversations and messages...');
  for (const client of clients.slice(0, 15)) {
    const conversation = await db.conversation.create({
      data: {
        clientId: client.id,
        status: randomElement(['active', 'active', 'closed']),
      }
    });
    
    // Create some messages
    const messageCount = randomInt(3, 10);
    for (let m = 0; m < messageCount; m++) {
      await db.message.create({
        data: {
          conversationId: conversation.id,
          direction: m % 2 === 0 ? 'inbound' : 'outbound',
          type: 'text',
          content: m % 2 === 0 
            ? `Hi! I'm interested in ${client.eventType.toLowerCase()} services.` 
            : `Great! Let me share more details about our ${client.eventType.toLowerCase()} packages.`,
          status: randomElement(['sent', 'delivered', 'read']),
          createdAt: randomDate(new Date('2024-01-01'), new Date()),
        }
      });
    }
  }

  console.log('✅ Mock data generation complete!');
  console.log(`
  📊 Summary:
  - 20 Clients
  - 30 Deals
  - 25 Briefings
  - 50 Expenses
  - Revenue records for completed deals
  - 20 Bookings
  - 35 Documents
  - 15 Conversations with messages
  `);
}

generateMockData()
  .then(async () => {
    await db.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await db.$disconnect();
    process.exit(1);
  });
