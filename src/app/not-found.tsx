import React from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Card className="glass-card max-w-md w-full mx-4">
        <CardContent className="p-8 text-center space-y-6">
          <div className="text-8xl font-bold text-primary/20">404</div>
          <h2 className="text-2xl font-bold text-foreground">Page Not Found</h2>
          <p className="text-muted-foreground text-sm">
            The page you are looking for does not exist or has been moved.
          </p>
          <div className="flex gap-3 justify-center">
            <Link href="/dashboard">
              <Button className="gradient-gold text-warm-950 hover:opacity-90 transition-all">
                <Home className="w-4 h-4 mr-2" />
                Dashboard
              </Button>
            </Link>
            <Button variant="outline" onClick={() => typeof window !== 'undefined' && window.history.back()}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
