'use client';

import * as React from 'react';
import { Settings, User, Bell, Palette, Globe, Shield, LogOut, ChevronRight, Moon, Sun, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
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
import { useTheme } from 'next-themes';

interface SettingsPanelProps {
  trigger?: React.ReactNode;
}

export function SettingsPanel({ trigger }: SettingsPanelProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  
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

  const updateSetting = (key: string, value: boolean | string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="icon" className="relative group">
            <Settings className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors group-hover:rotate-90 duration-300" />
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="w-96 p-0 flex flex-col">
        <SheetHeader className="p-6 border-b">
          <SheetTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary" />
            Settings
          </SheetTitle>
          <SheetDescription>
            Customize your dashboard preferences
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          {/* Profile Section */}
          <div className="p-6 border-b">
            <h3 className="text-sm font-medium text-muted-foreground mb-4">Profile</h3>
            <div className="flex items-center gap-4 mb-4">
              <Avatar className="w-16 h-16 border-2 border-primary/20">
                <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=studio" />
                <AvatarFallback className="bg-primary text-primary-foreground">ST</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="font-medium">Studio Pro</p>
                <p className="text-sm text-muted-foreground">admin@studio.com</p>
              </div>
              <Button variant="outline" size="sm">Edit</Button>
            </div>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="name">Display Name</Label>
                <Input id="name" defaultValue="Studio Pro" className="bg-muted/50" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" defaultValue="admin@studio.com" className="bg-muted/50" />
              </div>
            </div>
          </div>

          {/* Appearance Section */}
          <div className="p-6 border-b">
            <h3 className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
              <Palette className="w-4 h-4" />
              Appearance
            </h3>
            <div className="space-y-4">
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
              <div className="grid grid-cols-2 gap-3">
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
            </div>
          </div>

          {/* Notifications Section */}
          <div className="p-6 border-b">
            <h3 className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
              <Bell className="w-4 h-4" />
              Notifications
            </h3>
            <div className="space-y-4">
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
            </div>
          </div>

          {/* Data Section */}
          <div className="p-6 border-b">
            <h3 className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
              <Globe className="w-4 h-4" />
              Data & Sync
            </h3>
            <div className="space-y-4">
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
            </div>
          </div>

          {/* Security Section */}
          <div className="p-6">
            <h3 className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Security
            </h3>
            <div className="space-y-3">
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
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
