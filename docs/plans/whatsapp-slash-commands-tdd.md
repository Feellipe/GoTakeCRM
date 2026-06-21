# WhatsApp Slash Commands — TDD Implementation Plan v2

> **For Hermes:** Use strict TDD (es6kr/tdd skill). Trigger entry = TaskCreate + first Red test. No diagnosis before RED fails.

**Goal:** Implement conversational slash commands for GoTakeCRM via WhatsApp Cloud API, with state machine-driven multi-step flows, tested via strict TDD with boundary values, equivalence partitioning, decision tables, error guessing, and path coverage.

**Tech Stack:** Next.js 16 (App Router), Prisma (PostgreSQL), Vitest 3

---

## File Structure

```
src/
├── __tests__/
│   ├── unit/
│   │   ├── whatsapp-commands.test.ts     # Phase 1
│   │   └── session-manager.test.ts        # Phase 2
│   ├── state-machine/
│   │   ├── novo-deal.test.ts             # Phase 3
│   │   ├── despesa.test.ts               # Phase 3
│   │   ├── receita.test.ts               # Phase 3
│   │   ├── briefing.test.ts              # Phase 3
│   │   ├── status.test.ts                # Phase 3
│   │   ├── contatos.test.ts              # Phase 7
│   │   ├── calendario.test.ts            # Phase 7
│   │   └── ajuda.test.ts                 # Phase 7
│   ├── integration/
│   │   ├── flow-orchestrator.test.ts     # Phase 4
│   │   └── full-flows.test.ts            # Phase 6
│   └── api/
│       └── whatsapp-webhook.test.ts      # Phase 5
├── lib/
│   └── whatsapp/
│       ├── commandRouter.ts              # Phase 1
│       ├── sessionManager.ts             # Phase 2
│       ├── flows/
│       │   ├── novoDeal.ts               # Phase 3
│       │   ├── despesa.ts                # Phase 3
│       │   ├── receita.ts                # Phase 3
│       │   ├── briefing.ts               # Phase 3
│       │   ├── status.ts                 # Phase 3
│       │   ├── contatos.ts               # Phase 7
│       │   ├── calendario.ts             # Phase 7
│       │   ├── ajuda.ts                  # Phase 7
│       │   └── index.ts                  # Flow registry
│       ├── flowOrchestrator.ts           # Phase 4
│       └── whatsappApi.ts                # Phase 5
├── app/
│   └── api/
│       └── whatsapp/
│           └── route.ts                  # Phase 5 webhook
```

---

## Test Strategy Reference

| Technique | When to Apply | Priority |
|-----------|--------------|----------|
| **Boundary Value Analysis** | Numeric ranges, string lengths, date ranges | Highest |
| **Equivalence Partitioning** | Category/status/type validations | High |
| **Decision Table** | Business rules with multiple conditions | Medium |
| **Error Guessing** | Input validation, defensive code | High |
| **Path Coverage** | Conditionals, loops, error branches | Medium |

---

## Phase 0: Schema & Setup

### Task 0.1: Create `command_sessions` Prisma migration

**Objective:** Add `CommandSession` model for multi-step state persistence.

**Strategy:** No tests needed — configuration-only.

```prisma
model CommandSession {
  id        String   @id @default(cuid())
  phone     String
  command   String
  step      Int      @default(0)
  data      String   @default("{}")
  expiresAt DateTime @map("expires_at")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@index([phone])
  @@index([expiresAt])
  @@map("command_sessions")
}
```

Run: `npx prisma migrate dev --name add_command_sessions`

---

## Phase 1: Command Detection (Pure Functions)

> **Test strategy:** Equivalence Partitioning (valid commands, invalid commands, edge cases) + Boundary Value (string lengths) + Error Guessing (special chars, whitespace)

### Task 1.1: Detect command prefix

**Tests (RED):**

| # | Test | Estratégia | Input | Expected |
|---|------|-----------|-------|----------|
| 1 | detects `/novoDeal` | EP — comando válido | `/novoDeal` | `{ command: 'novodeal' }` |
| 2 | detects `/despesa` | EP — comando válido | `/despesa` | `{ command: 'despesa' }` |
| 3 | detects `/briefing` | EP — comando válido | `/briefing` | `{ command: 'briefing' }` |
| 4 | detects `/status` | EP — comando válido | `/status` | `{ command: 'status' }` |
| 5 | detects `/cancelar` | EP — comando válido | `/cancelar` | `{ command: 'cancelar' }` |
| 6 | detects `/contatos` | EP — comando válido | `/contatos` | `{ command: 'contatos' }` |
| 7 | detects `/calendario` | EP — comando válido | `/calendario` | `{ command: 'calendario' }` |
| 8 | detects `/ajuda` | EP — comando válido | `/ajuda` | `{ command: 'ajuda' }` |
| 9 | detects `/receita` | EP — comando válido | `/receita` | `{ command: 'receita' }` |
| 10 | detects `/pacotes` | EP — comando válido | `/pacotes` | `{ command: 'pacotes' }` |
| 11 | detects `/projeto` | EP — comando válido | `/projeto` | `{ command: 'projeto' }` |
| 12 | returns null for unknown command | EP — partição inválida | `/foo` | `null` |
| 13 | returns null for plain text | EP — partição inválida | `olá, tudo bem?` | `null` |
| 14 | is case-insensitive | EP — transformação | `/NOVODEAL` | `{ command: 'novodeal' }` |
| 15 | handles uppercase mixed | EP — transformação | `/NovoDeal` | `{ command: 'novodeal' }` |
| 16 | handles trailing spaces | EG — whitespace | `/novoDeal   ` | `{ command: 'novodeal' }` |
| 17 | handles just slash | BV — string length 1 | `/` | `null` |
| 18 | handles double slash | EG — edge case | `//novoDeal` | `null` |
| 19 | handles empty string | BV — string length 0 | `` | `null` |
| 20 | handles string with only spaces | EG — whitespace | `   ` | `null` |

**Boundary values applied:** string length 0 (vazio), 1 (`/`), N (qualquer comando válido).

---

## Phase 2: Session Management (DB Layer)

> **Test strategy:** Path Coverage (CRUD operations + all error branches) + Error Guessing (expired sessions, null data) + Boundary Value (expiry time)

### Task 2.1: Create session

| # | Test | Estratégia | Expected |
|---|------|-----------|----------|
| 1 | creates session with 5-minute expiry | BV — tempo exato | `expiresAt ≈ now + 5min` |
| 2 | creates session with step=0 | EP — estado inicial | `step === 0` |
| 3 | creates session with empty data JSON | EP — estado inicial | `data === '{}'` |
| 4 | throws when phone is empty | EG — edge case | `throw Error` |
| 5 | throws when command is empty | EG — edge case | `throw Error` |

### Task 2.2: Get active session

| # | Test | Estratégia | Expected |
|---|------|-----------|----------|
| 1 | returns session when expiresAt > now | BV — tempo válido | session object |
| 2 | returns null when expiresAt < now | BV — tempo expirado | `null` |
| 3 | returns null when no session exists | EP — partição vazia | `null` |
| 4 | returns most recent session for phone (2+ active) | EG — concorrência | most recent |

### Task 2.3: Update session

| # | Test | Estratégia | Expected |
|---|------|-----------|----------|
| 1 | increments step counter | EP — progressão | `step === 1` |
| 2 | merges data JSON preserving existing fields | EP — merge | `{ ...old, ...new }` |
| 3 | refreshes updatedAt timestamp | BV — tempo | `updatedAt > createdAt` |
| 4 | throws when sessionId doesn't exist | EG — edge case | `throw Error` |

### Task 2.4: Delete session

| # | Test | Estratégia | Expected |
|---|------|-----------|----------|
| 1 | deletes by id | Path — branch feliz | deleted |
| 2 | does not throw on non-existent id | EG — edge case | no error |
| 3 | cancels session (sets expiresAt to now) | BV — expiração imediata | `expiresAt < Date.now()` |

### Task 2.5: Cleanup on new command

| # | Test | Estratégia | Expected |
|---|------|-----------|----------|
| 1 | same phone + new command → deletes old session | EP — substituição | old deleted |
| 2 | `/cancelar` → deletes active session | EG — fluxo | session deleted |
| 3 | new command from different phone → keeps old session | EP — isolamento | both exist |

---

## Phase 3: State Machines (Conversational Flows)

### Standard Step Handler Interface

```typescript
interface StepResult {
  message: string;                          // WhatsApp response text
  nextStep: number | null;                  // null = flow complete
  updatedData: Record<string, any>;         // accumulated data
  result?: { action: string; entities: Record<string, any> };  // on completion
}
```

---

### Task 3.1–3.7: `/novoDeal` — Decision Table Core

> **Test strategy:** Decision Table (edit logic = 4 combinations) + Boundary Value (phone digits, name length, value) + Equivalence Partitioning (package exists vs doesn't) + Error Guessing

#### Decision Table — Edição de Pacote

| Condição: Edit? | Condição: O que editar? | Resultado |
|:---:|:---:|---|
| Não | — | Avança para pergunta da proposta |
| Sim | Valor | Atualiza `packageValue` no data |
| Sim | Descrição | Atualiza `packageDescription` no data |
| Sim | (inválido) | Fica no step 4, pede valor/descrição/ambos |

#### Step 0 — Ask client name

| # | Test | Estratégia |
|---|------|-----------|
| 1 | returns welcome message asking for name | EP — step inicial |
| 2 | message contains "nome" and "cliente" | EG — legibilidade |

#### Step 1 — Receive name, ask phone

| # | Test | Estratégia | Input | Expected |
|---|------|-----------|-------|----------|
| 1 | stores name, asks for phone | Path — feliz | `"Maria Silva"` | `data.clientName === "Maria Silva"` |
| 2 | rejects empty name (stays step 1) | BV — len 0 | `""` | `step !== 2`, msg erro |
| 3 | rejects whitespace-only name | EG — whitespace | `"   "` | `step !== 2`, msg erro |
| 4 | accepts 1-char name (minimum) | BV — len 1 | `"M"` | `nextStep === 2` |
| 5 | accepts 200-char name (maximum) | BV — len 200 | `"M".repeat(200)` | `nextStep === 2` |
| 6 | rejects >200 char name | BV — len 201 | `"M".repeat(201)` | `step !== 2`, msg erro |
| 7 | accepts name with special chars | EG — acentos | `"João Silva & Cia Ltda."` | `data.clientName` preservado |

#### Step 2 — Receive phone, ask package selection

| # | Test | Estratégia | Input | Expected |
|---|------|-----------|-------|----------|
| 1 | stores phone, lists packages | Path — feliz | `"21999999999"` | `data.phone === "21999999999"`, msg contém nomes |
| 2 | rejects <10 digits | BV — min-1 | `"123456789"` | `step !== 3` |
| 3 | accepts 10 digits (min) | BV — min | `"1234567890"` | `nextStep === 3` |
| 4 | accepts 13 digits (+55 BR max) | BV — máx | `"5511999999999"` | `nextStep === 3` |
| 5 | rejects >13 digits | BV — máx+1 | `"55119999999999"` | `step !== 3` |
| 6 | strips formatting: spaces, parens, dashes | EG — formatação | `"(21) 99999-9999"` | `data.phone === "21999999999"` |
| 7 | strips formatting: +55 prefix with spaces | EG — formatação | `"+55 21 99999-9999"` | `data.phone === "5521999999999"` |
| 8 | shows message when no packages available | EP — lista vazia | `"21999999999"` | msg "nenhum pacote cadastrado" |

#### Step 3 — Select package, ask if edit

| # | Test | Estratégia | Input | Expected |
|---|------|-----------|-------|----------|
| 1 | stores package, asks edit (sim/não) | Path — feliz | `"Casamento Full"` | `data.packageName === "Casamento Full"` |
| 2 | rejects name not in packages list | EP — pacote inválido | `"Pacote Inexistente"` | `step !== 4` |
| 3 | case-insensitive package matching | EG — case | `"casamento full"` | encontra pacote |
| 4 | partial name finds first match | EG — substring | `"Casamento"` | seleciona "Casamento Full" |

#### Step 4 — Edit package (Decision Table)

| # | Test | Estratégia | Input | Expected |
|---|------|-----------|-------|----------|
| 1 | "não" → skip edit, ask proposal | DT — linha 1 | `"não"` | `nextStep === 5` |
| 2 | "sim" → edit value | DT — linha 2 | `"sim"` | ask: "valor ou descrição?" |
| 3 | "valor" → updates packageValue | DT — linha 2a | `"valor"` → `"4500"` | `data.packageValue === 4500` |
| 4 | "descrição" → updates packageDescription | DT — linha 3 | `"descrição"` → `"12h com making of"` | `data.packageDescription` set |
| 5 | invalid edit target | DT — linha 4 | `"data"` | stays step 4, msg "valor ou descrição" |
| 6 | edit value: rejects non-numeric | EG — valor inválido | `"abc"` | stays step 4 |
| 7 | edit value: accepts integer | BV — valor inteiro | `"4500"` | `data.packageValue === 4500` |
| 8 | edit value: accepts decimal | BV — valor decimal | `"4500.50"` | `data.packageValue === 4500.5` |
| 9 | edit value: accepts Brazilian format | EG — formato BR | `"4.500,50"` | `data.packageValue === 4500.5` |
| 10 | edit value: accepts "R$" prefix | EG — prefixo | `"R$ 4500"` | `data.packageValue === 4500` |
| 11 | edit value: rejects zero | BV — zero | `"0"` | stays step 4, msg "valor maior que zero" |
| 12 | edit value: rejects negative | BV — negativo | `"-500"` | stays step 4 |

#### Step 5 — Ask create proposal

| # | Test | Estratégia | Input | Expected |
|---|------|-----------|-------|----------|
| 1 | "sim" → flags proposal creation | DT — feliz | `"sim"` | `data.createProposal === true` |
| 2 | "não" → no proposal | DT — feliz | `"não"` | `data.createProposal === false` |
| 3 | rejects anything else | EG — edge | `"talvez"` | stays step 5 |

#### Step 6 — Complete (Create entities)

| # | Test | Estratégia | Expected |
|---|------|-----------|----------|
| 1 | creates Client entity | Path — feliz | Client com name+phone+org |
| 2 | creates Deal entity linked to Client | Path — feliz | Deal com title+status+value |
| 3 | creates Proposal when createProposal=true | EP — sim | Proposal exists |
| 4 | does NOT create Proposal when createProposal=false | EP — não | Proposal não existe |
| 5 | confirmation message contains client ID | EG — legibilidade | msg contém `#C` |
| 6 | confirmation message contains deal ID | EG — legibilidade | msg contém `#D` |

---

### Task 3.8–3.11: `/despesa` — Steps 0–4

> **Strategy:** Boundary Value (value) + Equivalence Partitioning (categories) + Error Guessing

| Step | Pergunta | Testes |
|------|---------|--------|
| 0 | "Qual o ID do projeto?" | path feliz, id vazio, id não encontrado, id com `#` prefix |
| 1 | "Qual o valor?" | path feliz, 0 (rejeita), 0.01 (aceita), negativo (rejeita), `R$` prefixo, `1.500,50` BR format |
| 2 | "Qual a descrição?" | path feliz, vazio (rejeita), 500 chars (aceita), 501 chars (rejeita) |
| 3 | "Qual a categoria?" | path feliz (equipamento, locação, equipe, transporte, outro), inválida (rejeita) |
| 4 | Cria Expense | confirmação com valor + projeto + categoria |

#### Expense Category Equivalence Partitions

| Partição | Valor | Esperado |
|----------|-------|----------|
| Válida (equipamento) | `"Equipamento"` | `data.category === 'equipment'` |
| Válida (locação) | `"Locação"` | `data.category === 'location'` |
| Válida (equipe) | `"Equipe"` | `data.category === 'crew'` |
| Válida (transporte) | `"Transporte"` | `data.category === 'travel'` |
| Válida (outro) | `"Outro"` | `data.category === 'other'` |
| Inválida | `"Comida"` | rejeita |

---

### Task 3.12–3.14: `/receita` — Steps 0–4

Same structure as `/despesa` but creates Revenue instead of Expense.

| # | Test | Diferenciação |
|---|------|---------------|
| 1 | creates Revenue with status "pending" | EP — estado inicial |
| 2 | asks "recebido ou pendente?" | EP — partições |
| 3 | "recebido" → status=received | Path — feliz |
| 4 | "pendente" → status=pending | Path — feliz |
| 5 | confirmation includes "receita" not "despesa" | EG — legibilidade |

---

### Task 3.15–3.16: `/briefing` — Steps 0–2

| # | Test | Estratégia |
|---|------|-----------|
| 1 | step 0: asks for project ID | EP — início |
| 2 | step 1: receives text, asks to confirm | Path — feliz |
| 3 | step 1: rejects empty briefing text | BV — len 0 |
| 4 | step 1: accepts 1 char briefing (min) | BV — len 1 |
| 5 | step 1: accepts 10000 char briefing (max) | BV — len 10000 |
| 6 | step 1: rejects >10000 chars | BV — len 10001 |
| 7 | step 2: "confirmar" → creates Briefing, author="WhatsApp" | Path — feliz |
| 8 | step 2: "cancelar" → returns to step 0 | EP — decisão |
| 9 | completed: confirmation includes "briefing salvo" | EG — legibilidade |

---

### Task 3.17–3.18: `/status` — Steps 0–1

> **Strategy:** Path Coverage (deal exists, deal not found) + Error Guessing

| # | Test | Expected |
|---|------|----------|
| 1 | step 0: asks for project ID | msg "ID" |
| 2 | step 1: deal found → shows full summary | contém: nome, status, briefing ✅/❌, proposta ✅/❌, despesas R$, receitas R$, próximo booking |
| 3 | step 1: deal NOT found → "Projeto não encontrado" | msg erro, stays step 1 |
| 4 | step 1: no expenses → "Despesas: R$ 0,00" | EP — valor vazio |
| 5 | step 1: no briefing → "Briefing: ❌" | EP — sem briefing |
| 6 | step 1: no proposal → "Proposta: ❌" | EP — sem proposta |

---

### Task 3.19–3.21: `/contatos` — Steps 0–2

> **Strategy:** Boundary Value (search term length) + Equivalence Partitioning (found, not found, multiple results)

| # | Test | Estratégia | Input | Expected |
|---|------|-----------|-------|----------|
| 1 | step 0: asks for search term (min 3 letras) | EP — início | — | msg "mínimo 3 letras" |
| 2 | step 1: <3 chars → rejeita | BV — min-1 | `"ab"` | `step !== 2` |
| 3 | step 1: 3 chars → aceita | BV — min | `"mar"` | `nextStep === 2` |
| 4 | step 1: 50 chars → aceita | BV — max | `"a".repeat(50)` | `nextStep === 2` |
| 5 | step 1: 51 chars → rejeita | BV — max+1 | `"a".repeat(51)` | `step !== 2` |
| 6 | step 1: empty → rejeita | BV — vazio | `""` | `step !== 2` |
| 7 | step 2: finds contacts → lista nome+telefone+status | EP — resultados | "mar" match | mostra resultados |
| 8 | step 2: no contacts → "Nenhum contato encontrado" | EP — vazio | "xyz" no match | msg "nenhum" |
| 9 | step 2: many contacts → mostra top 5 + "e mais N" | EG — muitos | "a" match 20 | "e mais 15" |
| 10 | search is case-insensitive | EG — case | "MAR" | encontra "Maria" |
| 11 | search matches both name and phone | EG — match duplo | "2199" | encontra por telefone |

**Formato de resposta:**
```
🔍 Contatos encontrados para "mar":
#C1 — Maria Silva — (21) 99999-9999 ✅ Ativo
#C2 — Marcos Oliveira — (21) 98888-8888 ✅ Ativo
#C3 — Marta Souza — (21) 97777-7777 ⏸️ Lead
```

---

### Task 3.22–3.23: `/calendario` — Steps 0–2

> **Strategy:** Boundary Value (date ranges) + Equivalence Partitioning (no bookings, has bookings)

| # | Test | Estratégia | Input | Expected |
|---|------|-----------|-------|----------|
| 1 | step 0: asks for period | EP — início | — | "Hoje / Essa semana / Esse mês" |
| 2 | "hoje" → filters today's bookings | EP — partição | "hoje" | bookings onde date=today |
| 3 | "essa semana" → filters this week | EP — partição | "semana" | bookings date=this_week |
| 4 | "esse mês" → filters this month | EP — partição | "mês" | bookings date=this_month |
| 5 | invalid period → stays step 0 | EG — edge | "ano" | `step !== 1` |
| 6 | no bookings → "Nenhum agendamento" | EP — vazio | "hoje" | msg "nenhum" |
| 7 | has bookings → lista data+cliente+tipo+status | EP — resultados | "hoje" | mostra lista |
| 8 | booking status com cores: pending=🟡, confirmed=🟢, completed=✅ | EG — display | — | chips corretos |

**Formato de resposta:**
```
📅 Agendamentos de hoje:
🟢 14:00 — Casamento João & Maria (Confirmado)
🟡 18:00 — Ensaio Familiar Santos (Pendente)
📍 Ambos no Estúdio ABC
```

---

### Task 3.24: `/ajuda` — Commands List

> **Strategy:** Equivalence Partitioning (one partition — always returns same list)

| # | Test | Expected |
|---|------|----------|
| 1 | returns list of all commands with descriptions | contém todos os comandos |
| 2 | each command has a short description | formato `/comando — descrição` |
| 3 | formato amigável e fácil de ler | EG — legibilidade |

```
📋 Comandos disponíveis:
/novoDeal — Criar novo projeto e cliente
/despesa — Registrar despesa
/receita — Registrar receita
/briefing — Adicionar briefing
/status — Ver resumo do projeto
/contatos — Buscar contatos
/calendario — Ver agendamentos
/pacotes — Listar pacotes
/projeto — Ver detalhes do projeto
/cancelar — Cancelar operação atual
```

---

### Task 3.25: `/projeto` — Project Details

> **Strategy:** Equivalence Partitioning (found vs not found) + Path Coverage

| # | Test | Expected |
|---|------|----------|
| 1 | step 0: asks for project ID | — |
| 2 | step 1: found → shows client, status, value, bookings, docs | contém todos os campos |
| 3 | step 1: not found → "Projeto não encontrado" | stays step 1 |

---

### Task 3.26: `/pacotes` — List Packages

| # | Test | Expected |
|---|------|----------|
| 1 | step 0: pergunta se quer ativos ou todos | — |
| 2 | "ativos" → só active=true | EP — filtro |
| 3 | "todos" → todos da org | EP — sem filtro |
| 4 | no packages → "Nenhum pacote cadastrado" | EP — vazio |

---

## Phase 4: Flow Orchestrator

> **Strategy:** Decision Table (4 combinations of session state × input type) + Path Coverage (all error branches)

### Decision Table — Message Routing

| Sessão Ativa? | Tipo Input | Ação |
|:---:|:---|---|
| ❌ | É comando | Cria sessão, executa step 0 |
| ✅ | Não é comando | Executa step atual com input |
| ✅ | É comando (`/cancelar`) | Deleta sessão, confirma cancelamento |
| ✅ | É outro comando | Deleta sessão antiga, cria nova, executa step 0 |

| # | Test | Estratégia | Expected |
|---|------|-----------|----------|
| 1 | no session + command → creates session, runs step 0 | DT — linha 1 | step 0 response |
| 2 | active session + text → runs current step | DT — linha 2 | step N response |
| 3 | active session + `/cancelar` → deletes, confirms | DT — linha 3 | msg "cancelado" |
| 4 | active session + new command → replaces, runs step 0 | DT — linha 4 | new step 0 |
| 5 | after final step + entities created → deletes session | Path — complete | session gone |
| 6 | error during entity creation → warns user, keeps session | Path — erro DB | msg "erro" |
| 7 | invalid orgId → warns user | EG — edge | msg "erro de permissão" |

---

## Phase 5: WhatsApp Webhook

> **Strategy:** Boundary Value (challenge token length) + Error Guessing (malformed body) + Equivalence Partitioning (message types)

| # | Test | Estratégia | Expected |
|---|------|-----------|----------|
| 1 | GET with valid challenge → returns 200 with challenge | Path — verify | `200 body=challenge` |
| 2 | GET with wrong verify_token → returns 403 | EP — token inválido | `403` |
| 3 | GET empty challenge → returns 400 | BV — vazio | `400` |
| 4 | POST with text message → extracts phone+body | Path — feliz | `phone, body` |
| 5 | POST with image → ignored (200 OK) | EP — não-texto | `200`, no processing |
| 6 | POST with document → ignored (200 OK) | EP — não-texto | `200`, no processing |
| 7 | POST malformed JSON body → 400 | EG — malformed | `400` |
| 8 | POST empty body → 400 | BV — vazio | `400` |

---

## Phase 6: Integration Tests (one behavior per test)

> **Strategy:** One test = one assertion. Split flows into individual behaviors.

### Task 6.1: `/novoDeal` full flow — entity creation

```typescript
it('creates Client entity after full novoDeal flow')
it('creates Deal entity after full novoDeal flow')
it('creates Proposal when user says sim')
it('does NOT create Proposal when user says não')
it('cleans up session after novoDeal completion')
it('cleans up session after /cancelar mid-novoDeal')
it('deletes old session when new command starts')
it('recovers from DB error during entity creation')  // EG
```

### Task 6.2: Other flows

```typescript
it('creates Expense after full despesa flow')
it('creates Revenue after full receita flow')
it('creates Briefing after full briefing flow')
it('returns deal summary for /status')
it('returns contacts matching search term for /contatos')
it('returns upcoming bookings for /calendario')
```

---

## Phase 7: Additional Commands (already integrated)

All commands from Phase 3 tasks 3.19–3.26 are included above:
- `/contatos` (3.19–3.21) — search contacts
- `/calendario` (3.22–3.23) — view schedule
- `/ajuda` (3.24) — help
- `/projeto` (3.25) — project details
- `/pacotes` (3.26) — list packages
- `/receita` (3.12–3.14) — register revenue

---

## Execution Order Summary

| Phase | Tasks | Tests | Est. Time |
|-------|-------|-------|-----------|
| 0 — Schema | 0.1 | — | 5 min |
| 1 — Command Detection | 1.1 | 20 tests | 20 min |
| 2 — Session Management | 2.1–2.5 | 18 tests | 25 min |
| 3 — `/novoDeal` (steps + decision table) | 3.1–3.7 | 34 tests | 50 min |
| 3 — `/despesa` | 3.8–3.11 | 12 tests | 20 min |
| 3 — `/receita` | 3.12–3.14 | 10 tests | 15 min |
| 3 — `/briefing` | 3.15–3.16 | 9 tests | 15 min |
| 3 — `/status` | 3.17–3.18 | 6 tests | 10 min |
| 3 — `/contatos` | 3.19–3.21 | 11 tests | 20 min |
| 3 — `/calendario` | 3.22–3.23 | 8 tests | 15 min |
| 3 — `/ajuda`, `/projeto`, `/pacotes` | 3.24–3.26 | 9 tests | 15 min |
| 4 — Flow Orchestrator | 4.1 | 7 tests | 15 min |
| 5 — WhatsApp Webhook | 5.1 | 8 tests | 15 min |
| 6 — Integration (one behavior each) | 6.1–6.2 | 11 tests | 25 min |
| **Total** | **~45 tasks** | **~163 tests** | **~4.5h** |

---

## TDD Cycle per Task (Mandatory)

For each task:

```
🔴 RED:   Write 1 test file → run → confirm FAIL
🟢 GREEN: Write minimal code → run → confirm PASS
🔵 REFACTOR: Clean up, remove duplication
✅ VERIFY: Run full suite → confirm no regressions
```

**No commit between RED→GREEN→REFACTOR.** One atomic unit.

**If test passes without failing first:** you're testing existing code. Delete test, start over.

---

## Key Anti-Patterns to Avoid (per tdd skill)

| Anti-Pattern | Correct |
|-------------|---------|
| Hardcoded values in tests | Use functions (`crypto.randomUUID()`, `Date.now()`) |
| Testing multiple behaviors per test | One assertion per test ("and" in name → split) |
| Skipping boundary values | Test min, min+1, max-1, max, zero, negative |
| Skipping error guessing | Empty strings, special chars, whitespace, null |
| Tests that pass immediately | Must fail first due to missing implementation |
| Committing RED only | Complete RED→GREEN→REFACTOR before commit |
