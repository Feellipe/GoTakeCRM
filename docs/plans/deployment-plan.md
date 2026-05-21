# Plano de Deploy -- GoTakeCRM

## Deploy como Dois Projetos Vercel Separados

**Versao:** 1.0
**Data:** 2026-05-19
**Projeto:** GoTakeCRM -- CRM Dashboard para Filmakers/Fotografos

---

## Sumario

- [1. Visao Geral da Arquitetura](#1-visao-geral-da-arquitetura)
- [2. Estrategia de Banco de Dados Supabase](#2-estrategia-de-banco-de-dados-supabase)
- [3. Configuracao dos Projetos Vercel](#3-configuracao-dos-projetos-vercel)
- [4. Variaveis de Ambiente](#4-variaveis-de-ambiente)
- [5. Processo de Build e Deploy](#5-processo-de-build-e-deploy)
- [6. Estrategia de Autenticacao](#6-estrategia-de-autenticacao)
- [7. Separacao de Dados e Seguranca](#7-separacao-de-dados-e-seguranca)
- [8. Pipeline CI/CD](#8-pipeline-cicd)
- [9. Instrucoes Passo a Passo](#9-instrucoes-passo-a-passo)
- [10. Pos-Deploy](#10-pos-deploy)
- [11. Resolucao de Problemas](#11-resolucao-de-problemas)
- [12. Referencia Rapida de Comandos](#12-referencia-rapida-de-comandos)

---

## 1. Visao Geral da Arquitetura

### 1.1 Conceito

O GoTakeCRM sera implantado como dois projetos Vercel independentes, apontando para o mesmo repositorio Git. Cada projeto possui seu proprio banco de dados Supabase, configuracao de build e variaveis de ambiente.

```
                        +-----------------------+
                        |   Repositorio Git     |
                        |   (GitHub: main)      |
                        +-----------+-----------+
                                    |
                    +---------------+---------------+
                    |                               |
            +-------v--------+             +--------v-------+
            |   Vercel #1    |             |   Vercel #2    |
            |  PORTFOLIO     |             |  CLIENT        |
            | gotakecrm-     |             | gotakecrm-     |
            | portfolio      |             | client         |
            +-------+--------+             +--------+-------+
                    |                               |
            +-------v--------+             +--------v-------+
            |  Supabase #1   |             |  Supabase #2   |
            |  portfolio-db  |             |  client-db     |
            | (seed data)    |             | (dados reais)  |
            +----------------+             +----------------+
```

### 1.2 Projeto Portfolio (gotakecrm-portfolio)

- **Proposito:** Demonstrar o CRM para potenciais clientes como vitrine/portfolio
- **Dados:** Dados ficticios gerados pelo seed script (8 clientes, 13 deals, 7 briefings, etc.)
- **Acesso:** Publico ou com conta demo (sem Google OAuth obrigatorio)
- **Operacoes:** CRUD completo (permitir POST/PUT/DELETE para demonstrar a experiencia completa)
- **Monitoring:** Sentry com DSN dedicado (tracesSampleRate mais baixo)

### 1.3 Projeto Client (gotakecrm-client)

- **Proposito:** CRM de producao com dados reais
- **Dados:** Dados reais de clientes do fotografo/filmmaker
- **Acesso:** Autenticacao Google OAuth obrigatoria
- **Operacoes:** CRUD completo
- **Monitoring:** Sentry com DSN dedicado (tracesSampleRate mais alto)

### 1.4 Stack Tecnica Atual

| Componente | Versao |
|---|---|
| Next.js | 16.2.6 (App Router, Turbopack, React 19) |
| Prisma | 6.19.2 |
| next-auth | v4.24.11 |
| @sentry/nextjs | v10 |
| shadcn/ui | (instalado via components.json) |
| SWR | 2.4.1 |
| Vitest | 3 |
| Node.js | 20 (CI) |

---

## 2. Estrategia de Banco de Dados Supabase

### 2.1 Decisao: Dois Projetos Supabase Separados

**Recomendacao:** Criar dois projetos Supabase completamente separados.

**Razoes:**
- Isolamento total de dados (zero risco de vazamento entre portfolio e client)
- Escalabilidade independente (o portfolio pode ter muito trafego de visitantes)
- Backup/restauracao independente
- Configuracoes de RLS (Row-Level Security) independentes
- Custos previsiveis separados
- Sem risco de interferencia humana (um erro em um banco nao afeta o outro)

**Alternativa descartada (unico projeto com schemas):**
Usar schemas PostgreSQL separados (`portfolio` e `client`) no mesmo projeto adiciona complexidade ao Prisma (multi-schemas) e ao connection pooling, sem beneficio real dado que o tier gratuito do Supabase permite multiplos projetos.

### 2.2 Setup do Projeto Supabase -- Portfolio

```bash
# 1. Acessar https://supabase.com/dashboard e criar novo projeto
#    Nome: gotakecrm-portfolio
#    Regiao: sa-east-1 (Sao Paulo) -- mais proximo do publico alvo brasileiro
#    Senha do banco: gerar senha forte e salvar no gerenciador de senhas
```

Apos criacao, obter:

```
# Connection string (Supavisor / PgBouncer -- porta 6543)
postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres

# Connection string direta (porta 5432) -- NAO usar em producao com Vercel
postgresql://postgres.[project-ref]:[password]@aws-0-[region].supabase.co:5432/postgres
```

**Importante:** Sempre usar a connection string via **pooler** (porta 6543) para producao com Vercel, pois o serverless precisa de connection pooling para nao esgotar conexoes PostgreSQL.

### 2.3 Setup do Projeto Supabase -- Client

```bash
# Mesmo processo, nome: gotakecrm-client
# Mesma regiao: sa-east-1
```

### 2.4 Aplicacao do Schema em Cada Banco

Para cada projeto Supabase, executar:

```bash
# Definir DATABASE_URL temporariamente no terminal
export DATABASE_URL="postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres"

# Gerar o client Prisma apontando para PostgreSQL
npx prisma generate --schema=prisma/schema.prod.prisma

# Enviar o schema para o banco (cria todas as tabelas)
npx prisma db push --schema=prisma/schema.prod.prisma
```

O schema `prisma/schema.prod.prisma` contem 13 modelos mapeados para tabelas PostgreSQL:
- `clients`, `deals`, `briefings`, `expenses`, `revenues`
- `conversations`, `messages`, `bookings`, `documents`
- `templates`, `packages`, `proposal_templates`, `proposals`, `dashboard_settings`

Todos os modelos usam `@@map` para nomes de tabela em snake_case e possuem indices adequados (status, client_id, deal_id, event_date).

### 2.5 Seed dos Dados no Portfolio

O seed script atual (`prisma/seed.ts`) usa `PrismaClient` importando de `@prisma/client`, que por padrao usa o schema SQLite. Para popular o Supabase PostgreSQL do portfolio, e necessario:

**Opcao A -- Script dedicado de seed para PostgreSQL:**

Criar `prisma/seed.portfolio.ts` que explicitamente configura o datasource:

```typescript
// prisma/seed.portfolio.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL, // Supabase Portfolio URL
    },
  },
  log: ["error", "warn"],
});

// ... mesmos dados do seed.ts original ...
```

Execucao:

```bash
export DATABASE_URL="postgresql://postgres.[portfolio-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres"
npx tsx prisma/seed.portfolio.ts
```

**Opcao B -- Adaptar seed.ts existente (recomendado para manutencao):**

Modificar `prisma/seed.ts` para aceitar `DATABASE_URL` via variavel de ambiente e detectar o provider. O client Prisma ja honra `DATABASE_URL` quando gerado com `--schema=prisma/schema.prod.prisma`.

```bash
# Gerar client com schema de producao
npx prisma generate --schema=prisma/schema.prod.prisma

# Executar seed (ele usara o DATABASE_URL apontando para o Supabase Portfolio)
export DATABASE_URL="postgresql://postgres.[portfolio-ref]:[password]@..."
npx tsx prisma/seed.ts
```

**Nota sobre o seed:** O script limpa todas as tabelas (`deleteMany`) antes de inserir. No portfolio, executar apenas uma vez apos a criacao do banco. Se precisar re-seed, executar novamente.

### 2.6 Connection Pooling -- Supavisor

O Supabase utiliza o **Supavisor** como connection pooler (sucessor do PgBouncer). A string de conexao via pooler ja esta configurada na porta 6543.

**Configuracoes relevantes para Vercel serverless:**

| Parametro | Valor Recomendado | Nota |
|---|---|---|
| `connection_limit` | Padrao Supabase (20 por projeto) | Ajustar no dashboard se necessario |
| Pool mode | `transaction` (padrao do Supavisor) | Ideal para serverless |
| `pool_size` | Auto (Supavisor gerencia) | Nao precisa ajustar manualmente |

**Na pratica, nenhuma configuracao adicional e necessaria.** Basta usar a connection string do pooler (porta 6543).

### 2.7 Verificacao da Conexao

Apos aplicar o schema, verificar no dashboard do Supabase:
1. **Table Editor** -- todas as 13 tabelas devem aparecer
2. **SQL Editor** -- executar `SELECT count(*) FROM clients;` (deve retornar 0 para client-db, 8 para portfolio-db apos seed)
3. **Connection Pooling** -- confirmar que a string de conexao usa a porta 6543

---

## 3. Configuracao dos Projetos Vercel

### 3.1 Estrategia: Mesmo Repo, Dois Projetos

Ambos os projetos Vercel apontarao para o mesmo repositorio GitHub, mas com configuracoes diferentes via variaveis de ambiente. O codigo base e identico; a diferenciacao ocorre por:

1. **Variaveis de ambiente** (DATABASE_URL, NEXTAUTH_URL, SENTRY_DSN, modo de operacao)
2. **Variavel de modo** `APP_MODE=portfolio` vs `APP_MODE=client`

### 3.2 Criacao dos Projetos Vercel

```bash
# Via CLI do Vercel (recomendado)
npm i -g vercel

# Projeto Portfolio
vercel --name gotakecrm-portfolio

# Projeto Client
vercel --name gotakecrm-client
```

Ou via dashboard em https://vercel.com/new:
1. **Import Git Repository** -- selecionar o repositorio GoTakeCRM
2. **Framework Preset:** Next.js (detectado automaticamente)
3. **Root Directory:** `./` (raiz do repositorio)
4. **Repetir** para o segundo projeto com nome diferente

### 3.3 Configuracao de Build

Ambos os projetos compartilham as mesmas configuracoes de build:

| Configuracao | Valor |
|---|---|
| **Framework Preset** | Next.js |
| **Build Command** | `npx prisma generate --schema=prisma/schema.prod.prisma && npm run build` |
| **Output Directory** | `.next` (padrao Next.js) |
| **Install Command** | `npm ci` |
| **Node.js Version** | 20.x |
| **Root Directory** | `./` |

**Justificativa do build command:** O `postinstall` no `package.json` executa `prisma generate` com o schema padrao (SQLite). Em producao, precisamos gerar o client com o schema PostgreSQL. O comando explicito `--schema=prisma/schema.prod.prisma` antes do build garante isso.

**Nota sobre `ignoreBuildErrors: true` em `next.config.ts`:** O `next.config.ts` atual define `typescript.ignoreBuildErrors: true`. Isso significa que erros de TypeScript nao impedem o build. Para producao, considere remover essa configuracao e corrigir todos os erros de tipagem antes do primeiro deploy. Alternativamente, deixe ativo no portfolio e remova no client para garantir mais rigor.

### 3.4 Dominios Personalizados

| Projeto | Dominio Sugerido | Configuracao DNS |
|---|---|---|
| Portfolio | `portfolio.gotake.com.br` ou `demo.gotakecrm.com` | CNAME para `cname.vercel-dns.com` |
| Client | `app.gotakecrm.com` ou `crm.gotake.com.br` | CNAME para `cname.vercel-dns.com` |

**Passos:**
1. Acessar Settings > Domains no dashboard de cada projeto Vercel
2. Adicionar o dominio personalizado
3. Configurar DNS no provedor (registro CNAME apontando para `cname.vercel-dns.com`)
4. Vercel emite certificado SSL automaticamente (Let's Encrypt)

**Dominio padrao (subdomain Vercel):** Se nao tiver dominio personalizado, cada projeto recebe um subdomain:
- Portfolio: `gotakecrm-portfolio.vercel.app`
- Client: `gotakecrm-client.vercel.app`

---

## 4. Variaveis de Ambiente

### 4.1 Projeto Portfolio (gotakecrm-portfolio)

| Variavel | Valor | Descricao |
|---|---|---|
| `APP_MODE` | `portfolio` | Identifica o modo de operacao (usado pelo middleware) |
| `NODE_ENV` | `production` | Definido automaticamente pelo Vercel |
| `DATABASE_URL` | `postgresql://postgres.[portfolio-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres` | Supabase Portfolio (via pooler) |
| `NEXTAUTH_URL` | `https://gotakecrm-portfolio.vercel.app` | URL base do projeto portfolio |
| `NEXTAUTH_SECRET` | `[secret-aleatorio-32-char]` | Gerar com `openssl rand -base64 32` |
| `NEXT_PUBLIC_APP_MODE` | `portfolio` | Exposicao ao cliente (para UI condicional) |
| `NEXT_PUBLIC_SENTRY_DSN` | `https://[key]@sentry.io/[portfolio-project-id]` | DSN do projeto Sentry do portfolio |
| `SENTRY_DSN` | `https://[key]@sentry.io/[portfolio-project-id]` | Mesmo DSN (backend) |

**Portfolio NAO precisa de:**
- `NEXTAUTH_GOOGLE_ID` / `NEXTAUTH_GOOGLE_SECRET` (autenticacao desabilitada)
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`

### 4.2 Projeto Client (gotakecrm-client)

| Variavel | Valor | Descricao |
|---|---|---|
| `APP_MODE` | `client` | Identifica o modo de operacao |
| `NODE_ENV` | `production` | Definido automaticamente pelo Vercel |
| `DATABASE_URL` | `postgresql://postgres.[client-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres` | Supabase Client (via pooler) |
| `NEXTAUTH_URL` | `https://gotakecrm-client.vercel.app` | URL base do projeto client |
| `NEXTAUTH_SECRET` | `[secret-aleatorio-32-char-diferente]` | Gerar novo secret (diferente do portfolio) |
| `NEXTAUTH_GOOGLE_ID` | `[google-client-id]` | Google OAuth Client ID |
| `NEXTAUTH_GOOGLE_SECRET` | `[google-client-secret]` | Google OAuth Client Secret |
| `NEXT_PUBLIC_APP_MODE` | `client` | Exposicao ao cliente |
| `NEXT_PUBLIC_SENTRY_DSN` | `https://[key]@sentry.io/[client-project-id]` | DSN do projeto Sentry do client |
| `SENTRY_DSN` | `https://[key]@sentry.io/[client-project-id]` | Mesmo DSN (backend) |

### 4.3 Geracao de Secrets

```bash
# Gerar NEXTAUTH_SECRET para cada projeto (NAO reutilizar)
openssl rand -base64 32
# Resultado esperado: string base64 de ~43 caracteres
```

### 4.4 Configuracao no Vercel

As variaveis de ambiente sao configuradas em cada projeto Vercel:
1. Dashboard > Settings > Environment Variables
2. Adicionar cada variavel
3. Selecionar os ambientes: Production, Preview, Development

**Alternativa via CLI:**

```bash
# Para o projeto portfolio
cd /path/to/GoTakeCRM
vercel env add APP_MODE production   # valor: portfolio
vercel env add DATABASE_URL production  # colar a connection string
vercel env add NEXTAUTH_URL production  # https://gotakecrm-portfolio.vercel.app
vercel env add NEXTAUTH_SECRET production  # colar o secret gerado
vercel env add NEXT_PUBLIC_APP_MODE production  # portfolio
vercel env add NEXT_PUBLIC_SENTRY_DSN production  # colar o DSN
vercel env add SENTRY_DSN production  # colar o DSN

# Para o projeto client
vercel --name gotakecrm-client
# Repetir com os valores do client
vercel env add APP_MODE production   # valor: client
vercel env add DATABASE_URL production  # connection string do Supabase Client
vercel env add NEXTAUTH_URL production  # https://gotakecrm-client.vercel.app
vercel env add NEXTAUTH_SECRET production  # secret diferente
vercel env add NEXTAUTH_GOOGLE_ID production  # Google Client ID
vercel env add NEXTAUTH_GOOGLE_SECRET production  # Google Client Secret
vercel env add NEXT_PUBLIC_APP_MODE production  # client
vercel env add NEXT_PUBLIC_SENTRY_DSN production  # DSN do Sentry client
vercel env add SENTRY_DSN production  # DSN do Sentry client
```

### 4.5 Google OAuth -- Mesmo App ou Separado?

**Recomendacao: Um unico Google OAuth App com multiplos redirect URIs.**

Razoes:
- Mesma entidade (GoTakeCRM)
- Menos configuracao para manter
- O Google OAuth app suporta multiplos URIs autorizados

**URIs autorizados no Google Cloud Console (APIs & Services > Credentials):**

```
# Client
https://gotakecrm-client.vercel.app/api/auth/callback/google
https://gotakecrm-client.vercel.app

# Portfolio (se decidir ter autenticacao demo)
https://gotakecrm-portfolio.vercel.app/api/auth/callback/google

# Desenvolvimento local (opcional)
http://localhost:3000/api/auth/callback/google
http://localhost:3000
```

Se usar dominio personalizado, adicionar tambem:
```
https://app.gotakecrm.com/api/auth/callback/google
https://app.gotakecrm.com
```

**Se depois for necessario restringir acesso por dominio,** criar dois OAuth apps separados e configurar cada Vercel project com seu proprio `NEXTAUTH_GOOGLE_ID`/`NEXTAUTH_GOOGLE_SECRET`.

---

## 5. Processo de Build e Deploy

### 5.1 Comando de Build

O comando de build para ambos os projetos deve ser:

```bash
npx prisma generate --schema=prisma/schema.prod.prisma && npm run build
```

**Explicacao passo a passo:**

1. `npx prisma generate --schema=prisma/schema.prod.prisma`
   - Gera o Prisma Client otimizado para PostgreSQL
   - O client gerado se conecta ao banco definido em `DATABASE_URL`
   - Substitui o client SQLite gerado pelo `postinstall`

2. `npm run build` (que executa `next build`)
   - Compila a aplicacao Next.js
   - Gera rotas estaticas e serverless functions
   - Valida TypeScript (com `ignoreBuildErrors: true`, erros TS nao falham o build)

### 5.2 Por que `postinstall` NAO basta

O `package.json` define:

```json
"postinstall": "prisma generate"
```

Isso gera o client usando o schema padrao (`prisma/schema.prisma` -- SQLite). Em producao Vercel, precisamos do schema PostgreSQL. Por isso, o build command substitui explicitamente a geracao do client antes do build.

**Alternativa (mudar o postinstall):**

Se preferir que o `postinstall` ja gere o client correto, pode-se adicionar ao `package.json`:

```json
"postinstall:prod": "prisma generate --schema=prisma/schema.prod.prisma"
```

E no Vercel, definir `INSTALL_CMD=npm ci && npm run postinstall:prod`.

**Porem, a abordagem recomendada e manter o build command explicito** pois e mais claro e facil de debugar.

### 5.3 Prisma Generate -- Comportamento no Vercel

O Vercel executa o build em uma Lambda/container efemera. O fluxo e:

1. `npm ci` -- instala dependencias, executa `postinstall` (gera client SQLite -- descartado)
2. Build command explicito -- `prisma generate` com schema prod (gera client PostgreSQL)
3. `next build` -- compila usando o client PostgreSQL

O step 1 gera arquivos que sao sobrescritos no step 2. Funciona corretamente, mas adiciona alguns segundos ao build.

**Otimizacao:** Para evitar a geracao SQLite desnecessaria, pode-se remover `postinstall` e depender apenas do build command. Isso requer testar se o `npm ci` funciona sem o postinstall (provavelmente sim, pois o Prisma Client gerado e apenas para runtime, nao para install).

### 5.4 Diferencas de Build entre Portfolio e Client

**Nao ha diferencas de build entre os dois projetos.** O mesmo codigo e compilado para ambos. A diferenciacao e 100% via variaveis de ambiente:

- `APP_MODE=portfolio` -- o middleware bypassa autenticacao
- `APP_MODE=client` -- o middleware exige autenticacao Google OAuth
- `DATABASE_URL` -- aponta para banco diferente

### 5.5 Build Locais para Teste

```bash
# Testar build de producao localmente (portfolio)
APP_MODE=portfolio \
DATABASE_URL="postgresql://postgres.[portfolio-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres" \
NEXTAUTH_URL="http://localhost:3000" \
npx prisma generate --schema=prisma/schema.prod.prisma && npm run build

# Testar build de producao localmente (client)
APP_MODE=client \
DATABASE_URL="postgresql://postgres.[client-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres" \
NEXTAUTH_URL="http://localhost:3000" \
NEXTAUTH_GOOGLE_ID="[id]" \
NEXTAUTH_GOOGLE_SECRET="[secret]" \
NEXTAUTH_SECRET="[secret]" \
npx prisma generate --schema=prisma/schema.prod.prisma && npm run build
```

---

## 6. Estrategia de Autenticacao

### 6.1 Autenticacao Atual

O middleware atual (`src/pro.ts`, renomeado de `middleware.ts` no Next.js 16) implementa:

```typescript
// Skip auth in development to allow local testing without Google OAuth
if (process.env.NODE_ENV === 'development') {
  return NextResponse.next();
}
```

Em producao, usa `withAuth` do next-auth para proteger todas as rotas exceto:
- `/api/auth/*`
- `/auth`
- `/_next/static/*`
- `/_next/image/*`
- `/favicon.ico`

### 6.2 Autenticacao do Portfolio -- Modo Publico (Recomendado)

Para o portfolio, a autenticacao deve ser **completamente desabilitada** para que visitantes possam navegar livremente.

**Modificacao necessaria no `src/proxy.ts`:**

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { withAuth } from 'next-auth/middleware';
import { logger } from '@/lib/logger';

export default async function middleware(request: NextRequest) {
  // Skip auth in development to allow local testing without Google OAuth
  if (process.env.NODE_ENV === 'development') {
    return NextResponse.next();
  }

  // Portfolio mode: public access, no authentication required
  if (process.env.APP_MODE === 'portfolio') {
    return NextResponse.next();
  }

  // Client mode: full authentication required
  try {
    return await withAuth({
      pages: {
        signIn: '/api/auth/signin',
      },
    })(request);
  } catch (error) {
    logger.error('Middleware error', { error: String(error), path: request.nextUrl.pathname });
    return NextResponse.redirect(new URL('/api/auth/signin', request.url));
  }
}

export const config = {
  matcher: [
    "/((?!api/auth|auth|_next/static|_next/image|favicon.ico).*)",
  ],
};
```

**Vantagens:**
- Zero friccao para visitantes
- Nao precisa configurar Google OAuth para o portfolio
- Funciona como vitrine estatica de funcionalidades

### 6.3 Autenticacao do Portfolio -- Conta Demo (Alternativa)

Se desejar que o portfolio mostre a experiencia de login (mas com conta pre-configurada):

1. Criar uma conta Google ficticia para demo
2. Configurar Google OAuth no portfolio com as credenciais
3. Compartilhar credenciais de login demo no portfolio (ou usar magic link)

**Esta abordagem adiciona complexidade sem beneficio claro para uma vitrine.**

### 6.4 Autenticacao do Client -- Google OAuth Completo

O client usa a autenticacao existente sem alteracoes:
- Google OAuth via next-auth
- JWT session strategy
- `NEXTAUTH_SECRET`, `NEXTAUTH_GOOGLE_ID`, `NEXTAUTH_GOOGLE_SECRET` obrigatorios
- Callback do NextAuth (`src/app/api/auth/[...nextauth]/route.ts`) permanece inalterado

**Validacao ja implementada:** O callback do NextAuth ja verifica as variaveis obrigatorias e lanca erro em producao se ausentes.

### 6.5 Pagina de Login no Portfolio

Quando o modo portfolio esta ativo e um visitante tenta acessar `/api/auth/signin`, o NextAuth pode retornar erro (sem credenciais Google configuradas). Duas opcoes:

**Opcao A (recomendada):** Adicionar um redirecionamento no `src/app/api/auth/signin/page.tsx` (ou equivalente) que redireciona para `/dashboard` no modo portfolio.

**Opcao B:** O matcher do middleware ja exclui `/api/auth`, entao nao ha redirecionamento para login. A pagina de login nativa do next-auth so sera acessada se o visitante navegar manualmente para `/api/auth/signin`, o que e improvavel no modo portfolio.

---

## 7. Separacao de Dados e Seguranca

### 7.1 Isolamento Fisico

A separacao e garantida pela arquitetura:

```
Portfolio (Vercel) --> DATABASE_URL --> Supabase Portfolio DB
Client (Vercel)    --> DATABASE_URL --> Supabase Client DB
```

Cada projeto Vercel so conhece sua propria `DATABASE_URL`. Nao ha conexao cruzada possivel.

### 7.2 Protecao das APIs no Portfolio

O portfolio permite CRUD completo (POST, PUT, DELETE) para que os visitantes possam experimentar a funcionalidade total do CRM. Os dados do portfolio sao ficticios, portanto nao ha risco em permitir escrita.

**Consideracoes:**
- Visitantes podem criar/editar/excluir dados livremente
- O banco de dados do portfolio pode ser re-seed a qualquer momento: `npx tsx prisma/seed.ts`
- Rate limiting existente (`rate-limit.ts`) protege contra abuso (scraping, DDoS)
- Se o portfolio receber trafego abusivo, considerar rate limiting mais agressivo especificamente para o modo portfolio

### 7.3 Seguranca de Rede

- **Vercel** fornece HTTPS automaticamente
- **Supabase** exige SSL para conexoes de fora da rede
- **Rate limiting** ja implementado nas APIs
- **CSRF protection** ja implementado (via next-auth)
- **Audit logging** ja implementado

### 7.4 Dados Sensiveis no Portfolio

O seed data contem nomes ficticios brasileiros (Ana Clara, Rafael, Mariana, etc.) e dados de eventos (casamentos, corporativos). Verificar se algum dado e realisticamente identificavel:

- **Nomes:** Ficticios, OK
- **Telefones:** Verificar se os telefones no seed sao claramente ficticios (ex: com prefixo 000 ou 999)
- **Emails:** Verificar se os emails no seed sao ficticios
- **Enderecos/locais:** Revisar o seed para garantir que locais de eventos nao sejam residencias reais

**Acao recomendada:** Audit visual rapido do `prisma/seed.ts` para garantir que todos os dados PII sao ficticios e nao identificaveis.

---

## 8. Pipeline CI/CD

### 8.1 Estrategia: Branch-based Deployment

```
branch: main ---------------------------> gotakecrm-client (auto-deploy)
branch: deploy/portfolio --------------> gotakecrm-portfolio (auto-deploy)
branch: feature/* ----------------------> Preview Deployments (ambos os projetos)
```

**Fluxo:**
1. Desenvolvimento em branches `feature/*`
2. Pull requests para `main` -- CI valida (lint, type-check, build, test)
3. Merge em `main` -- deploy automatico para **gotakecrm-client**
4. Merge em `deploy/portfolio` -- deploy automatico para **gotakecrm-portfolio**
5. Preview deployments para cada PR em ambos os projetos

### 8.2 Configuracao no Vercel

No dashboard de cada projeto:

**gotakecrm-client:**
- Production Branch: `main`
- Auto-deploy: habilitado

**gotakecrm-portfolio:**
- Production Branch: `deploy/portfolio`
- Auto-deploy: habilitado

### 8.3 CI/CD Atual -- Modificacoes Necessarias

O CI atual (`.github/workflows/ci.yml`):

```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npx prisma generate
      - run: npx tsc --noEmit
      - run: npm run lint
      - run: npm run build
```

**Problemas com o CI atual para deploy de dois projetos:**

1. `prisma generate` usa schema padrao (SQLite) -- o `npm run build` pode funcionar pois o `next.config.ts` tem `ignoreBuildErrors: true`, mas `tsc --noEmit` pode falhar se o client gerado nao corresponde ao schema em uso
2. So executa na branch `main`
3. Nao testa com schema de producao

**CI atualizado (`.github/workflows/ci.yml`):**

```yaml
name: CI

on:
  push:
    branches: [main, deploy/portfolio]
  pull_request:
    branches: [main, deploy/portfolio]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npx prisma generate
      - run: npx tsc --noEmit
      - run: npm run lint
      - run: npm run build
      - run: npm run test

  validate-prod-schema:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      # Gera client com schema de producao e verifica se compila
      - run: npx prisma generate --schema=prisma/schema.prod.prisma
      - run: npx tsc --noEmit
```

### 8.4 Preview Deployments

O Vercel cria automaticamente preview deployments para cada PR. Para garantir que ambos os projetos recebam previews:

**Opcao A (simples):** Habilitar preview deployments no Vercel dashboard para cada projeto. Cada PR criara previews em ambos os projetos com URLs `*.vercel.app`.

**Opcao B (otimizada):** Usar Vercel Ignored Build Step para economizar builds:

```bash
# No projeto gotakecrm-client -- so buildar se houver mudancas relevantes
# (nao buildar para PRs que so alteram docs ou config)
if [ "$VERCEL_GIT_COMMIT_REF" = "deploy/portfolio" ]; then
  echo "Skipping client build for portfolio-only changes"
  exit 0  # skip
fi
```

### 8.5 Deploy Manual

```bash
# Deploy portfolio
git checkout deploy/portfolio
git merge main  # ou a branch com as mudancas desejadas
vercel --prod --name gotakecrm-portfolio

# Deploy client
git checkout main
vercel --prod --name gotakecrm-client
```

---

## 9. Instrucoes Passo a Passo

### 9.1 Checklist Pre-Deploy

- [ ] Repositorio limpo, todos os commits em `main`
- [ ] `npm run lint` passa sem erros
- [ ] `npx tsc --noEmit` passa sem erros (ou `ignoreBuildErrors: true` esta intencional)
- [ ] `npm run build` completa com sucesso localmente
- [ ] `npm run test` passa
- [ ] Seed data auditado (dados ficticios, sem PII real)
- [ ] Conta Google Cloud Console configurada com OAuth app
- [ ] Conta Sentry com dois projetos criados (portfolio e client)
- [ ] Dominio personalizado configurado (opcional)

### 9.2 Passo 1 -- Criar Projetos Supabase

```bash
# 1. Acessar https://supabase.com/dashboard
# 2. Criar projeto "gotakecrm-portfolio" (regiao: sa-east-1)
#    - Anotar: Project Reference, Senha do banco
# 3. Criar projeto "gotakecrm-client" (regiao: sa-east-1)
#    - Anotar: Project Reference, Senha do banco
```

Para cada projeto:

```bash
# Aplicar o schema
export DATABASE_URL="postgresql://postgres.[REF]:[PASSWORD]@aws-0-sa-east-1.pooler.supabase.com:6543/postgres"

npx prisma db push --schema=prisma/schema.prod.prisma

# Verificar
# Acessar Supabase Dashboard > Table Editor -- conferir 13 tabelas
```

### 9.3 Passo 2 -- Seed do Portfolio

```bash
export DATABASE_URL="postgresql://postgres.[PORTFOLIO-REF]:[PASSWORD]@aws-0-sa-east-1.pooler.supabase.com:6543/postgres"

# Gerar client PostgreSQL
npx prisma generate --schema=prisma/schema.prod.prisma

# Executar seed
npx tsx prisma/seed.ts
```

**Verificar:**
```
# No SQL Editor do Supabase Portfolio:
SELECT count(*) FROM clients;    -- esperado: 8
SELECT count(*) FROM deals;      -- esperado: 13
SELECT count(*) FROM briefings;  -- esperado: 7
SELECT count(*) FROM bookings;   -- esperado: 6
SELECT count(*) FROM packages;   -- esperado: 5
```

### 9.4 Passo 3 -- Criar Projetos Sentry

```bash
# 1. Acessar https://sentry.io
# 2. Criar projeto "gotakecrm-portfolio" (platform: Next.js)
#    - Copiar DSN
# 3. Criar projeto "gotakecrm-client" (platform: Next.js)
#    - Copiar DSN
```

### 9.5 Passo 4 -- Configurar Google OAuth

```bash
# 1. Acessar https://console.cloud.google.com
# 2. APIs & Services > Credentials
# 3. Criar OAuth 2.0 Client ID (tipo: Web application)
# 4. Adicionar URIs autorizadas:
#    - https://gotakecrm-client.vercel.app
#    - https://gotakecrm-client.vercel.app/api/auth/callback/google
#    - (se portfolio tiver auth) https://gotakecrm-portfolio.vercel.app/api/auth/callback/google
# 5. Copiar Client ID e Client Secret
```

### 9.6 Passo 5 -- Modificar o Middleware

Atualizar `src/proxy.ts` para suportar `APP_MODE=portfolio` (ver secao 6.2).

### 9.7 Passo 6 -- Criar Projetos Vercel

```bash
# Instalar Vercel CLI
npm i -g vercel

# Login
vercel login

# Criar projeto portfolio
vercel --name gotakecrm-portfolio

# Criar projeto client
vercel --name gotakecrm-client
```

Ou via dashboard: https://vercel.com/new > Import Git Repository

### 9.9 Passo 8 -- Configurar Variaveis de Ambiente no Vercel

**Portfolio (via CLI):**

```bash
# Selecionar o projeto portfolio
vercel link --name gotakecrm-portfolio

# Adicionar variaveis
vercel env add APP_MODE production
# Valor: portfolio

vercel env add DATABASE_URL production
# Valor: postgresql://postgres.[PORTFOLIO-REF]:[PASSWORD]@aws-0-sa-east-1.pooler.supabase.com:6543/postgres

vercel env add NEXTAUTH_URL production
# Valor: https://gotakecrm-portfolio.vercel.app

vercel env add NEXTAUTH_SECRET production
# Valor: [resultado de: openssl rand -base64 32]

vercel env add NEXT_PUBLIC_APP_MODE production
# Valor: portfolio

vercel env add NEXT_PUBLIC_SENTRY_DSN production
# Valor: https://[KEY]@sentry.io/[PORTFOLIO-PROJECT-ID]

vercel env add SENTRY_DSN production
# Valor: https://[KEY]@sentry.io/[PORTFOLIO-PROJECT-ID]
```

**Client (via CLI):**

```bash
vercel link --name gotakecrm-client

vercel env add APP_MODE production
# Valor: client

vercel env add DATABASE_URL production
# Valor: postgresql://postgres.[CLIENT-REF]:[PASSWORD]@aws-0-sa-east-1.pooler.supabase.com:6543/postgres

vercel env add NEXTAUTH_URL production
# Valor: https://gotakecrm-client.vercel.app

vercel env add NEXTAUTH_SECRET production
# Valor: [resultado de: openssl rand -base64 32]

vercel env add NEXTAUTH_GOOGLE_ID production
# Valor: [GOOGLE_CLIENT_ID]

vercel env add NEXTAUTH_GOOGLE_SECRET production
# Valor: [GOOGLE_CLIENT_SECRET]

vercel env add NEXT_PUBLIC_APP_MODE production
# Valor: client

vercel env add NEXT_PUBLIC_SENTRY_DSN production
# Valor: https://[KEY]@sentry.io/[CLIENT-PROJECT-ID]

vercel env add SENTRY_DSN production
# Valor: https://[KEY]@sentry.io/[CLIENT-PROJECT-ID]
```

### 9.10 Passo 9 -- Configurar Build Command no Vercel

Para cada projeto no Vercel Dashboard > Settings > General:

- **Build Command:** `npx prisma generate --schema=prisma/schema.prod.prisma && npm run build`
- **Install Command:** `npm ci`
- **Output Directory:** `.next` (deixe vazio ou padrao)

### 9.11 Passo 10 -- Configurar Branches de Deploy

**gotakecrm-client:**
- Vercel Dashboard > Settings > Git > Production Branch: `main`

**gotakecrm-portfolio:**
- Vercel Dashboard > Settings > Git > Production Branch: `deploy/portfolio`
- Criar a branch:

```bash
git checkout main
git checkout -b deploy/portfolio
git push -u origin deploy/portfolio
```

### 9.12 Passo 11 -- Primeiro Deploy

```bash
# Deploy portfolio
git checkout deploy/portfolio
vercel --prod

# Deploy client
git checkout main
vercel --prod
```

### 9.13 Passo 12 -- Verificacao Pos-Deploy

**Portfolio (`https://gotakecrm-portfolio.vercel.app`):**

1. Acessar a URL -- deve carregar o dashboard sem redirecionar para login
2. Verificar se os dados do seed aparecem (8 clientes, deals, etc.)
3. Tentar criar um novo cliente via API (POST) -- deve funcionar (CRUD completo)
4. Editar um deal existente via drag-and-drop no pipeline -- deve funcionar
5. Excluir um cliente -- deve funcionar
6. Verificar se as paginas carregam sem erros (Dashboard, Clientes, Pipeline, etc.)
5. Verificar Sentry -- nao deve haver erros nao tratados
6. Testar responsividade mobile
7. Verificar Sentry -- nao deve haver erros nao tratados

**Client (`https://gotakecrm-client.vercel.app`):**

1. Acessar a URL -- deve redirecionar para Google Sign-In
2. Fazer login com conta Google autorizada
3. Verificar dashboard vazio (sem dados)
4. Criar um cliente de teste
5. Criar um deal de teste
6. Verificar se os dados persistem apos refresh
7. Verificar Sentry -- nao deve haver erros nao tratados
8. Testar logout e login novamente

---

## 10. Pos-Deploy

### 10.1 Monitoring com Sentry

**Projeto Portfolio:**
- `tracesSampleRate: 0.05` (amostragem baixa -- visitas publicas geram muito tráfego)
- `replaysSessionSampleRate: 0` (desabilitar session replays para poupar quota)
- `replaysOnErrorSampleRate: 0.5` (capturar replays apenas em erros)

**Projeto Client:**
- `tracesSampleRate: 0.1` (amostragem moderada -- poucos usuarios)
- `replaysSessionSampleRate: 0.1` (capturar replays de sessao)
- `replaysOnErrorSampleRate: 1.0` (capturar todas as replays de erro)

**Nota:** Para configurar DSNs diferentes por projeto, os arquivos `sentry.client.config.ts`, `sentry.server.config.ts` e `sentry.edge.config.ts` ja usam `process.env.NEXT_PUBLIC_SENTRY_DSN`. Basta definir o DSN correto como variavel de ambiente em cada projeto Vercel. Nenhuma alteracao de codigo e necessaria se os valores de `tracesSampleRate` forem os mesmos para ambos. Se desejar taxas diferentes, condicionar pelo `APP_MODE`:

```typescript
// sentry.client.config.ts
import * as Sentry from '@sentry/nextjs';

const isPortfolio = process.env.NEXT_PUBLIC_APP_MODE === 'portfolio';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: isPortfolio ? 0.05 : 0.1,
  replaysSessionSampleRate: isPortfolio ? 0 : 0.1,
  replaysOnErrorSampleRate: isPortfolio ? 0.5 : 1.0,
});
```

### 10.2 Estrategia de Backup do Banco de Dados

**Supabase fornece backup automatico:**
- **Free tier:** Backup diario de 7 dias (point-in-time recovery)
- **Pro tier:** Backup diario de 30 dias + point-in-time recovery

**Acoes recomendadas:**

1. **Verificar configuracao de backup** em cada projeto Supabase:
   - Dashboard > Settings > Database > Backups
   - Confirmar que "PITR" (Point-in-Time Recovery) esta habilitado

2. **Backup manual periodico (opcional):**
   ```bash
   # Dump do portfolio
   pg_dump "postgresql://postgres.[REF]:[PASSWORD]@aws-0-sa-east-1.pooler.supabase.com:6543/postgres" \
     > backup-portfolio-$(date +%Y%m%d).sql

   # Dump do client
   pg_dump "postgresql://postgres.[REF]:[PASSWORD]@aws-0-sa-east-1.pooler.supabase.com:6543/postgres" \
     > backup-client-$(date +%Y%m%d).sql
   ```

3. **Para restaurar o portfolio:** Simplesmente re-executar o seed script apos um `prisma db push`.

### 10.3 SSL/HTTPS

O Vercel fornece SSL automaticamente via Let's Encrypt para:
- Subdomains `*.vercel.app`
- Dominios personalizados configurados

Nenhuma acao adicional e necessaria.

### 10.4 Performance Monitoring

**Vercel Analytics (opcional):**
```bash
npm install @vercel/analytics
# Adicionar <Analytics /> ao layout raiz
```

**Vercel Speed Insights (opcional):**
```bash
npm install @vercel/speed-insights
# Adicionar <SpeedInsights /> ao layout raiz
```

**Avaliar se e necessario para o portfolio** (dados publicos de performance vs privacidade).

### 10.5 SEO

O projeto ja possui:
- `src/app/robots.ts` -- configura robots.txt
- `src/app/sitemap.ts` -- gera sitemap
- Favicon dinamico

**Para o portfolio:**
- `robots.ts` deve permitir indexacao completa (para que o portfolio seja encontravel)
- `sitemap.ts` deve incluir as paginas publicas
- Adicionar meta tags OG para compartilhamento em redes sociais

**Para o client:**
- `robots.ts` deve bloquear indexacao (dados privados do CRM)
- Modificar `robots.ts` baseado no `APP_MODE`:

```typescript
// src/app/robots.ts
import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const isPortfolio = process.env.NEXT_PUBLIC_APP_MODE === 'portfolio';

  if (isPortfolio) {
    return {
      rules: { userAgent: '*', allow: '/' },
      sitemap: `${process.env.NEXTAUTH_URL}/sitemap.xml`,
    };
  }

  return {
    rules: { userAgent: '*', disallow: '/' },
  };
}
```

---

## 11. Resolucao de Problemas

### 11.1 Problemas Comuns com Next.js 16 no Vercel

**Problema: Build falha com erro de Turbopack**

O projeto usa Turbopack (`--turbopack` no `next dev`), mas o Vercel usa o bundler padrao do Next.js para builds de producao. O `next build` nao usa Turbopack por padrao.

```
Erro: "Turbopack is not supported in production builds"
```

**Solucao:** Nao usar `--turbopack` no build command. O build command correto e apenas `npm run build` (que executa `next build` sem flags).

---

**Problema: Middleware nao funciona (proxy.ts)**

No Next.js 16, o middleware foi renomeado para `proxy.ts`. O Vercel pode nao reconhecer automaticamente.

```
Erro: Middleware is not being executed
```

**Solucao:** Verificar se o Vercel esta usando Next.js 16.2.6+ (que suporta `proxy.ts`). Se o Vercel usar uma versao anterior, renomear `src/proxy.ts` para `src/middleware.ts` temporariamente. O Vercel instala a versao exata do `package.json`, entao `next@^16.2.6` deve funcionar.

**Verificacao:**
```bash
# No Vercel build logs, procurar:
# "Next.js 16.2.6"
# "Detected Next.js version: 16.2.6"
```

---

**Problema: `ignoreBuildErrors: true` mascara erros**

```
Erro: Build passa mas a aplicacao falha em producao
```

**Solucao:** Remover `typescript.ignoreBuildErrors: true` de `next.config.ts` antes do deploy de producao e corrigir todos os erros de TypeScript. Manter no portfolio inicialmente se houver pressao de tempo, mas corrigir o mais rapido possivel.

---

**Problema: Imagens de avatar (DiceBear) nao carregam**

```
Erro: Next Image Optimization failing for external images
```

**Solucao:** O `next.config.ts` ja configura `remotePatterns` para `api.dicebear.com`. Se adicionar outros dominios de imagem, atualizar a config.

---

**Problema: Página inicial redireciona para `/dashboard`**

O `src/app/page.tsx` faz `redirect('/dashboard')`. No portfolio, isso e o comportamento correto (visitante ve o dashboard com dados do seed).

### 11.2 Problemas com Prisma + Supabase

**Problema: `prisma generate` usa schema SQLite em vez de PostgreSQL**

```
Erro: "Error: @prisma/client did not initialize yet"
ou
Erro: Query com sintaxe SQLite em PostgreSQL
```

**Solucao:** O build command no Vercel DEVE ser:

```bash
npx prisma generate --schema=prisma/schema.prod.prisma && npm run build
```

Se usar apenas `npm run build`, o `postinstall` gera o client SQLite e o build falha em producao.

---

**Problema: Connection pool exhaustion (Muitas conexoes PostgreSQL)**

```
Erro: "FATAL: sorry, too many clients already"
ou
Erro: "connection pool exhausted"
```

**Solucao:**

1. **Usar SEMPRE a connection string via pooler** (porta 6543, nao 5432)
2. **Verificar o `globalForPrisma` pattern** em `src/lib/db.ts` -- o codigo ja implementa singleton do PrismaClient via `globalThis`, o que e correto para serverless (reutiliza a conexao dentro de um mesmo runtime)
3. **Ajustar o pooler no Supabase Dashboard:** Database > Settings > Connection Pooling > aumentar `pool_size` se necessario

O `src/lib/db.ts` atual ja implementa a melhor pratica:

```typescript
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({ ... });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
```

Isso previne a criacao de multiplas instancias do PrismaClient em development. Em producao (Vercel serverless), cada Lambda pode criar sua propria instancia, mas o connection pooling do Supavisor gerencia.

---

**Problema: `db push` nao cria todas as tabelas**

```
Erro: "Some tables are missing" ou erro de relacao inexistente
```

**Solucao:**

1. Verificar se a `DATABASE_URL` esta correta (pooler, porta 6543)
2. Verificar se a senha nao contem caracteres especiais que precisem de URL encoding
3. Executar `prisma db push --schema=prisma/schema.prod.prisma` localmente (nao no Supabase SQL Editor)
4. Verificar no Table Editor do Supabase se as tabelas foram criadas

---

**Problema: Erro de timezone nos dados seed**

```
Erro: Datas aparecem deslocadas em +-3 horas
```

**Solucao:** O `DashboardSettings` padrao define `timezone: "America/Sao_Paulo"`. O seed usa `new Date()` e `dateFromStr()`. Certificar-se de que o Supabase esta configurado com o timezone correto (`America/Sao_Paulo` ou `UTC`). Recomendacao: usar UTC no banco e converter no frontend.

### 11.3 Problemas com Autenticacao

**Problema: Google OAuth callback URL mismatch**

```
Erro: "Error 400: redirect_uri_mismatch"
```

**Solucao:** Verificar no Google Cloud Console se a URL exata esta autorizada:

```
# Deve ser EXATAMENTE:
https://[SEU-PROJETO-VERCEL].vercel.app/api/auth/callback/google

# NAO:
https://[SEU-PROJETO-VERCEL].vercel.app/api/auth/callback/google/
# (sem trailing slash)
```

E verificar se `NEXTAUTH_URL` esta definido SEM trailing slash:

```
# Correto:
NEXTAUTH_URL=https://gotakecrm-client.vercel.app

# Incorreto:
NEXTAUTH_URL=https://gotakecrm-client.vercel.app/
```

---

**Problema: NextAuth secret invalido**

```
Erro: "Invalid NEXTAUTH_SECRET"
```

**Solucao:** Regenerar o secret:

```bash
openssl rand -base64 32
```

E atualizar a variavel de ambiente no Vercel. O secret deve ter no minimo 32 caracteres.

---

**Problema: Portfolio redireciona para login**

```
Erro: Visitante do portfolio e redirecionado para /api/auth/signin
```

**Solucao:** Verificar se:
1. `APP_MODE=portfolio` esta definido como variavel de ambiente no Vercel
2. O `src/proxy.ts` foi modificado para verificar `APP_MODE` (ver secao 6.2)
3. A variavel esta visivel no runtime (confirmar via Vercel Function Logs)

**Debug:**

Adicionar temporariamente ao `src/proxy.ts`:

```typescript
console.log('APP_MODE:', process.env.APP_MODE);
```

E verificar nos Function Logs do Vercel se o valor aparece como `portfolio`.

---

**Problema: Variaveis de ambiente nao aparecem no runtime**

```
Erro: process.env.APP_MODE e undefined em producao
```

**Solucao:** No Vercel, variaveis que comecam com `NEXT_PUBLIC_` sao expostas ao client. Variaveis sem prefixo so estao disponiveis no server-side (API routes, RSC, middleware). Para o `APP_MODE`, existem duas abordagens:

1. **Se necessario no client-side:** Usar `NEXT_PUBLIC_APP_MODE` (ja recomendado na secao 4)
2. **Se so no server-side:** Usar `APP_MODE` (middleware e API routes)

O middleware (`src/proxy.ts`) roda no Edge Runtime e pode acessar `APP_MODE` sem o prefixo `NEXT_PUBLIC_`.

### 11.4 Problemas com Build no Vercel

**Problema: Build demorado (> 60s)**

```
Erro: Build timeout no Vercel
```

**Solucao:**
1. Otimizar `prisma generate` (ja e rapido)
2. Verificar se ha dependencias pesadas desnecessarias
3. Usar `vercel build --no-cache` para descartar cache corrompido
4. Verificar se `npm ci` esta sendo executado (nao `npm install`)

---

**Problema: Sharp (image optimization) falha no build**

```
Erro: "Something went wrong installing the 'sharp' module"
```

**Solucao:** O `sharp@^0.34.3` ja inclui prebuilds para maioria das plataformas. Se falhar:

1. Verificar a versao do Node.js (deve ser 20.x)
2. Adicionar `sharp` ao `verbatimModuleSyntax` se necessario
3. Em ultimo caso, adicionar `SHARP_IGNORE_GLOBAL_LIBVIPS=1` as variaveis de ambiente

---

**Problema: `prisma generate` falha por falta de schema.prod.prisma**

```
Erro: "prisma/schema.prod.prisma does not exist"
```

**Solucao:** O arquivo `prisma/schema.prod.prisma` esta no repositorio. Se o Vercel nao o encontrar:
1. Verificar `.gitignore` -- o schema.prod.prisma NAO deve estar ignorado
2. Confirmar que o arquivo existe no branch de deploy: `git ls-files prisma/schema.prod.prisma`

---

## 12. Referencia Rapida de Comandos

### 12.1 Comandos de Banco de Dados

```bash
# Gerar client PostgreSQL
npx prisma generate --schema=prisma/schema.prod.prisma

# Aplicar schema ao banco (sem migrations)
npx prisma db push --schema=prisma/schema.prod.prisma

# Deploy migrations (se usar migrate ao inves de push)
npx prisma migrate deploy --schema=prisma/schema.prod.prisma

# Executar seed
npx tsx prisma/seed.ts

# Abrir Prisma Studio (visualizar dados)
npx prisma studio --schema=prisma/schema.prod.prisma
```

### 12.2 Comandos de Deploy

```bash
# Deploy portfolio (producao)
vercel --prod --name gotakecrm-portfolio

# Deploy client (producao)
vercel --prod --name gotakecrm-client

# Deploy preview (qualquer branch)
vercel --name gotakecrm-client

# Ver logs de producao
vercel logs gotakecrm-portfolio --prod
vercel logs gotakecrm-client --prod

# Verificar ambiente remoto
vercel env ls
```

### 12.3 Comandos de Debug

```bash
# Build local de producao
APP_MODE=client DATABASE_URL="[url]" npx prisma generate --schema=prisma/schema.prod.prisma && npm run build

# Verificar schema valido
npx prisma validate --schema=prisma/schema.prod.prisma

# Verificar formato do schema
npx prisma format --schema=prisma/schema.prod.prisma
```

### 12.4 Comandos de Desenvolvimento

```bash
# Dev server local (SQLite)
npm run dev

# Dev server com PostgreSQL
DATABASE_URL="postgresql://..." npm run dev

# Testes
npm run test
npm run test:watch

# Lint
npm run lint

# Resetar banco local
npm run db:reset
```

---

## Anexo A: Modificacoes de Codigo Necessarias

Esta secao lista todas as modificacoes de codigo que devem ser implementadas antes do deploy.

### A.1 `src/proxy.ts` -- Suporte a modo portfolio

```typescript
// Adicionar verificacao de APP_MODE antes do withAuth
if (process.env.APP_MODE === 'portfolio') {
  return NextResponse.next();
}
```

Ver secao 6.2 para o codigo completo.

### A.2 `src/app/robots.ts` -- Bloquear indexacao no client

Ver secao 10.5 para o codigo condicional.

### A.4 `sentry.client.config.ts` -- Amostragem diferente por modo

Ver secao 10.1 para a configuracao condicional.

---

## Anexo B: Cronograma Sugerido

| Fase | Tempo Estimado | Tarefas |
|---|---|---|
| **Fase 1: Infraestrutura** | 1-2 horas | Criar Supabase (2 projetos), aplicar schemas, seed portfolio |
| **Fase 2: Codigo** | 1-2 horas | Modificar proxy.ts, atualizar robots.ts, Sentry config |
| **Fase 3: Configuracao** | 1-2 horas | Criar Vercel projects, configurar env vars, Google OAuth, Sentry |
| **Fase 4: Deploy e Teste** | 1-2 horas | Primeiro deploy de cada, verificacao completa |
| **Fase 5: CI/CD** | 1 hora | Atualizar CI, configurar branches, preview deployments |
| **Fase 6: Pos-Deploy** | 1 hora | Monitoring, backup, SEO, dominios personalizados |
| **Total** | 7-11 horas | |

---

## Anexo C: Diagrama de Fluxo de Autenticacao

```
                    Visitante acessa URL
                            |
                    +-------v-------+
                    |   proxy.ts    |
                    |   (Edge)      |
                    +-------+-------+
                            |
              +-------------+-------------+
              |                           |
    APP_MODE=portfolio            APP_MODE=client
              |                           |
    NextResponse.next()      withAuth() middleware
              |                           |
    +---------v---------+        +--------v--------+
    | Acesso direto ao  |        | Verifica JWT    |
    | dashboard com     |        | de sessao       |
    | dados do seed     |        +--------+--------+
    +-------------------+                 |
                              +----------+-----------+
                              |                      |
                         Tem sessao             Sem sessao
                              |                      |
                    +---------v---------+    +-------v-------+
                    | Dashboard com     |    | Redirect para |
                    | dados reais       |    | Google Sign-In|
                    +-------------------+    +-------+-------+
                                                    |
                                           +--------v--------+
                                           | Google OAuth    |
                                           | callback        |
                                           +--------+--------+
                                                    |
                                           +--------v--------+
                                           | Dashboard com    |
                                           | dados reais      |
                                           +-----------------+
```

---

*Documento gerado para o projeto GoTakeCRM. Todos os comandos, URLs e configuracoes devem ser adaptados aos valores reais de cada servico antes da execucao.*
