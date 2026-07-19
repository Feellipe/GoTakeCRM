# Database Protection Plan — GoTakeCRM

> **Goal:** Implementar guardrails permanentes para que nenhum agent (IA ou humano) possa modificar, resetar, ou comprometer os bancos de dados (DEV/Preview/Production) sem permissão explícita do Felipe.
>
> **Contexto:** Este é o 4º incidente onde o banco DEV/Preview teve dados perdidos por ações de agents. Em MVP os danos são inconvenientes; em produção com clientes reais seria catastófico.

**Versão:** 1.0
**Data:** 2026-07-19
**Autor:** Felipe Cavalcanti

---

## Sumário

- [1. Visão Geral](#1-visão-geral)
- [2. Layer 1: Skill Hermes `database-protection`](#2-layer-1-skill-hermes-database-protection)
- [3. Layer 2: GitHub Branch Protection Rules](#3-layer-2-github-branch-protection-rules)
- [4. Layer 3: GitHub Action de Pré-Deploy](#4-layer-3-github-action-de-pré-deploy)
- [5. Layer 4: Por que NÃO usar Supabase Branching](#5-layer-4-por-que-não-usar-supabase-branching)
- [6. Layer 5: Proteção de Env Vars na Vercel](#6-layer-5-proteção-de-env-vars-na-vercel)
- [7. Protocolo de Permissão](#7-protocolo-de-permissão)
- [8. Checklist de Implementação](#8-checklist-de-implementação)

---

## 1. Visão Geral

### 1.1 Conceito

GoTakeCRM tem **2 bancos Supabase** separados:

| Banco | Função | Vercel Target | DATABASE_URL em | Dados |
|-------|--------|---------------|-----------------|-------|
| `gotake-dev` | Demo / Preview / DEV | Preview (`demo` branch) | Vercel Preview env | Seed data (demo@gotakecrm.com) |
| `gotake-prod` | Produção real | Production (`main` branch) | Vercel Production env | Dados de clientes reais |

### 1.2 A arquitetura existente

```
  GitHub (repo: Feellipe/GoTakeCRM)
    ├── branch `main`  → Vercel Production → Supabase prod
    └── branch `demo`  → Vercel Preview    → Supabase dev (demo data)
```

### 1.3 Princípio fundamental

> **Nenhum agent deve alterar `DATABASE_URL`, rodar seed, migration, ou reset em QUALQUER ambiente sem permissão explícita e por escrito do Felipe.**

Os 5 layers abaixo implementam este princípio com defesa em profundidade (defense-in-depth).

### 1.4 Histórico de incidentes (motivação)

| # | Data | Impacto | Causa-raiz |
|---|------|---------|------------|
| 1 | Pre-Jul/2025 | Dados de produção resetados | Agent alterou DATABASE_URL em produção durante deploy |
| 2 | Jul/2025 | Dados DEV sobrescritos | Seed executado em ambiente errado |
| 3 | Jul/2026 | Login demo parou de funcionar | Env vars de preview mexidas sem validação |
| 4 | Jul/2026 | E2E quebrado (deste incidente) | Worker NextAuth reescreveu handler, comprometendo auth flow |

**Lição:** Em MVP, dados resetados são inconvenientes. Em produção com clientes reais, seria um incidente de segurança grave. Os guardrails abaixo são obrigatórios.

---

## 2. Layer 1: Skill Hermes `database-protection`

**Status:** ✅ Implementado

A skill `database-safety/database-protection` já está criada no Hermes. Contém:
- Lista de ações proibidas (reset, seed, migrate, env var swap)
- Protocolo de permissão explícita via `clarify`
- Checklist pré-operação de banco
- Histórico de incidentes

**Manutenção:** Atualizar a skill quando um novo tipo de incidente ocorrer. Adicionar o incidente na seção "Histórico" para aprendizado futuro.

---

## 3. Layer 2: GitHub Branch Protection Rules

**Status:** ⏳ A implementar

### 3.1 Regras para branch `main` (Production)

| Regra | Valor | Justificativa |
|-------|-------|---------------|
| Require pull request before merging | ✅ On | Ninguém (nem IA) push direto |
| Required approvals | **2** (temporariamente 1) | Bloqueia auto-merge de bots |
| Dismiss stale approvals on new push | ✅ On | Não aceitar approval de PR velho |
| Require status checks to pass | ✅ On | CI deve passar |
| Required status checks | `build`, `vitest`, `lint` | Build + testes + lint |
| Require branches to be up to date | ✅ On | Merge só com base atualizada |
| Restrict pushes that create matching branches | ✅ On | Evitar branch cega |
| Require linear history | ✅ On | Git rebase only |
| **Do not allow bypassing the above settings** | ✅ On | Nem admins bypassam |

### 3.2 Regras para branch `demo` (Preview)

Menos rígidas, mas ainda com trava de automação:

| Regra | Valor |
|-------|-------|
| Require pull request before merging | ✅ On |
| Required approvals | **1** |
| Require status checks to pass | ✅ On (build + vitest) |
| Do not allow bypassing | ✅ On |

### 3.3 Codeowners para arquivos sensíveis

Criar `.github/CODEOWNERS`:

```
# Database-related files — require Felipe's review
/prisma/                        @Feellipe
/scripts/seed*                  @Feellipe
/scripts/verify-seed-safe.js    @Feellipe
/.env*                          @Feellipe
/vercel.json                    @Feellipe
/playwright.config.ts           @Feellipe
/next.config.ts                 @Feellipe
```

Qualquer PR que toque esses arquivos **exige review explícita do Felipe** antes do merge, mesmo que outros aprovem.

### 3.4 Como aplicar

```bash
# Via GitHub UI: Settings → Branches → Branch protection rules
# Via GitHub CLI:
gh api repos/Feellipe/GoTakeCRM/branches/main/protection \
  -X PUT \
  -f required_pull_request_reviews.required_approving_review_count=1 \
  -f required_status_checks.strict=true \
  -f required_status_checks.contexts[]=build \
  -f enforce_admins=true
```

---

## 4. Layer 3: GitHub Action de Pré-Deploy

**Status:** ⏳ A implementar

### 4.1 Objetivo

Bloquear qualquer PR/deploy que tente:
1. Modificar `prisma/schema.prisma` ou arquivos em `prisma/migrations/`
2. Trocar valor de `DATABASE_URL` (via env var commit ou deploy config)
3. Executar `prisma migrate reset` ou `db:reset`
4. Adicionar env vars de seed (`SEED_ALLOWED`, `SEED_DEV_CONFIRMED`) em produção

### 4.2 O workflow

`.github/workflows/db-guard.yml`:

```yaml
name: Database Guard

on:
  pull_request:
    paths:
      - 'prisma/**'
      - 'scripts/seed*'
      - '.env*'
      - 'vercel.json'
      - 'next.config.ts'
      - 'playwright.config.ts'

jobs:
  db-guard:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Detect database-affecting changes
        id: detect
        run: |
          set -euo pipefail

          BASE="${{ github.event.pull_request.base.ref }}"
          HEAD="${{ github.event.pull_request.head.ref }}"

          echo "Comparing origin/$BASE...$HEAD"

          CHANGED=$(git diff --name-only origin/$BASE...origin/$HEAD)

          echo "Changed files:"
          echo "$CHANGED"

          # Categorized detection
          SCHEMA=$(echo "$CHANGED" | grep -E '^prisma/(schema\.prisma|migrations/)' || true)
          SEED=$(echo "$CHANGED" | grep -E '^scripts/(seed|seed-)' || true)
          ENV_FILES=$(echo "$CHANGED" | grep -E '^\.env' || true)
          ENVARS_IN_CODE=$(git diff origin/$BASE...origin/$HEAD | grep -E '^\+.*DATABASE_URL\s*=' || true)
          RESET_CALLS=$(git diff origin/$BASE...origin/$HEAD | grep -E '^\+.*(migrate reset|db:reset|prisma.*reset)' || true)

          {
            echo "schema_changed=${SCHEMA:+true}"
            echo "seed_changed=${SEED:+true}"
            echo "env_files_changed=${ENV_FILES:+true}"
            echo "envars_in_code=${ENVARS_IN_CODE:+true}"
            echo "reset_calls=${RESET_CALLS:+true}"
          } >> $GITHUB_OUTPUT

          if [ -n "$SCHEMA" ] || [ -n "$SEED" ] || [ -n "$ENV_FILES" ] || \
             [ -n "$ENVARS_IN_CODE" ] || [ -n "$RESET_CALLS" ]; then
            echo "block=true" >> $GITHUB_OUTPUT
          else
            echo "block=false" >> $GITHUB_OUTPUT
          fi

      - name: Block PR
        if: steps.detect.outputs.block == 'true'
        run: |
          echo "::error::This PR touches database-sensitive files. Requires explicit approval from @Feellipe."
          echo "::error::Files flagged:"
          echo "Schema: ${{ steps.detect.outputs.schema_changed }}"
          echo "Seed:   ${{ steps.detect.outputs.seed_changed }}"
          echo ".env:   ${{ steps.detect.outputs.env_files_changed }}"
          echo "EnvInCode: ${{ steps.detect.outputs.envars_in_code }}"
          echo "Reset:  ${{ steps.detect.outputs.reset_calls }}"
          exit 1

      - name: Pass
        if: steps.detect.outputs.block != 'true'
        run: echo "✓ No database-sensitive changes detected"
```

### 4.3 Integração com branch protection

Na branch protection rule de `main` e `demo`, adicionar `DB Guard / db-guard` como required status check. Assim, PRs que mexam em `prisma/`, `scripts/seed*`, `.env*` são **automaticamente bloqueados** até o Felipe adicionar uma label `db-approved` ou fazer review approval.

### 4.4 Label `db-approved` (opt-in)

Para permitir um PR legítimo (ex: nova migration), o Felipe adiciona a label `db-approved` no PR, que faz o guard pular o block:

```yaml
      - name: Skip if explicitly approved
        if: contains(github.event.pull_request.labels.*.name, 'db-approved')
        run: |
          echo "PR has 'db-approved' label — skipping guard"
          exit 0
```

---

## 5. Layer 4: Por que NÃO usar Supabase Branching

### 5.1 O que é Supabase Branching

Supabase oferece um recurso chamado "Branching" (em preview/GA dependendo do plano) que cria um banco efêmero para cada Pull Request. A ideia é similar ao Vercel Preview Deployments — cada PR tem seu próprio banco de dados isolado, que é destruído quando o PR é fechado.

Funciona assim:

```
  GitHub PR #123  ──→  Supabase Branch "pr-123"
                         ├── Banco efêmero clonado do DEV
                         ├── Migrações da PR aplicadas
                         └── Destruído quando PR é closed/merged
```

### 5.2 Por que isso NÃO se alinha ao GoTakeCRM

O GoTakeCRM tem uma estratégia de **demo como produto**:

| Requisito do GoTakeCRM | O que Supabase Branching faria |
|------------------------|--------------------------------|
| **Um banco DEV fixo e persistente** com dados demo (`demo@gotakecrm.com`) que qualquer visitante pode acessar | Cada PR criaria/destruiria bancos efêmeros. A URL `gotakecrm-git-demo-feellipes-projects.vercel.app` não teria banco estável — mudaria a cada PR. |
| **Login demo funciona sempre** | Como cada branch tem seu banco, o usuário `demo@gotakecrm.com` só existiria na branch que fez seed — visitantes de outras branches não conseguiriam logar. |
| **Custo previsível** (free tier do Supabase) | Branching pode exigir plano paid. Cada branch = um banco novo = custos adicionais. |
| **Simplicidade para MVP** | Branching adiciona complexidade de configuração, sincronização de migrations entre branches, e resolução de conflitos de schema. |
| **Dados demo realistas e curados** (12 clientes, 12 deals, 22 bookings) | Cada branch começaria vazia ou com snapshot do DEV — dados não seriam consistentes entre branches. |

### 5.3 Modelo adotado: Static DEV + Static PROD

O modelo correto para o GoTakeCRM é:

```
  Branch `demo`  ──→  Vercel Preview    ──→  Supabase DEV (fixo, persistente)
  (PRs merge aqui)                              ↑↓
                                                Seed (apenas com permissão)
  
  Branch `main`  ──→  Vercel Production ──→  Supabase PROD (fixo, dados reais)
  (PRs merge aqui)                              ↑↓
                                                Migrações com backup prévio
```

**Vantagens:**

1. **Demo sempre funcional** — `gotakecrm-git-demo-feellipes-projects.vercel.app` sempre aponta pro mesmo banco DEV com dados demo
2. **URL estável** para compartilhar com clientes/prospectos
3. **Custo zero** no free tier do Supabase
4. **Separação clara** entre dados fictícios (DEV) e dados reais (PROD)
5. **Testes E2E confiáveis** — sempre acessam o mesmo banco com mesmo estado

### 5.4 Quando considerar Branching no futuro

Supabase Branching faria sentido se:

- ✅ Tivéssemos uma equipe grande fazendo mudanças paralelas no schema do banco
- ✅ Migrações fossem complexas e precisassem testar isoladamente
- ✅ Cada PR trouxesse uma migration quebra-galho de schema
- ✅ Tivéssemos orçamento para plano Supabase com branching
- ✅ O produto tivesse multi-tenancy real (cada cliente = um banco) — hoje não é o caso

Para o estágio atual de MVP com **1 developer + agents IA**, o modelo Static DEV + Static PROD é mais simples, barato, e atende melhor ao caso de uso de **demo como vitrine**.

---

## 6. Layer 5: Proteção de Env Vars na Vercel

### 6.1 Env vars críticas (never touch sem permissão)

| Env Var | Ambiente | Risco se alterada |
|---------|----------|-------------------|
| `DATABASE_URL` | Preview / Production | Troca de banco → dados perdidos |
| `NEXTAUTH_SECRET` | Preview / Production | Sessões invalidadas, E2E quebra |
| `NEXTAUTH_URL` | Preview / Production | Callback URL errada → login quebra |
| `SUPABASE_URL` | Preview / Production | Auth quebra |
| `SUPABASE_ANON_KEY` | Preview / Production | Client-side auth quebra |
| `SUPABASE_SERVICE_ROLE_KEY` | Preview / Production | Acesso admin total — crítica |
| `STRIPE_SECRET_KEY` | Production | Pagamentos quebram |
| `STRIPE_WEBHOOK_SECRET` | Production | Webhooks falham |
| `WHATSAPP_PHONE_NUMBER_ID` | Production | Bot para de funcionar |
| `WHATSAPP_ACCESS_TOKEN` | Production | Bot para de funcionar |
| `GOOGLE_CLIENT_ID/SECRET` | Production | Login Google quebra |
| `SEED_ALLOWED` | Production | Se setada em prod → seed pode rodar |
| `SEED_DEV_CONFIRMED` | Production | Idem |
| `APP_MODE` | Production | Mode switching pode expor dados |

### 6.2 Regra absoluta

> **Nenhum agent deve rodar `vercel env rm`, `vercel env add`, ou `vercel env edit`** para qualquer variável da lista acima, em qualquer ambiente, sem permissão explícita do Felipe.

### 6.3 Auditoria recomendada

Executar mensalmente:

```bash
# Listar todas as env vars configuradas
vercel env ls

# Para cada env var crítica, verificar:
# 1. Quando foi criada/modificada (vercel env ls mostra created_at)
# 2. Se o valor bate com o esperado (via vercel env pull + diff)
#  variável por variável)
# 3. Se há env vars em ambiente errado (ex: SEED_ALLOWED em Production)
```

### 6.4 Script de auditoria

Criar `scripts/audit-env-vars.js` (próxima fase):

```javascript
#!/usr/bin/env node
/**
 * Auditoria de env vars da Vercel
 * Roda: vercel env ls, verifica padrões, alerta se:
 *  - SEED_ALLOWED/SEED_DEV_CONFIRMED está em Production
 *  - DATABASE_URL mudou desde o último audit
 *  - Env vars críticas estão faltando
 */
```

---

## 7. Protocolo de Permissão

### 7.1 Quando um agent precisa mexer no banco

**Passo 1 — Documentar a mudança:**
- Qual ambiente (local DEV / Preview DEV / Production)
- Quais comandos exatos serão rodados
- Quais arquivos serão tocados
- Plano de backup/rollback

**Passo 2 — Pedir permissão explícita via `clarify`:**
```
Vou fazer X no ambiente Y. Confirma?
- Sim, pode fazer
- Não, abortar
- Preciso ver mais detalhes primeiro
```

**Passo 3 — Nunca presumir consentimento.** Ausência de resposta = NÃO.

### 7.2 Hierarquia de permissões

| Ação | Permissão necessária |
|------|---------------------|
| `prisma generate` | Não precisa (só regera client) |
| `npm run test` / `vitest run` | Não precisa |
| `npm run lint` / `tsc --noEmit` | Não precisa |
| `npm run build` | Não precisa |
| Ler dados (SELECT, `prisma studio`) | Não precisa |
| Deploy para `demo` (preview) | Requer `clarify` |
| Deploy para `main` (production) | Requer `clarify` + Felipe approval no GitHub |
| `prisma migrate dev` | Requer `clarify` + Felipe approval no GitHub |
| `prisma db push` | Requer `clarify` |
| `npm run seed` em DEV | Requer `clarify` |
| `npm run seed` em PROD | **PROIBIDO** — nunca |
| `prisma migrate reset` | **PROIBIDO** — nunca |
| Trocar `DATABASE_URL` | **PROIBIDO** — via Felipe diretamente |
| `vercel env rm/add/edit DATABASE_URL` | **PROIBIDO** — via Felipe diretamente |

### 7.3 Incident response

Se um agent suspeitar que uma env var foi alterada ou um banco comprometido:

1. **Não tentar corrigir automaticamente**
2. **Notificar Felipe imediatamente**
3. **Documentar o estado atual** (env vars, último commit, último deploy)
4. **Aguardar instruções**

---

##  Protection Rules Checklist

## 8. Checklist de Implementação

### 8.1 Já feito ✅

- [x] Skill Hermes `database-protection` criada
- [x] Memória permanente atualizada com a regra
- [x] Este plano documentado

### 8.2 A implementar no GitHub ⏳

- [ ] Branch protection rule para `main` (PR required, 1 approval, required checks)
- [ ] Branch protection rule para `demo` (PR required, 1 approval, required checks)
- [ ] Criar `.github/CODEOWNERS` com donos para `prisma/`, `scripts/seed*`, `.env*`
- [ ] Criar `.github/workflows/db-guard.yml` (GitHub Action de guard)
- [ ] Adicionar `DB Guard` nos required status checks das branch rules

### 8.3 A implementar no projeto ⏳

- [ ] Adicionar `scripts/audit-env-vars.js` (auditoria mensal)
- [ ] Adicionar check de ambiente no `prisma/seed.ts` (re-verificar que guards 1-3 ainda estão ativos)
- `prisma/seed.ts` já tem 3 guards implementados (GUARD 1: VERCEL_ENV, GUARD 2: SEED_ALLOWED, GUARD 3: PRODUCTION_DB)
- [ ] Documentar URLs dos bancos Supabase em local seguro (não commitado)

### 8.4 Futuro (pós-MVP) 🔮

- [ ] Considerar Supabase Point-in-Time Recovery (PITR) para produção
- [ ] Setup de backups automáticos diários do banco PROD
- [ ] Monitoramento de mudanças de schema (Drift detection)
- [ ] Database access logs (Supabase logs ou external logging)

---

## 9. Referências

- [GitHub Branch Protection](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-branches-in-your-repository/managing-a-branch-protection-rule)
- [GitHub CODEOWNERS](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners)
- [Supabase Branching Docs](https://supabase.com/docs/guides/deployment/branching)
- [Vercel Environment Variables](https://vercel.com/docs/projects/environment-variables)
- [Prisma Migrate Best Practices](https://www.prisma.io/docs/guides/migrate/developing-with-prisma-migrate)

---

**Plano vivo.** Atualizar quando novos incidentes ocorrerem ou novos guardrails forem implementados.
