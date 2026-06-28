'use client';

import * as React from 'react';
import { Settings, User, Bell, Palette, Globe, Shield, LogOut, ChevronRight, Moon, Sun, Monitor, MessageSquare, Loader2, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';

interface UserData {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  lastLoginAt: string | null;
  createdAt: string;
}

interface OrgData {
  id: string;
  name: string;
  slug: string;
  plan: string;
  whatsappPhoneId?: string | null;
  whatsappPhone?: string | null;
  stripePublicKey?: string | null;
  stripeSecretKey?: string | null;
  stripeWebhookSecret?: string | null;
}

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [savingProfile, setSavingProfile] = React.useState(false);
  const [savingWhatsApp, setSavingWhatsApp] = React.useState(false);

  // User data
  const [user, setUser] = React.useState<UserData | null>(null);
  const [activeOrg, setActiveOrg] = React.useState<OrgData | null>(null);
  const [organizations, setOrganizations] = React.useState<OrgData[]>([]);

  // Profile form state
  const [profileName, setProfileName] = React.useState('');
  const [profileEmail, setProfileEmail] = React.useState('');

  // WhatsApp form state
  const [whatsappPhoneId, setWhatsappPhoneId] = React.useState('');
  const [whatsappToken, setWhatsappToken] = React.useState('');
  const [whatsappPhone, setWhatsappPhone] = React.useState('');

  // Stripe form state
  const [stripePublicKey, setStripePublicKey] = React.useState('');
  const [stripeSecretKey, setStripeSecretKey] = React.useState('');
  const [stripeWebhookSecret, setStripeWebhookSecret] = React.useState('');
  const [savingStripe, setSavingStripe] = React.useState(false);

  // Local settings state
  const [settings, setSettings] = React.useState({
    notifications: true,
    emailAlerts: true,
    soundEffects: false,
    autoRefresh: true,
    refreshInterval: '15',
    language: 'en',
    currency: 'BRL',
    dateFormat: 'MMM d, yyyy',
  });

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch user data when component mounts
  const fetchUserData = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setOrganizations(data.organizations || []);
        if (data.organizations && data.organizations.length > 0) {
          setActiveOrg(data.organizations[0]);
        }
        setProfileName(data.user?.name || '');
        setProfileEmail(data.user?.email || '');
      }
    } catch (error) {
      console.error('Failed to load user data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  // Sync WhatsApp form fields from org data
  React.useEffect(() => {
    if (activeOrg) {
      setWhatsappPhoneId(activeOrg.whatsappPhoneId || '');
      setWhatsappPhone(activeOrg.whatsappPhone || '');
    }
  }, [activeOrg]);

  // Sync Stripe form fields from org data
  React.useEffect(() => {
    if (activeOrg) {
      setStripePublicKey(activeOrg.stripePublicKey || '');
      setStripeSecretKey(''); // never prefill secret key
      setStripeWebhookSecret(''); // never prefill webhook secret
    }
  }, [activeOrg]);

  const updateSetting = (key: string, value: boolean | string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: profileName, email: profileEmail }),
      });

      if (res.ok) {
        const updated = await res.json();
        setUser(prev => prev ? { ...prev, name: updated.name, email: updated.email } : prev);
        toast.success('Profile updated successfully');
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to update profile');
      }
    } catch (error) {
      toast.error('Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveWhatsApp = async () => {
    if (!activeOrg) return;
    setSavingWhatsApp(true);
    try {
      const body: Record<string, string> = {};
      if (whatsappPhoneId) body.whatsappPhoneId = whatsappPhoneId;
      if (whatsappToken) body.whatsappToken = whatsappToken;
      if (whatsappPhone) body.whatsappPhone = whatsappPhone;

      const res = await fetch(`/api/admin/organizations/${activeOrg.id}/whatsapp`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const updated = await res.json();
        setActiveOrg(prev => prev ? {
          ...prev,
          whatsappPhoneId: updated.whatsappPhoneId,
          whatsappPhone: updated.whatsappPhone,
        } : prev);
        setWhatsappToken(''); // clear token field after save (it's not returned)
        toast.success('WhatsApp configuration saved successfully');
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to save WhatsApp configuration');
      }
    } catch (error) {
      toast.error('Failed to save WhatsApp configuration');
    } finally {
      setSavingWhatsApp(false);
    }
  };

  const handleSaveStripe = async () => {
    if (!activeOrg) return;
    setSavingStripe(true);
    try {
      const body: Record<string, string> = {};
      if (stripePublicKey) body.stripePublicKey = stripePublicKey;
      if (stripeSecretKey) body.stripeSecretKey = stripeSecretKey;
      if (stripeWebhookSecret) body.stripeWebhookSecret = stripeWebhookSecret;

      const res = await fetch(`/api/admin/organizations/${activeOrg.id}/stripe`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const updated = await res.json();
        setActiveOrg(prev => prev ? {
          ...prev,
          stripePublicKey: updated.stripePublicKey,
          stripeSecretKey: updated.stripeSecretKey,
        } : prev);
        setStripeSecretKey(''); // clear secret field after save (it's masked)
        toast.success('Stripe configuration saved successfully');
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to save Stripe configuration');
      }
    } catch (error) {
      toast.error('Failed to save Stripe configuration');
    } finally {
      setSavingStripe(false);
    }
  };

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '??';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24" data-testid="settings-container">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto text-[clamp(0.875rem,2.5vw,1rem)]" data-testid="settings-container">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Settings className="w-[clamp(1.25rem,4vw,1.75rem)] h-[clamp(1.25rem,4vw,1.75rem)] text-primary" />
          <h1 className="font-bold text-foreground text-[clamp(1.5rem,5vw,1.875rem)]">Settings</h1>
        </div>
        <p className="text-muted-foreground ml-10 text-[clamp(0.75rem,2.2vw,0.875rem)]">
          Customize your dashboard preferences
        </p>
      </div>

      {/* Responsive Grid: sections in cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" data-testid="settings-grid">
        {/* Profile Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="w-5 h-5 text-primary" />
              Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4 mb-4">
              <Avatar className="w-16 h-16 border-2 border-primary/20">
                <AvatarImage src={user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id || 'default'}`} />
                <AvatarFallback className="bg-primary text-primary-foreground">{initials}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{user?.name || 'User'}</p>
                <p className="text-sm text-muted-foreground truncate">{user?.email || ''}</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="name">Display Name</Label>
                <Input
                  id="name"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="bg-muted/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={profileEmail}
                  onChange={(e) => setProfileEmail(e.target.value)}
                  className="bg-muted/50"
                />
              </div>
              <Button
                onClick={handleSaveProfile}
                disabled={savingProfile}
                className="w-full"
              >
                {savingProfile ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Profile'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* WhatsApp Bot Section */}
        {activeOrg && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <MessageSquare className="w-5 h-5 text-primary" />
                WhatsApp Bot
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="whatsapp-phone-id">Phone ID</Label>
                <Input
                  id="whatsapp-phone-id"
                  value={whatsappPhoneId}
                  onChange={(e) => setWhatsappPhoneId(e.target.value)}
                  placeholder="WhatsApp Phone ID"
                  className="bg-muted/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="whatsapp-token">Token</Label>
                <Input
                  id="whatsapp-token"
                  type="password"
                  value={whatsappToken}
                  onChange={(e) => setWhatsappToken(e.target.value)}
                  placeholder="WhatsApp API Token"
                  className="bg-muted/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="whatsapp-phone">Phone Number</Label>
                <Input
                  id="whatsapp-phone"
                  value={whatsappPhone}
                  onChange={(e) => setWhatsappPhone(e.target.value)}
                  placeholder="+55 11 99999-9999"
                  className="bg-muted/50"
                />
              </div>
              <Button
                onClick={handleSaveWhatsApp}
                disabled={savingWhatsApp}
                className="w-full"
              >
                {savingWhatsApp ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save WhatsApp Config'
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Stripe Payments Section */}
        {activeOrg && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <CreditCard className="w-5 h-5 text-primary" />
                Stripe Payments
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="stripe-public-key">Publishable Key</Label>
                <Input
                  id="stripe-public-key"
                  value={stripePublicKey}
                  onChange={(e) => setStripePublicKey(e.target.value)}
                  placeholder="pk_live_..."
                  className="bg-muted/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stripe-secret-key">Secret Key</Label>
                <Input
                  id="stripe-secret-key"
                  type="password"
                  value={stripeSecretKey}
                  onChange={(e) => setStripeSecretKey(e.target.value)}
                  placeholder="sk_live_..."
                  className="bg-muted/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stripe-webhook-secret">Webhook Secret</Label>
                <Input
                  id="stripe-webhook-secret"
                  type="password"
                  value={stripeWebhookSecret}
                  onChange={(e) => setStripeWebhookSecret(e.target.value)}
                  placeholder="whsec_..."
                  className="bg-muted/50"
                />
              </div>
              <Button
                onClick={handleSaveStripe}
                disabled={savingStripe}
                className="w-full"
              >
                {savingStripe ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Stripe Config'
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Appearance Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Palette className="w-5 h-5 text-primary" />
              Appearance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Theme</Label>
              <div className="grid grid-cols-3 gap-2">
                {mounted && [
                  { value: 'light', label: 'Light', icon: Sun },
                  { value: 'dark', label: 'Dark', icon: Moon },
                  { value: 'system', label: 'System', icon: Monitor },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setTheme(option.value)}
                    className={`flex flex-col items-center gap-1 p-3 rounded-lg border transition-all ${
                      theme === option.value
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <option.icon className="w-5 h-5" />
                    <span className="text-xs">{option.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Language</Label>
              <Select value={settings.language} onValueChange={(v) => updateSetting('language', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="pt">Português</SelectItem>
                  <SelectItem value="es">Español</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Currency</Label>
                <Select value={settings.currency} onValueChange={(v) => updateSetting('currency', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BRL">BRL (R$)</SelectItem>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Date Format</Label>
                <Select value={settings.dateFormat} onValueChange={(v) => updateSetting('dateFormat', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MMM d, yyyy">Jan 1, 2024</SelectItem>
                    <SelectItem value="d MMM yyyy">1 Jan 2024</SelectItem>
                    <SelectItem value="dd/MM/yyyy">01/01/2024</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notifications Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Bell className="w-5 h-5 text-primary" />
              Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Push Notifications</p>
                <p className="text-xs text-muted-foreground">Receive alerts in browser</p>
              </div>
              <Switch
                checked={settings.notifications}
                onCheckedChange={(checked) => updateSetting('notifications', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Email Alerts</p>
                <p className="text-xs text-muted-foreground">Get updates via email</p>
              </div>
              <Switch
                checked={settings.emailAlerts}
                onCheckedChange={(checked) => updateSetting('emailAlerts', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Sound Effects</p>
                <p className="text-xs text-muted-foreground">Play sounds for alerts</p>
              </div>
              <Switch
                checked={settings.soundEffects}
                onCheckedChange={(checked) => updateSetting('soundEffects', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Data & Sync Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Globe className="w-5 h-5 text-primary" />
              Data & Sync
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Auto Refresh</p>
                <p className="text-xs text-muted-foreground">Automatically update data</p>
              </div>
              <Switch
                checked={settings.autoRefresh}
                onCheckedChange={(checked) => updateSetting('autoRefresh', checked)}
              />
            </div>
            {settings.autoRefresh && (
              <div className="space-y-2">
                <Label>Refresh Interval</Label>
                <Select value={settings.refreshInterval} onValueChange={(v) => updateSetting('refreshInterval', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">Every 5 minutes</SelectItem>
                    <SelectItem value="15">Every 15 minutes</SelectItem>
                    <SelectItem value="30">Every 30 minutes</SelectItem>
                    <SelectItem value="60">Every hour</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Security Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Shield className="w-5 h-5 text-primary" />
              Security
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full justify-between">
              Change Password
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button variant="outline" className="w-full justify-between">
              Two-Factor Authentication
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Separator className="my-4" />
            <Button variant="destructive" className="w-full gap-2">
              <LogOut className="w-4 h-4" />
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
