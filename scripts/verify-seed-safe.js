/**
 * verify-seed-safe.js
 * ===================
 * Script de verificação pré-deploy que garante que NENHUMA variável
 * relacionada a seed está presente no ambiente de produção.
 *
 * Uso:
 *   node scripts/verify-seed-safe.js
 *
 * Este script é executado como parte do CI/CD para bloquear o deploy
 * se detectar que o seed pode ser executado acidentalmente.
 */

const REQUIRED_BLOCKS = ["SEED_ALLOWED", "SEED_DEV_CONFIRMED"];
const WARN_VARS = ["SEED_ALLOWED", "SEED_DEV_CONFIRMED", "SEED_ENABLED", "DEMO_SEED"];

let hasError = false;

console.log("🔍 Verificando segurança do seed...\n");

// Guard 1: VERCEL_ENV é a proteção mais forte
const vercelEnv = process.env.VERCEL_ENV;
if (!vercelEnv) {
  console.log("  ⚠️  VERCEL_ENV não está setado — pode ser ambiente local.");
} else if (vercelEnv === "production") {
  console.log("  ✅ VERCEL_ENV=production — seed está bloqueado pelo código.");
}

// Guard 2: Verificar se SEED_ALLOWED está definido no ambiente
for (const varName of WARN_VARS) {
  const val = process.env[varName];
  if (val !== undefined && val !== "") {
    console.error(`  ❌ PERIGO: ${varName}=${val} está definido neste ambiente!`);
    if (varName === "SEED_ALLOWED" && val === "true") {
      console.error(
        "     Isso permitiria o seed executar se VERCEL_ENV não for production!"
      );
    }
    hasError = true;
  } else {
    console.log(`  ✅ ${varName} não está definido.`);
  }
}

// Guard 3: Verificar se DATABASE_URL parece remota sem SEED_DEV_CONFIRMED
const dbUrl = process.env.DATABASE_URL || "";
if (dbUrl.includes("supabase.co")) {
  const seedConfirmed = process.env.SEED_DEV_CONFIRMED;
  if (seedConfirmed === "true") {
    console.log("  ⚠️  DATABASE_URL remota (supabase.co) mas SEED_DEV_CONFIRMED está ativo.");
    console.log("     Isso pode ser seguro em preview, mas verifique manualmente.");
  }
}

// Resultado final
console.log("");
if (hasError) {
  console.error("❌ VERIFICAÇÃO FALHOU — Variáveis de seed detectadas neste ambiente!");
  console.error("   Remova-as ou confirme que este NÃO é ambiente de produção.");
  process.exit(1);
} else {
  console.log("✅ VERIFICAÇÃO APROVADA — Nenhuma variável de seed insegura encontrada.");
  process.exit(0);
}
