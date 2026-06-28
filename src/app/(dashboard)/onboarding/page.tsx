'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, Loader2 } from 'lucide-react';

export default function OnboardingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleCreateWorkspace = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        router.push('/dashboard');
      }
    } catch {
      // Fallback: let user retry
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-md mx-auto text-center px-6">
        {/* Icon */}
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-gold to-gold-light shadow-lg shadow-gold/30 mb-8">
          <Sparkles className="w-10 h-10 text-white" />
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-foreground mb-3">
          Vamos começar!
        </h1>

        {/* Description */}
        <p className="text-muted-foreground mb-8 leading-relaxed">
          Crie seu primeiro workspace para começar a gerenciar seus clientes,
          propostas e agendas em um só lugar.
        </p>

        {/* CTA Button */}
        <button
          onClick={handleCreateWorkspace}
          disabled={loading}
          className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-gold to-gold-light text-warm-950 font-semibold text-lg shadow-lg shadow-gold/20 hover:shadow-gold/30 hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Criando...
            </>
          ) : (
            'Criar meu workspace'
          )}
        </button>
      </div>
    </div>
  );
}
