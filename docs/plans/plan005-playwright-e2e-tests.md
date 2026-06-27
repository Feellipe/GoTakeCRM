# Playwright E2E Test Plan — GoTakeCRM

> **TDD approach:** RED phase first — write the test that documents current behavior (even if it's a known bug), then GREEN when the fix is implemented. Each test is a self-contained user story.

**Goal:** Map all E2E smoke tests needed for the GoTakeCRM dashboard, organized by feature area and priority.

**Current test suite:** 6 tests (setup/login + 5 smoke tests on desktop sidebar + mobile sidebar)

**Project pages mapped:**

| Route | Type | Auth |
|-------|------|------|
| `/login` | Login form | Public |
| `/register` | Registration | Public |
| `/dashboard` | Dashboard overview | Protected |
| `/clients` | Client list + CRUD | Protected |
| `/pipeline` | Kanban pipeline | Protected |
| `/proposals` | Proposals list | Protected |
| `/financials` | Revenues/Expenses | Protected |
| `/calendar` | Calendar view | Protected |
| `/settings` | Profile + WhatsApp config | Protected |

---

## Phase 0 — Auth & Layout Foundation (✅ DONE)

These tests exist in `e2e/dashboard.spec.ts` and document the **current** (known-buggy) behavior.

| # | Test | Status | Notes |
|---|------|--------|-------|
| 0.1 | Login com credenciais demo | ✅ Done | Setup global: `demo@gotakecrm.com` / `demo2026` |
| 0.2 | Sidebar visível w-64 no desktop | ✅ Done | `glass-sidebar` com nav items |
| 0.3 | Sidebar colapsa p/ w-20 no toggle | ✅ Done | Botão X/Menu no header |
| 0.4 | Settings é botão no rodapé, não nav | ✅ Done | `lucide-settings` no user section |
| 0.5 | Nav para Clients via link | ✅ Done | Click → URL /clients |
| 0.6 | Mobile 375px — sidebar w-64 SEMPRE visível | ✅ Done | **Documenta o bug:** 68% da tela ocupada |

---

## Phase 1 — Auth Flow (PRIORIDADE: ALTA)

Testes de autenticação — login, redirects, logout.

### 1.1 Login — erro de credenciais inválidas

**Interação:**
- Navegar p/ `/login`
- Preencher email errado + senha errada
- Clicar "Sign in"

**Esperado:**
- URL permanece `/login`
- Mensagem de erro visível (Alert com "Invalid credentials")

**Estratégia TDD:** EP (válido + inválido), EG (senha errada, email errado, ambos errados)

### 1.2 Login — redirect protegido

**Interação:**
- Navegar p/ `/dashboard` sem login
- Fazer login com credenciais corretas

**Esperado:**
- Após login, redirect para `/dashboard`

**Estratégia TDD:** PC (protected route redirect)

### 1.3 Logout

**Interação:**
- Estar logado no dashboard
- Clicar no avatar/área do usuário → opção de logout (se existir)

**Esperado:**
- Volta para `/login`

**Estratégia TDD:** PC (happy path)

### 1.4 Register — criação de conta + auto-org

**Interação:**
- Navegar p/ `/register`
- Preencher name, email, password, confirm password
- Clicar "Create Account"

**Esperado:**
- Redirect p/ dashboard
- Sidebar visível

**Estratégia TDD:** EP (senha curta, email inválido, confirmação diferente), BV (senha min length)

---

## Phase 2 — Navigation & Layout (PRIORIDADE: ALTA)

Testes de navegação entre todas as páginas via sidebar.

### 2.1 Navegação completa via sidebar

**Interação:** Para cada nav item (Pipeline, Proposals, Financials, Calendar, Settings), clicar e verificar URL + título da página.

**Esperado:**
- Clients → URL `/clients`
- Pipeline → URL `/pipeline`
- Proposals → URL `/proposals`
- Financials → URL `/financials`
- Calendar → URL `/calendar`
- Settings → URL `/settings`

**Estratégia TDD:** PC (path coverage — todas as rotas)

### 2.2 Mini sidebar (w-20) — navegação só com ícones

**Interação:**
- Colapsar sidebar para w-20
- Clicar no ícone de Clients

**Esperado:**
- Navega p/ `/clients` mesmo sem label visível

**Estratégia TDD:** PC

### 2.3 Desktop — sidebar expandida vs colapsada por default

**Interação:**
- Hard refresh da página

**Esperado:**
- Sidebar começa com `w-64`

**Estratégia TDD:** BV (persistência de estado)

---

## Phase 3 — Mobile Responsiveness (PRIORIDADE: ALTA)

Testes que documentam bugs atuais e serão corrigidos com PR #2.

### 3.1 Mobile — menu hamburger existe e abre sidebar

**BI** **Target behavior (após PR #2):**
- Botão hamburger (Menu icon) visível no canto superior esquerdo
- Sidebar oculta por padrão (`-translate-x-full`)
- Click no hamburger → sidebar abre (translate-x-0) + backdrop aparece

**Current behavior (deployado):**
- Sidebar w-64 sempre visível, ocupa 68% da tela
- Menu hamburger não existe
- Sem backdrop/overlay

**Estratégia TDD:** PC (antes x depois)

### 3.2 Mobile — backdrop fecha sidebar

**BI** **Target behavior:**
- Sidebar aberta → click no backdrop → sidebar fecha

### 3.3 Mobile — navegação via sidebar fecha sidebar

**BI** **Target behavior:**
- Sidebar aberta → click em nav item → sidebar fecha → página navega

### 3.4 Mobile — W fontes com clamp()

**BI** **Target behavior:**
- Fontes no sidebar usam `clamp()` para responsividade
- Texto não quebra layout

---

## Phase 4 — CRUD: Clients (PRIORIDADE: MÉDIA)

### 4.1 Clients — lista carrega e exibe dados

**Interação:**
- Navegar p/ `/clients`
- Aguardar carregamento

**Esperado:**
- Tabela ou lista de clients visível
- Cabeçalho "Clients" visível

**Estratégia TDD:** PC (happy path)

### 4.2 Clients — modal/botão de criar abre

**Interação:**
- Clicar em botão "Add Client" (ou similar)

**Esperado:**
- Modal ou formulário de criação abre
- Campos: name, email, phone, etc.

### 4.3 Clients — criar client com dados válidos

**Interação:**
- Abrir modal de criação
- Preencher name, email, phone
- Salvar

**Esperado:**
- Client aparece na lista
- Modal fecha

**Estratégia TDD:** EP (dados válidos), EG (nome vazio, email inválido)

### 4.4 Clients — criar client com campos inválidos

**Interação:**
- Abrir modal
- Deixar nome vazio
- Tentar salvar

**Esperado:**
- Erro de validação visível
- Modal não fecha

**Estratégia TDD:** BV (string vazia), EP (email mal formatado)

### 4.5 Clients — deletar client

**Interação:**
- Clicar em deletar em um client existente
- Confirmar no diálogo

**Esperado:**
- Client some da lista

**Estratégia TDD:** PC (delete flow)

### 4.6 Clients — empty state

**Interação:**
- Se não houver clients

**Esperado:**
- Mensagem ou ilustração de empty state visível

**Estratégia TDD:** PC (empty state branch)

---

## Phase 5 — CRUD: Pipeline/Deals (PRIORIDADE: MÉDIA)

### 5.1 Pipeline — colunas carregam

**Interação:**
- Navegar p/ `/pipeline`

**Esperado:**
- Kanban board com colunas (ex: Lead, Negotiation, Won, Lost)

### 5.2 Pipeline — criar deal

**Interação:**
- Clicar "Add Deal"
- Preencher dados
- Salvar

**Esperado:**
- Card aparece na coluna correta

**Estratégia TDD:** EP (dados válidos), BV (valor 0, negativo)

### 5.3 Pipeline — drag & drop (se aplicável)

**Interação:**
- Arrastar card de uma coluna p/ outra

**Esperado:**
- Card aparece na nova coluna
- Estado persiste após refresh

---

## Phase 6 — CRUD: Financials (PRIORIDADE: MÉDIA)

### 6.1 Financials — abas Revenue / Expense funcionam

**Interação:**
- Navegar p/ `/financials`
- Clicar em "Revenue" tab
- Clicar em "Expense" tab

**Esperado:**
- Cada aba mostra dados corretos

**Estratégia TDD:** PC (path coverage — ambas abas)

### 6.2 Financials — criar revenue

**Interação:**
- Aba Revenue → "Add Revenue"
- Preencher valor, descrição, data
- Salvar

**Esperado:**
- Revenue aparece na lista

**Estratégia TDD:** BV (valor 0, negativo, muito alto), EP (moeda)

### 6.3 Financials — criar expense

**Interação:**
- Aba Expense → "Add Expense"
- Preencher valor, descrição, categoria
- Salvar

**Esperado:**
- Expense aparece na lista

---

## Phase 7 — Proposals & Calendar (PRIORIDADE: BAIXA)

### 7.1 Proposals — lista carrega

**Interação:**
- Navegar p/ `/proposals`

**Esperado:**
- Lista de proposals visível (ou empty state)

### 7.2 Calendar — carrega

**Interação:**
- Navegar p/ `/calendar`

**Esperado:**
- Componente de calendário visível

---

## Phase 8 — Settings (PRIORIDADE: MÉDIA)

### 8.1 Settings — profile section carrega

**Interação:**
- Navegar p/ `/settings`

**Esperado:**
- Formulário de profile visível (name, email)
- Seção "WhatsApp Bot" visível

### 8.2 Settings — editar profile name

**Interação:**
- Alterar nome no campo
- Salvar

**Esperado:**
- Toast/sucesso visível
- Nome persiste após refresh

**Estratégia TDD:** BV (string vazia, max length), EG (espaços, caracteres especiais)

### 8.3 Settings — WhatsApp config fields existem

**Interação:**
- Rolar até seção WhatsApp Bot

**Esperado:**
- Campos: Phone ID, Token, Phone Number
- Botão "Save Configuration"

---

## Phase 9 — Error & Edge States (PRIORIDADE: BAIXA)

### 9.1 404 page

**Interação:**
- Navegar p/ rota inexistente

**Esperado:**
- Página 404 ou redirect

### 9.2 Network error state

**Interação:**
- (Se possível simular) API offline

**Esperado:**
- Mensagem de erro ou retry visível

---

## Phase 10 — Dashboard Overview (PRIORIDADE: BAIXA)

### 10.1 Dashboard — widgets carregam

**Interação:**
- Navegar p/ `/dashboard`

**Esperado:**
- Widgets visíveis: total clients, revenue, deals, etc.

---

## Summary

| Phase | Tests | Priority | Depends on |
|-------|-------|----------|------------|
| 0 — Auth Setup | 6 ✅ | — | Already done |
| 1 — Auth Flow | 4 | 🔴 ALTA | — |
| 2 — Navigation | 3 | 🔴 ALTA | — |
| 3 — Mobile | 4 | 🔴 ALTA | PR #2 sidebar fix |
| 4 — Clients CRUD | 6 | 🟡 MÉDIA | — |
| 5 — Pipeline/Deals | 3 | 🟡 MÉDIA | — |
| 6 — Financials | 3 | 🟡 MÉDIA | — |
| 7 — Proposals/Calendar | 2 | 🟢 BAIXA | — |
| 8 — Settings | 3 | 🟡 MÉDIA | — |
| 9 — Errors/Edge | 2 | 🟢 BAIXA | — |
| 10 — Dashboard | 1 | 🟢 BAIXA | — |
| **Total** | **~37 testes** | | |

> **Nota sobre subscriber count:** Em um projeto SaaS real, fases 4-8 seriam prioridade máxima (CRUD é o core do produto). Aqui, como você é o único dev e o foco imediato é layout mobile, as prioridades refletem o momento atual.

---

## Como implementar (TDD cycle)

Para cada teste, o ciclo é:

1. **RED** — Escrever o teste primeiro (documenta comportamento atual ou esperado)
2. **FAIL** — Rodar `npx playwright test` — test deve falhar se o comportamento ainda não existe
3. **GREEN** — Implementar o fix/código que faz o teste passar
4. **REFACTOR** — Ajustar seletor, melhorar legibilidade
5. **COMMIT** — `git commit -m "test: add ..."`

---

## Próximos passos sugeridos

1. ✅ **Fase 0** — Setup + sidebar básico (feito)
2. ⬜ **Fase 1** — Tests de auth (login error, redirect, logout)
3. ⬜ **Fase 2** — Navegação completa
4. ⬜ **PR #2** — Mobile fix sidebar (perde testes 3.1-3.4)
5. ⬜ **Fase 3** — Testes mobile PÓS fix
6. ⬜ **Fases 4-8** — CRUD flows conforme necessidade
