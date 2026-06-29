# 🛡️ GoTakeCRM — Guardrails do Seed

## O Problema

O seed (`prisma/seed.ts`) cria dados de demonstração no banco, incluindo
o usuário `demo@gotakecrm.com` / `demo2026`. Este seed **NUNCA** pode
executar no banco de produção.

## As 3 Guardrails (implementadas no código)

```
┌─────────────────────────────────────────────────────────────┐
│                    prisma/seed.ts                           │
│                                                             │
│  GUARD 1: VERCEL_ENV                                        │
│  ├── Se VERCEL_ENV === "production" → REJEITA              │
│  ├── Vercel SEMPRE seta esta variável                       │
│  └── Não depende de config manual                           │
│                                                             │
│  GUARD 2: SEED_ALLOWED                                       │
│  ├── Requer SEED_ALLOWED=true explícito                     │
│  ├── Protege contra execução acidental via npm run seed     │
│  └── NUNCA configurar em produção                           │
│                                                             │
│  GUARD 3: SEED_DEV_CONFIRMED                                │
│  ├── Se DATABASE_URL contém "supabase.co" (banco remoto),   │
│  │   exige SEED_DEV_CONFIRMED=true como confirmação extra   │
│  ├── Impede seed acidental em staging/production remoto     │
│  └── NUNCA configurar em produção                           │
└─────────────────────────────────────────────────────────────┘
```

## Como executar o seed com segurança

| Comando | Onde usar | Explicação |
|---------|-----------|------------|
| `npm run seed:dev` | Preview/Dev (Supabase) | `SEED_ALLOWED=true` + `SEED_DEV_CONFIRMED=true` |
| `npm run seed:demo` | Preview/Dev (SQLite/local) | `SEED_ALLOWED=true` — sem confirmação remota |
| `npm run seed` | ❌ NUNCA sozinho | Bloqueado por GUARD 2 (precisa de `SEED_ALLOWED=true`) |
| `npm run verify:seed-safe` | CI/Pré-deploy | Verifica se há variáveis de seed no ambiente |

### No Vercel (Preview)

O seed roda **apenas** no ambiente **Preview** da Vercel. Para isso:

1. No [Vercel Dashboard](https://vercel.com) → GoTakeCRM → Project Settings
2. Environment Variables → Preview
3. Adicione:
   - `SEED_ALLOWED` = `true` (apenas Preview!)
   - `SEED_DEV_CONFIRMED` = `true` (se o Preview usa Supabase)
4. Confirme que **Production NÃO tem** nenhuma dessas variáveis

## O que NUNCA fazer

| ❌ Ação errada | Risco |
|---------------|-------|
| Configurar `SEED_ALLOWED=true` em produção | Seed pode rodar acidentalmente |
| Configurar `SEED_DEV_CONFIRMED=true` em produção | Seed pode rodar em banco remoto |
| Executar `npm run seed` sem `SEED_ALLOWED=true` | ❌ Bloqueado — só falha em dev |
| Adicionar `prisma db seed` no build | Catastrófico! |

## Script de verificação CI

Se tiver CI/CD (GitHub Actions, etc.), adicione:

```yaml
- name: Verificar seed safety
  run: npm run verify:seed-safe
  env:
    VERCEL_ENV: ${{ vars.VERCEL_ENV || 'development' }}
```

Ou execute manualmente antes do deploy:

```bash
npm run verify:seed-safe
```
