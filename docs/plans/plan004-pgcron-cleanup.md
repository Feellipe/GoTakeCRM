# Plano: Migrar Cleanup de Sessoes WhatsApp para pg_cron (Supabase)

**Versao:** 1.0
**Data:** 2026-06-23
**Projeto:** GoTakeCRM — CRM Dashboard para Filmakers/Fotografos

---

## Sumario

- [1. Contexto](#1-contexto)
- [2. Arquitetura Atual vs Proposta](#2-arquitetura-atual-vs-proposta)
- [3. Pre-Requisitos](#3-pre-requisitos)
- [4. Implementacao no Supabase](#4-implementacao-no-supabase)
- [5. Remocao de Artefatos Locais](#5-remocao-de-artefatos-locais)
- [6. Verificacao](#6-verificacao)
- [7. Alternativa para Plano Free](#7-alternativa-para-plano-free)

---

## 1. Contexto

A tabela `command_sessions` armazena sessoes temporarias dos comandos do WhatsApp
(flows como `novoDeal`, `despesa`, `receita`, etc.). Cada sessao tem um `expires_at`
e precisa ser limpa periodicamente para evitar acumulo de dados obsoletos.

Atualmente o cleanup e feito por um cronjob do Hermes Agent que roda a cada 60 minutos.
Isso nao e adequado para producao porque:

- O Hermes Agent nao fica rodando 24/7 em producao
- O banco Supabase ja tem `pg_cron` nativo para isso
- `pg_cron` e mais confiavel e nao depende de agente externo

---

## 2. Arquitetura Atual vs Proposta

### 2.1 Atual

```
Hermes Agent (cronjob a cada 60min)
  └─ script cleanup-whatsapp-sessions.sh
       └─ npx prisma db execute --delete ... WHERE expires_at < NOW()
```

### 2.2 Proposta

```
PostgreSQL pg_cron (a cada 60min)
  └─ cron.schedule('cleanup-whatsapp-sessions', '0 * * * *', ...)
       └─ DELETE FROM command_sessions WHERE expires_at < NOW()
```

---

## 3. Pre-Requisitos

- Plano Supabase **Pro** ou superior (pg_cron nao disponivel no Free)
- Acesso ao SQL Editor do Supabase Dashboard
- Extensao `pg_cron` habilitada no projeto

---

## 4. Implementacao no Supabase

### 4.1 Criar funcao de cleanup

Via Prisma migration (recomendado) ou SQL Editor:

```sql
-- Cria funcao para limpeza de sessoes expiradas
CREATE OR REPLACE FUNCTION public.cleanup_expired_command_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.command_sessions
  WHERE expires_at < NOW();
END;
$$;
```

**Comando Prisma (se for via migration):**

```bash
npx prisma migrate dev --create-only --name add_cleanup_expired_sessions
```

Editar o arquivo SQL gerado em `prisma/migrations/.../migration.sql` para incluir a funcao acima.

### 4.2 Ativar extensao pg_cron

Via Prisma migration ou SQL Editor:

```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;
```

### 4.3 Agendar job

```sql
-- Agenda cleanup a cada hora
SELECT cron.schedule(
  'cleanup-whatsapp-sessions',  -- nome do job
  '0 * * * *',                  -- cron expression: minuto 0 de cada hora
  $$SELECT public.cleanup_expired_command_sessions()$$
);
```

### 4.4 Comandos de gerenciamento

```sql
-- Listar jobs ativos
SELECT jobid, jobname, schedule, command FROM cron.job;

-- Ver historico de execucoes
SELECT * FROM cron.job_run_details
ORDER BY start_time DESC
LIMIT 10;

-- Remover job (se necessario)
SELECT cron.unschedule('cleanup-whatsapp-sessions');
```

---

## 5. Remocao de Artefatos Locais

```bash
# Remover script local (ja feito)
rm -f ~/.hermes/scripts/cleanup-whatsapp-sessions.sh

# Verificar que o cronjob do Hermes foi removido
hermes cron list
# Deve mostrar 0 jobs
```

> O cronjob do Hermes ja foi removido neste mesmo dia (23/06/2026) durante a
> sessao de desenvolvimento. Confirmar que nao existem jobs remanescentes.

---

## 6. Verificacao

Apos configurar o pg_cron:

1. Executar manualmente a funcao para testar:
   ```sql
   SELECT public.cleanup_expired_command_sessions();
   ```

2. Verificar se o job aparece na lista:
   ```sql
   SELECT * FROM cron.job;
   ```

3. Aguardar a proxima execucao agendada ou forcar com:
   ```sql
   -- Nota: pg_cron nao tem run-now, precisa esperar o schedule
   -- Ou executar a funcao manualmente
   ```

4. Verificar historico de execucoes:
   ```sql
   SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 5;
   ```

---

## 7. Alternativa para Plano Free

Se o Supabase estiver no plano **Free** (pg_cron indisponivel):

| Opcao | Descricao | Esforco |
|-------|-----------|---------|
| Supabase Edge Function + cron | Edge Function chamando API do proprio app | Medio |
| GitHub Action schedule | Workflow que roda `npx prisma db execute` periodicamente | Baixo |
| Vercel Cron Jobs | `crons` config no `vercel.json` (max 2 por projeto) | Baixo |
| Manter no Hermes Agent | Nao recomendado para producao | Zero |

**Recomendacao para Free:** Usar **Vercel Cron Jobs** com um endpoint interno
`/api/cron/cleanup-sessions` protegido por `CRON_SECRET`.

Exemplo:

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/cleanup-sessions",
      "schedule": "0 * * * *"
    }
  ]
}
```

```tsx
// src/app/api/cron/cleanup-sessions/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await db.commandSession.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });

  return NextResponse.json({ cleaned: result.count });
}
```
