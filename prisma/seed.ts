/**
 * Prisma Seed Script — GoTakeCRM (Multi-tenant)
 * ================================================
 * Popula o banco de dados de desenvolvimento com dados realistas
 * para um CRM de estúdio de fotografia e filmagem baseado no Brasil.
 *
 * Estrutura multi-tenant:
 *   Organization → User (via UserOrganization, role "owner")
 *   Organization → DashboardSettings (1 por organização)
 *   Organization → Client → Deal → Briefing, Expense, Revenue
 *   Organization → Booking, Package, ProposalTemplate
 *
 * Modelos-filhos (Briefing, Expense, Revenue, Message) NÃO recebem
 * organizationId — são acessados via pai (Deal/Conversation).
 *
 * Execução:
 *   npx tsx prisma/seed.ts
 *
 * O script primeiro limpa todos os registros existentes (respeitando a
 * ordem de chaves estrangeiras) e depois insere os dados em lote usando
 * transações do Prisma por grupo de entidade.
 */

import { db } from "../src/lib/db";
import bcrypt from "bcryptjs";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Cria um Date a partir de uma string de data no formato ISO (YYYY-MM-DD).
 * O horário é fixado ao meio-dia para evitar problemas de fuso horário.
 */
function dateFromStr(dateStr: string): Date {
  return new Date(`${dateStr}T12:00:00.000Z`);
}

// ---------------------------------------------------------------------------
// Função principal
// ---------------------------------------------------------------------------

async function main() {
  console.log("========== Iniciando seed do GoTakeCRM ==========\n");

  // -----------------------------------------------------------------------
  // 1. LIMPEZA DO BANCO (ordem reversa das dependências)
  // -----------------------------------------------------------------------
  console.log("[1/15] Limpando registros existentes...");

  // A ordem de exclusão respeita as restrições de chave estrangeira:
  //  - Primeiro removemos as tabelas-filhas (que referenciam outras),
  //  - Depois as tabelas-pais (que são referenciadas).
  //  - Tabelas multi-tenant (Client, Deal, etc.) dependem de Organization.
  //  - ClientShare referencia Client e Organization.
  //  - UserOrganization referencia User e Organization.

  await db.message.deleteMany();
  await db.conversation.deleteMany();
  await db.briefing.deleteMany();
  await db.expense.deleteMany();
  await db.revenue.deleteMany();
  await db.booking.deleteMany();
  await db.document.deleteMany();
  await db.proposal.deleteMany();
  await db.deal.deleteMany();
  await db.clientShare.deleteMany();
  await db.client.deleteMany();
  await db.template.deleteMany();
  await db.package.deleteMany();
  await db.proposalTemplate.deleteMany();
  await db.dashboardSettings.deleteMany();
  await db.userOrganization.deleteMany();
  await db.user.deleteMany();
  await db.organization.deleteMany();

  console.log("  ✓ Banco limpo.\n");

  // -----------------------------------------------------------------------
  // 2. ORGANIZATION — Tenant raiz "GoTake Studio"
  // -----------------------------------------------------------------------
  console.log("[2/15] Criando organização...");

  const org = await db.organization.create({
    data: {
      name: "GoTake Studio",
      slug: "gotake-studio",
      plan: "solo",
    },
  });

  console.log(`  ✓ Organização criada: ${org.name} (slug: ${org.slug})\n`);

  // -----------------------------------------------------------------------
  // 3. USER — Usuário demo para login via Credentials Provider
  // -----------------------------------------------------------------------
  console.log("[3/15] Criando usuário demo...");

  const passwordHash = await bcrypt.hash("demo2026", 12);

  const demoUser = await db.user.create({
    data: {
      email: "demo@gotakecrm.com",
      name: "Demo User",
      passwordHash,
    },
  });

  console.log(`  ✓ Usuário demo criado: ${demoUser.email}\n`);

  // -----------------------------------------------------------------------
  // 4. USER ORGANIZATION — Vincula o usuário demo como "owner" da org
  // -----------------------------------------------------------------------
  console.log("[4/15] Vinculando usuário à organização...");

  await db.userOrganization.create({
    data: {
      userId: demoUser.id,
      organizationId: org.id,
      role: "owner",
    },
  });

  console.log(`  ✓ Usuário vinculado como owner.\n`);

  // -----------------------------------------------------------------------
  // 5. DASHBOARD SETTINGS — Configuração padrão do dashboard (1 por org)
  // -----------------------------------------------------------------------
  console.log("[5/15] Criando configuração do dashboard...");

  await db.dashboardSettings.create({
    data: {
      organizationId: org.id,
      businessName: "GoTake Studio",
      currency: "BRL",
      timezone: "America/Sao_Paulo",
    },
  });

  console.log("  ✓ Configuração do dashboard criada.\n");

  // -----------------------------------------------------------------------
  // 6. CLIENTS — 8 clientes com diversidade de status, tipo de evento,
  //    origem e dados de contato. Nomes brasileiros realistas.
  // -----------------------------------------------------------------------
  console.log("[6/15] Criando clientes...");

  const clients = await db.$transaction([
    db.client.create({
      data: {
        organizationId: org.id,
        phone: "+5511998765432",
        name: "Juliana Costa",
        email: "juliana.costa@email.com",
        eventType: "wedding",
        notes: "Noiva indicada pela Caroline. Orçamento flexível. Prefere fotos espontâneas e making of.",
        source: "referral",
        status: "active",
      },
    }),
    db.client.create({
      data: {
        organizationId: org.id,
        phone: "+5521987654321",
        name: "Rafael Oliveira",
        email: "rafael.oliveira@techcorp.com.br",
        eventType: "corporate",
        notes: "Gerente de marketing da TechCorp. Precisa de fotos corporativas e vídeo institucional para o site novo.",
        source: "website",
        status: "active",
      },
    }),
    db.client.create({
      data: {
        organizationId: org.id,
        phone: "+5531996543210",
        name: "Camila Santos",
        email: null,
        eventType: "portrait",
        notes: null,
        source: "instagram",
        status: "active",
      },
    }),
    db.client.create({
      data: {
        organizationId: org.id,
        phone: "+5541995432109",
        name: "Bruno Almeida",
        email: "bruno.almeida@lojasuniao.com",
        eventType: "product",
        notes: "Diretor da rede Lojas União. Contrato anual para fotos de catálogo e e-commerce.",
        source: "referral",
        status: "active",
      },
    }),
    db.client.create({
      data: {
        organizationId: org.id,
        phone: "+5551994321098",
        name: "Fernanda Lima",
        email: null,
        eventType: "event",
        notes: "Produtora de eventos corporativos. Vários eventos por semestre.",
        source: "whatsapp",
        status: "active",
      },
    }),
    db.client.create({
      data: {
        organizationId: org.id,
        phone: "+5561993210987",
        name: "Thiago Pereira",
        email: "thiago.pereira@banda.com",
        eventType: "other", // music video
        notes: "Vocalista da banda Reverbera. Quer clipe para o lançamento do álbum novo.",
        source: "instagram",
        status: "lead",
      },
    }),
    db.client.create({
      data: {
        organizationId: org.id,
        phone: "+5571992109876",
        name: "Marina Rodrigues",
        email: "marina@imobiliarianova.com.br",
        eventType: "other", // real estate
        notes: null,
        source: "whatsapp",
        status: "lead",
      },
    }),
    db.client.create({
      data: {
        organizationId: org.id,
        phone: "+5581991098765",
        name: "Lucas Carvalho",
        email: "lucas.carvalho@gmail.com",
        eventType: "other",
        notes: "Não responde mais. Último contato foi há 3 meses.",
        source: "other",
        status: "inactive",
      },
    }),
  ]);

  // Desestrutura os clientes para referência nas entidades relacionadas
  const [juliana, rafael, camila, bruno, fernanda, thiago, marina, lucas] =
    clients;

  console.log(
    `  ✓ ${clients.length} clientes criados: ${clients.map((c) => c.name).join(", ")}\n`
  );

  // -----------------------------------------------------------------------
  // 7. DEALS — 13 negócios distribuídos por todos os estágios do pipeline.
  //    Pipeline: new → briefing → quoting → production → completed
  //    Distribuição: 3 new, 3 briefing, 3 quoting, 2 production, 2 completed
  //    Cada cliente tem pelo menos 1 deal.
  // -----------------------------------------------------------------------
  console.log("[7/15] Criando deals...");

  const deals = await db.$transaction([
    // --- NEW (3) ---
    db.deal.create({
      data: {
        organizationId: org.id,
        clientId: juliana.id,
        title: "Casamento Juliana & Marcos",
        description: "Cerimônia na Paróquia Sant'Ana e recepção no Villa Amalfi. 200 convidados.",
        status: "new",
        value: 12000,
        currency: "BRL",
      },
    }),
    db.deal.create({
      data: {
        organizationId: org.id,
        clientId: rafael.id,
        title: "Fotos Corporativas TechCorp 2026",
        description: null,
        status: "new",
        value: 3500,
        currency: "BRL",
      },
    }),
    db.deal.create({
      data: {
        organizationId: org.id,
        clientId: camila.id,
        title: "Ensaio de Retrato - Book Profissional",
        description: "Ensaio para portfólio de atriz. Locação externa no Parque Ibirapuera.",
        status: "new",
        value: 1800,
        currency: "BRL",
      },
    }),

    // --- BRIEFING (3) ---
    db.deal.create({
      data: {
        organizationId: org.id,
        clientId: juliana.id,
        title: "Making Of Casamento Ribeirão",
        description: "Cobertura em vídeo do casamento da irmã da Juliana. Fazenda em Ribeirão Preto.",
        status: "briefing",
        value: 7500,
        currency: "BRL",
      },
    }),
    db.deal.create({
      data: {
        organizationId: org.id,
        clientId: bruno.id,
        title: "Catálogo Verão 2027 - Linha Praia",
        description: "Ensaio de produto para nova coleção de moda praia. 40 peças.",
        status: "briefing",
        value: 4800,
        currency: "BRL",
      },
    }),
    db.deal.create({
      data: {
        organizationId: org.id,
        clientId: thiago.id,
        title: "Clipe - Reverbera 'Horizonte'",
        description: "Videoclipe completo com narrativa. 2 dias de gravação + edição.",
        status: "briefing",
        value: 25000,
        currency: "BRL",
      },
    }),

    // --- QUOTING (3) ---
    db.deal.create({
      data: {
        organizationId: org.id,
        clientId: rafael.id,
        title: "Vídeo Institucional TechCorp 2026",
        description: "Vídeo de 3 minutos com depoimentos e tomadas da fábrica. Inclui drone.",
        status: "quoting",
        value: 9500,
        currency: "BRL",
      },
    }),
    db.deal.create({
      data: {
        organizationId: org.id,
        clientId: camila.id,
        title: "Ensaio Gestante - Parque da Água Branca",
        description: "Ensaio externo com vestidos. Parceira maquiadora incluso no valor.",
        status: "quoting",
        value: 2200,
        currency: "BRL",
      },
    }),
    db.deal.create({
      data: {
        organizationId: org.id,
        clientId: fernanda.id,
        title: "Evento Lançamento - Tech Summit 2026",
        description: null,
        status: "quoting",
        value: 11000,
        currency: "BRL",
      },
    }),

    // --- PRODUCTION (2) ---
    db.deal.create({
      data: {
        organizationId: org.id,
        clientId: marina.id,
        title: "Fotos Imobiliária - Lançamento Residencial Aurora",
        description: "Fotos de 2 apartamentos decorados e áreas comuns. 3 torres.",
        status: "production",
        value: 4500,
        currency: "BRL",
      },
    }),
    db.deal.create({
      data: {
        organizationId: org.id,
        clientId: lucas.id,
        title: "Cobertura - Feira de Artesanato Regional",
        description: null,
        status: "production",
        value: 2500,
        currency: "BRL",
      },
    }),

    // --- COMPLETED (2) ---
    db.deal.create({
      data: {
        organizationId: org.id,
        clientId: bruno.id,
        title: "Catálogo Outono 2026 - Lojas União",
        description:
          "Fotos de campanha para vitrines e redes sociais. 60 peças fotografadas em estúdio.",
        status: "completed",
        value: 6800,
        currency: "BRL",
      },
    }),
    db.deal.create({
      data: {
        organizationId: org.id,
        clientId: fernanda.id,
        title: "Cobertura Confraternização Anual Grupo Sollari",
        description:
          "Jantar para 150 convidados. Fotos de recepção, cerimônia de premiação e making of.",
        status: "completed",
        value: 4200,
        currency: "BRL",
      },
    }),
  ]);

  // Desestrutura os deals por estágio para uso nas próximas seções
  const [
    dealNew01,
    dealNew02,
    dealNew03, // new
    dealBrief01,
    dealBrief02,
    dealBrief03, // briefing
    dealQuote01,
    dealQuote02,
    dealQuote03, // quoting
    dealProd01,
    dealProd02, // production
    dealDone01,
    dealDone02, // completed
  ] = deals;

  console.log(
    `  ✓ ${deals.length} deals criados (${deals.filter((d) => d.status === "new").length} new, ${deals.filter((d) => d.status === "briefing").length} briefing, ${deals.filter((d) => d.status === "quoting").length} quoting, ${deals.filter((d) => d.status === "production").length} production, ${deals.filter((d) => d.status === "completed").length} completed)\n`
  );

  // -----------------------------------------------------------------------
  // 8. BRIEFINGS — 7 briefings criativos para deals nos estágios
  //    "briefing" ou posteriores (briefing, quoting, production).
  //    (Modelo-filho de Deal — sem organizationId)
  // -----------------------------------------------------------------------
  console.log("[8/15] Criando briefings...");

  const briefings = await db.$transaction([
    db.briefing.create({
      data: {
        dealId: dealBrief01.id, // Making Of Casamento Ribeirão (briefing)
        content: [
          "CLIENTE: Juliana Costa (indicação da irmã, cliente anterior)",
          "EVENTO: Casamento da irmã da cliente",
          "DATA: 20/12/2026",
          "LOCAL: Fazenda Santa Luzia, Ribeirão Preto/SP",
          "",
          "ESCOPO VIDEO:",
          "- Cobertura completa: making of noiva + cerimônia + recepção",
          "- Vídeo highlight de 8-10 minutos",
          "- Vídeo para redes sociais (1 minuto, formato 9:16)",
          "- Captação com 2 câmeras (Sony FX3)",
          "- Drone para tomadas aéreas da fazenda",
          "- Entrevistas rápidas com convidados",
          "",
          "ESTILO: Cinematográfico, tons quentes, câmera lenta em momentos-chave",
          "REFERÊNCIA: Estilo 'The Wedding Filmer'",
        ].join("\n"),
        author: "Juliana Costa",
      },
    }),
    db.briefing.create({
      data: {
        dealId: dealBrief02.id, // Catálogo Verão 2027 (briefing)
        content: [
          "CLIENTE: Lojas União (Bruno Almeida)",
          "CAMPANHA: Verão 2027 — Linha Praia",
          "PEÇAS: 40 modelos (biquínis, maiôs, saídas de praia, acessórios)",
          "",
          "ESCOPO FOTO:",
          "- Fotografia still em fundo infinito branco e preto",
          "- Detalhes de textura e aviamentos para e-commerce",
          "- 3 fotos por peça (frente, costas, detalhe) = 120 fotos finais",
          "- Formato: JPEG alta resolução + WebP para site",
          "",
          "ESTILO: Clean, iluminação uniforme, sem sombras duras",
          "PRAZO: Entrega final até 01/09/2026",
          "ORÇAMENTO INICIAL: R$4.800",
        ].join("\n"),
        author: "Bruno Almeida",
      },
    }),
    db.briefing.create({
      data: {
        dealId: dealBrief03.id, // Clipe Reverbera (briefing)
        content: [
          "CLIENTE: Banda Reverbera (Thiago Pereira)",
          "PROJETO: Videoclipe 'Horizonte' — single de lançamento do álbum",
          "",
          "CONCEITO:",
          "- Narrativa visual de um personagem deixando a cidade grande",
          "- Intercala cenas da banda tocando em um galpão abandonado",
          "- Atmosfera melancólica com final esperançoso",
          "",
          "ESCOPO:",
          "- 2 diárias de gravação (1 estúdio/galpão + 1 locação externa)",
          "- Equipe: diretor de fotografia, assistente, maquiador",
          "- Câmera principal: Red Komodo 6K",
          "- Pós-produção: edição + color grading + motion graphics leves",
          "",
          "REFERÊNCIAS: Clipes 'Yellow' (Coldplay) e 'Seventy Times 7' (Brand New)",
          "PRAZO: Estreia em 3 meses (single será lançado em novembro)",
        ].join("\n"),
        author: "Thiago Pereira",
      },
    }),
    db.briefing.create({
      data: {
        dealId: dealQuote01.id, // Vídeo Institucional TechCorp (quoting)
        content: [
          "CLIENTE: TechCorp (Rafael Oliveira)",
          "PROJETO: Vídeo Institucional 2026 — 'Inovação que Transforma'",
          "DURAÇÃO: 3 minutos",
          "",
          "ESCOPO:",
          "- Depoimentos do CEO e diretores (até 5 pessoas)",
          "- Tomadas da fábrica, escritório e centro de P&D",
          "- Drone para tomada externa da sede",
          "- Motion graphics para dados e números da empresa",
          "- Trilha sonora original ou licenciada",
          "- Versão legendada em inglês",
          "",
          "USO: Site institucional + YouTube + LinkedIn",
          "PRAZO: Primeiro corte em 30 dias",
        ].join("\n"),
        author: "Rafael Oliveira",
      },
    }),
    db.briefing.create({
      data: {
        dealId: dealQuote02.id, // Ensaio Gestante (quoting)
        content: [
          "CLIENTE: Camila Santos",
          "PROJETO: Ensaio de Gestante — 32 semanas",
          "LOCAL: Parque da Água Branca (Zona Oeste/SP)",
          "",
          "DETALHES:",
          "- Ensaio externo com luz natural (preferência por golden hour)",
          "- 2 vestidos fornecidos pela cliente",
          "- Maquiadora parceira (Mari MakeUp) já contratada",
          "- Marido participa em algumas fotos",
          "",
          "ENTREGAS: 60-80 fotos editadas, galeria online privativa",
          "ESTILO: Leve, natural, cores suaves",
        ].join("\n"),
        author: "Camila Santos",
      },
    }),
    db.briefing.create({
      data: {
        dealId: dealQuote03.id, // Tech Summit 2026 (quoting)
        content: [
          "CLIENTE: Fernanda Lima (Produtora de Eventos)",
          "EVENTO: Tech Summit 2026",
          "DATA: 14-15/10/2026",
          "LOCAL: Transamérica Expo Center",
          "PÚBLICO: Esperado 2.000 participantes",
          "",
          "ESCOPO FOTO:",
          "- Cobertura de 2 dias (8h/dia)",
          "- Fotos dos palcos, keynotes, estandes, networking",
          "- Entrega em tempo real (fotos selecionadas a cada 2h)",
          "- Álbum final com 300-400 fotos tratadas",
          "- 2 fotógrafos simultâneos",
          "",
          "ESTILO: Corporativo dinâmico, cores vivas, close-ups de palestrantes",
        ].join("\n"),
        author: "Fernanda Lima",
      },
    }),
    db.briefing.create({
      data: {
        dealId: dealProd01.id, // Fotos Imobiliária (production)
        content: [
          "CLIENTE: Marina Rodrigues / Imobiliária Nova",
          "PROJETO: Lançamento Residencial Aurora",
          "LOCAL: Av. Paulista, 2000 — Apto decorado 702 e 803 + áreas comuns",
          "",
          "ESCOPO:",
          "- 2 apartamentos decorados (living, suíte, cozinha)",
          "- Fachada do edifício (golden hour)",
          "- Áreas comuns: lobby, piscina, academia, salão de festas",
          "- Drone para vista panorâmica da região",
          "",
          "ENTREGAS: 80 fotos alta resolução + tour virtual em 360°",
          "USO: Site do empreendimento + redes sociais + Google Street View",
        ].join("\n"),
        author: "Marina Rodrigues",
      },
    }),
  ]);

  console.log(
    `  ✓ ${briefings.length} briefings criados.\n`
  );

  // -----------------------------------------------------------------------
  // 9. EXPENSES — 10 despesas para deals nos estágios "quoting"
  //    ou posteriores (quoting, production, completed).
  //    Categorias: equipment, location, crew, travel.
  //    (Modelo-filho de Deal — sem organizationId)
  // -----------------------------------------------------------------------
  console.log("[9/15] Criando despesas...");

  const expenses = await db.$transaction([
    // Deal: Vídeo Institucional TechCorp (quoting) — 2 despesas
    db.expense.create({
      data: {
        dealId: dealQuote01.id,
        category: "equipment",
        description: "Locação lente Sony 24-70mm f/2.8 GM II",
        amount: 350,
        currency: "BRL",
      },
    }),
    db.expense.create({
      data: {
        dealId: dealQuote01.id,
        category: "travel",
        description: "Deslocamento até a fábrica em Barueri (pedágio + combustível)",
        amount: 120,
        currency: "BRL",
      },
    }),

    // Deal: Ensaio Gestante (quoting) — 1 despesa
    db.expense.create({
      data: {
        dealId: dealQuote02.id,
        category: "crew",
        description: "Assistente de iluminação (rebatedor e difusor)",
        amount: 200,
        currency: "BRL",
      },
    }),

    // Deal: Tech Summit 2026 (quoting) — 2 despesas
    db.expense.create({
      data: {
        dealId: dealQuote03.id,
        category: "crew",
        description: "Segundo fotógrafo freelancer (diária)",
        amount: 800,
        currency: "BRL",
      },
    }),
    db.expense.create({
      data: {
        dealId: dealQuote03.id,
        category: "travel",
        description: "Estacionamento Transamérica Expo (2 diárias)",
        amount: 90,
        currency: "BRL",
      },
    }),

    // Deal: Fotos Imobiliária Aurora (production) — 3 despesas
    db.expense.create({
      data: {
        dealId: dealProd01.id,
        category: "equipment",
        description: "Locação drone DJI Mavic 3 Pro para tomadas aéreas",
        amount: 500,
        currency: "BRL",
      },
    }),
    db.expense.create({
      data: {
        dealId: dealProd01.id,
        category: "location",
        description: "Taxa de autorização para fotos no condomínio",
        amount: 150,
        currency: "BRL",
      },
    }),
    db.expense.create({
      data: {
        dealId: dealProd01.id,
        category: "crew",
        description: "Assistente para iluminação e organização dos ambientes",
        amount: 300,
        currency: "BRL",
      },
    }),

    // Deal: Feira de Artesanato (production) — 1 despesa
    db.expense.create({
      data: {
        dealId: dealProd02.id,
        category: "travel",
        description: "Deslocamento interestadual (ônibus) + hospedagem 1 noite",
        amount: 420,
        currency: "BRL",
      },
    }),

    // Deal: Catálogo Outono Lojas União (completed) — 1 despesa
    db.expense.create({
      data: {
        dealId: dealDone01.id,
        category: "equipment",
        description: "Aluguel de flash de estúdio Profoto B10 Plus (pacote 3 diárias)",
        amount: 750,
        currency: "BRL",
      },
    }),
  ]);

  console.log(
    `  ✓ ${expenses.length} despesas criadas (total: R$${expenses.reduce((s, e) => s + e.amount, 0).toFixed(2)}).\n`
  );

  // -----------------------------------------------------------------------
  // 10. REVENUES — 7 receitas para deals nos estágios "production"
  //     e "completed". Distribuídas entre status "pending" e "received".
  //     (Modelo-filho de Deal — sem organizationId)
  // -----------------------------------------------------------------------
  console.log("[10/15] Criando receitas...");

  const revenues = await db.$transaction([
    // Deal: Fotos Imobiliária Aurora (production) — 1 pending
    db.revenue.create({
      data: {
        dealId: dealProd01.id,
        description: "Sinal 40% — Fotos Imobiliária Aurora",
        amount: 1800,
        currency: "BRL",
        status: "received",
        date: dateFromStr("2026-04-10"),
      },
    }),

    // Deal: Feira de Artesanato (production) — 1 received + 1 pending
    db.revenue.create({
      data: {
        dealId: dealProd02.id,
        description: "Sinal 50% — Feira de Artesanato Regional",
        amount: 1250,
        currency: "BRL",
        status: "received",
        date: dateFromStr("2026-03-22"),
      },
    }),
    db.revenue.create({
      data: {
        dealId: dealProd02.id,
        description: "Pagamento final — Feira de Artesanato Regional",
        amount: 1250,
        currency: "BRL",
        status: "pending",
      },
    }),

    // Deal: Catálogo Outono Lojas União (completed) — 2 received
    db.revenue.create({
      data: {
        dealId: dealDone01.id,
        description: "Sinal 50% — Catálogo Outono",
        amount: 3400,
        currency: "BRL",
        status: "received",
        date: dateFromStr("2026-02-15"),
      },
    }),
    db.revenue.create({
      data: {
        dealId: dealDone01.id,
        description: "Pagamento final — Catálogo Outono",
        amount: 3400,
        currency: "BRL",
        status: "received",
        date: dateFromStr("2026-03-10"),
      },
    }),

    // Deal: Confraternização Sollari (completed) — 2 received
    db.revenue.create({
      data: {
        dealId: dealDone02.id,
        description: "Sinal 50% — Confraternização Sollari",
        amount: 2100,
        currency: "BRL",
        status: "received",
        date: dateFromStr("2025-12-01"),
      },
    }),
    db.revenue.create({
      data: {
        dealId: dealDone02.id,
        description: "Pagamento final — Confraternização Sollari",
        amount: 2100,
        currency: "BRL",
        status: "received",
        date: dateFromStr("2026-01-15"),
      },
    }),
  ]);

  const [pendingRevs, receivedRevs] = [
    revenues.filter((r) => r.status === "pending"),
    revenues.filter((r) => r.status === "received"),
  ];

  console.log(
    `  ✓ ${revenues.length} receitas criadas (${receivedRevs.length} recebidas, ${pendingRevs.length} pendentes, total: R$${revenues.reduce((s, r) => s + r.amount, 0).toFixed(2)}).\n`
  );

  // -----------------------------------------------------------------------
  // 11. BOOKINGS — 6 agendamentos com diversidade de status, datas
  //     e tipos de evento.
  //     - 2 pending, 2 confirmed, 1 completed, 1 cancelled
  //     - Datas: esta semana, próxima semana, mês passado
  // -----------------------------------------------------------------------
  console.log("[11/15] Criando bookings...");

  const bookings = await db.$transaction([
    db.booking.create({
      data: {
        organizationId: org.id,
        clientId: juliana.id,
        dealId: dealBrief01.id,
        eventType: "wedding",
        eventDate: dateFromStr("2026-05-16"), // amanhã (esta semana)
        duration: 480, // 8 horas
        location: "Fazenda Santa Luzia, Ribeirão Preto/SP",
        status: "pending",
        notes: "Chegar às 8h para fotos do making of da noiva.",
      },
    }),
    db.booking.create({
      data: {
        organizationId: org.id,
        clientId: rafael.id,
        dealId: dealQuote01.id,
        eventType: "corporate",
        eventDate: dateFromStr("2026-05-22"), // sexta próxima semana
        duration: 360, // 6 horas
        location: "TechCorp Sede - Av. Faria Lima, 4500",
        status: "confirmed",
        notes: "Início às 9h. Entrar pela recepção e procurar Rafael.",
      },
    }),
    db.booking.create({
      data: {
        organizationId: org.id,
        clientId: camila.id,
        dealId: dealQuote02.id,
        eventType: "portrait",
        eventDate: dateFromStr("2026-04-15"), // mês passado
        duration: 120, // 2 horas
        location: "Parque da Água Branca, São Paulo/SP",
        status: "completed",
        notes: null,
      },
    }),
    db.booking.create({
      data: {
        organizationId: org.id,
        clientId: bruno.id,
        dealId: dealBrief02.id,
        eventType: "product",
        eventDate: dateFromStr("2026-05-14"), // ontem (esta semana)
        duration: 480, // 8 horas
        location: "Estúdio FotoPro - Rua Augusta, 1500",
        status: "confirmed",
        notes: "Montagem do set às 7h. Primeira peça fotografada às 8h30.",
      },
    }),
    db.booking.create({
      data: {
        organizationId: org.id,
        clientId: fernanda.id,
        dealId: null, // booking sem deal vinculado
        eventType: "event",
        eventDate: dateFromStr("2026-04-28"), // mês passado
        duration: 300, // 5 horas
        location: "Buffet Villa D'Este, Campinas/SP",
        status: "cancelled",
        notes: "Cliente cancelou por conflito de agenda. Reagendar para próximo mês.",
      },
    }),
    db.booking.create({
      data: {
        organizationId: org.id,
        clientId: thiago.id,
        dealId: null, // booking sem deal vinculado
        eventType: "other",
        eventDate: dateFromStr("2026-05-19"), // terça próxima semana
        duration: 120, // 2 horas
        location: "Estúdio Ensaio - Rua Harmonia, 200, São Paulo/SP",
        status: "pending",
        notes: "Reunião de pré-produção para alinhamento de referências do clipe.",
      },
    }),
  ]);

  console.log(
    `  ✓ ${bookings.length} bookings criados (${bookings.filter((b) => b.status === "pending").length} pending, ${bookings.filter((b) => b.status === "confirmed").length} confirmed, ${bookings.filter((b) => b.status === "completed").length} completed, ${bookings.filter((b) => b.status === "cancelled").length} cancelled).\n`
  );

  // -----------------------------------------------------------------------
  // 12. PACKAGES — 5 pacotes de serviço com nomes, preços e deliverables
  //     realistas para o mercado brasileiro de foto/vídeo.
  //     Categorias: photography, videography, both.
  // -----------------------------------------------------------------------
  console.log("[12/15] Criando pacotes de serviço...");

  const packages = await db.$transaction([
    db.package.create({
      data: {
        organizationId: org.id,
        name: "Ensaio Essencial",
        description:
          "Pacote básico para ensaios fotográficos individuais ou casais. Ideal para portfólio e redes sociais.",
        price: 1500,
        currency: "BRL",
        deliverables: JSON.stringify([
          "1h de cobertura",
          "50 fotos editadas",
          "Galeria online privativa",
          "Direito de uso para redes sociais",
        ]),
        duration: 1,
        category: "photography",
        active: true,
      },
    }),
    db.package.create({
      data: {
        organizationId: org.id,
        name: "Book Premium",
        description:
          "Ensaio fotográfico completo com produção e múltiplos looks. Perfeito para atores, modelos e profissionais liberais.",
        price: 2800,
        currency: "BRL",
        deliverables: JSON.stringify([
          "3h de estúdio ou locação à escolha",
          "3 trocas de look",
          "100 fotos editadas em alta resolução",
          "Galeria online privativa",
          "10 fotos impressas 15x21cm",
          "Making of em vídeo (1 minuto)",
        ]),
        duration: 3,
        category: "photography",
        active: true,
      },
    }),
    db.package.create({
      data: {
        organizationId: org.id,
        name: "Making Of Corporativo",
        description:
          "Vídeo institucional completo com entrevistas e drone. Comunicação visual para sua empresa.",
        price: 5500,
        currency: "BRL",
        deliverables: JSON.stringify([
          "6h de cobertura",
          "Vídeo institucional editado (3 minutos)",
          "Entrevistas (até 5 pessoas)",
          "Captação com drone",
          "Trilha sonora licenciada",
          "Motion graphics (logo + dados)",
          "Versão para YouTube e LinkedIn",
        ]),
        duration: 6,
        category: "videography",
        active: true,
      },
    }),
    db.package.create({
      data: {
        organizationId: org.id,
        name: "Casamento Completo",
        description:
          "Cobertura completa de foto e vídeo para casamentos. Do making of da noiva até o último convidado.",
        price: 12000,
        currency: "BRL",
        deliverables: JSON.stringify([
          "10h de cobertura (2 fotógrafos + 1 videomaker)",
          "600 fotos editadas em alta resolução",
          "Vídeo highlight 5 minutos",
          "Making of 15 minutos",
          "Vídeo para redes sociais (1 minuto, formato 9:16)",
          "Galeria online com acesso vitalício",
          "Pendrive personalizado com todos os arquivos",
          "Álbum fotográfico 30x30cm (40 páginas)",
        ]),
        duration: 10,
        category: "both",
        active: true,
      },
    }),
    db.package.create({
      data: {
        organizationId: org.id,
        name: "Social Media Pack",
        description:
          "Pacote de conteúdo audiovisual otimizado para redes sociais. Ideal para influenciadores e marcas.",
        price: 3200,
        currency: "BRL",
        deliverables: JSON.stringify([
          "4h de gravação",
          "15 reels editados (formato 9:16)",
          "5 stories animados",
          "Trilha sonora viral licenciada",
          "Consultoria de roteiro e pauta",
          "Entrega em lote semanal",
        ]),
        duration: 4,
        category: "videography",
        active: true,
      },
    }),
  ]);

  console.log(
    `  ✓ ${packages.length} pacotes criados: ${packages.map((p) => p.name).join(", ")}\n`
  );

  // -----------------------------------------------------------------------
  // 13. PROPOSAL TEMPLATES — 3 templates de proposta para diferentes
  //     segmentos. Um inativo para testar filtros.
  // -----------------------------------------------------------------------
  console.log("[13/15] Criando templates de proposta...");

  const proposalTemplates = await db.$transaction([
    db.proposalTemplate.create({
      data: {
        organizationId: org.id,
        name: "Template Casamento",
        description:
          "Template para orçamentos de cobertura de casamento. Inclui cláusulas sobre direitos de imagem e entregáveis.",
        defaultTerms: [
          "1. O valor inclui cobertura fotográfica e/ou videográfica conforme escopo detalhado.",
          "2. Sinal de 40% no ato da assinatura do contrato para reserva da data.",
          "3. Saldo restante em até 5 dias úteis após a entrega do material final.",
          "4. Prazo de entrega: 45 dias corridos para fotos, 60 dias corridos para vídeos.",
          "5. O cliente cede direitos de uso de imagem para portfólio e redes sociais do estúdio.",
          "6. Em caso de cancelamento com menos de 60 dias de antecedência, o sinal não será reembolsado.",
          "7. Deslocamento até 50km incluso. Acima disso, R$1,50/km adicional.",
        ].join("\n"),
        defaultPackages: null,
        coverImage: null,
        isActive: true,
      },
    }),
    db.proposalTemplate.create({
      data: {
        organizationId: org.id,
        name: "Template Corporativo",
        description:
          "Template para orçamentos de fotografia e vídeo corporativo. Abrange eventos, retratos executivos e vídeos institucionais.",
        defaultTerms: [
          "1. O valor inclui cobertura conforme briefing aprovado. Alterações de escopo serão orçadas à parte.",
          "2. Sinal de 50% no ato da assinatura. Saldo em até 10 dias corridos após entrega.",
          "3. Prazo de entrega: 15 dias corridos para fotos, 30 dias corridos para vídeos institucionais.",
          "4. Cessão de direitos de uso para o cliente (uso comercial e institucional).",
          "5. O estúdio reserva o direito de uso do material para portfólio, salvo acordo em contrário.",
          "6. Horas extras de cobertura: R$350/hora por profissional adicional.",
        ].join("\n"),
        defaultPackages: null,
        coverImage: null,
        isActive: true,
      },
    }),
    db.proposalTemplate.create({
      data: {
        organizationId: org.id,
        name: "Template Retrato & Book",
        description:
          "Template para orçamentos de ensaios de retrato, book profissional e ensaios lifestyle. Atualmente inativo.",
        defaultTerms: [
          "1. O valor inclui cobertura conforme pacote selecionado.",
          "2. Pagamento integral no ato da assinatura para reserva da data.",
          "3. Prazo de entrega: 10 dias corridos para galeria online.",
          "4. Fotos extras além do pacote: R$35 por foto editada.",
          "5. Impressões adicionais: sob consulta (valores por tamanho).",
          "6. O cliente autoriza o uso das imagens para portfólio e divulgação do estúdio.",
        ].join("\n"),
        defaultPackages: null,
        coverImage: null,
        isActive: false, // template inativo para testar filtros
      },
    }),
  ]);

  console.log(
    `  ✓ ${proposalTemplates.length} templates de proposta criados (${proposalTemplates.filter((t) => t.isActive).length} ativos, ${proposalTemplates.filter((t) => !t.isActive).length} inativos).\n`
  );

  // -----------------------------------------------------------------------
  // RESUMO FINAL
  // -----------------------------------------------------------------------
  console.log("========== Seed concluído com sucesso! ==========\n");
  console.log("Resumo dos registros criados:");
  console.log(`  Organizations:     1`);
  console.log(`  Users:             1`);
  console.log(`  UserOrganizations: 1`);
  console.log(`  Clients:           ${clients.length}`);
  console.log(`  Deals:             ${deals.length}`);
  console.log(`  Briefings:         ${briefings.length}`);
  console.log(`  Expenses:          ${expenses.length}`);
  console.log(`  Revenues:          ${revenues.length}`);
  console.log(`  Bookings:          ${bookings.length}`);
  console.log(`  Packages:          ${packages.length}`);
  console.log(`  ProposalTemplates: ${proposalTemplates.length}`);
  console.log(`  DashboardSettings: 1`);
  console.log(`\nValor total em pipeline: R$${deals.reduce((s, d) => s + d.value, 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`);
  console.log(`Receitas totais: R$${revenues.filter((r) => r.status === "received").reduce((s, r) => s + r.amount, 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`);
}

main()
  .catch((error) => {
    console.error("Erro durante o seed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
