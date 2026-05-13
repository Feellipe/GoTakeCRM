'use client';

import React from 'react';
import {
  CalendarDays,
  Clock,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useDashboard } from '@/app/(dashboard)/layout';
import { statusColors } from '@/lib/utils';

export default function CalendarPage() {
  const { data } = useDashboard();

  return (
    <div className="p-8 space-y-6 flex-1">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Grid */}
        <Card className="glass-card lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-primary" />
              This Week
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-3">
              {Array.from({ length: 7 }).map((_, i) => {
                const date = new Date();
                date.setDate(date.getDate() + i);
                const dayBookings = (data?.upcomingBookings || []).filter(b => {
                  const bookingDate = new Date(b.eventDate);
                  return bookingDate.toDateString() === date.toDateString();
                });
                return (
                  <div
                    key={i}
                    className={`p-4 rounded-2xl text-center transition-all duration-300 cursor-pointer hover:scale-105 ${
                      i === 0 ? 'bg-gradient-to-br from-gold to-gold-light text-white shadow-lg shadow-gold/30' : 'bg-muted/50 hover:bg-muted'
                    }`}
                  >
                    <p className={`text-xs mb-1 ${i === 0 ? 'text-white/80' : 'text-muted-foreground'}`}>
                      {date.toLocaleDateString('en-US', { weekday: 'short' })}
                    </p>
                    <p className={`text-2xl font-bold mb-2 ${i === 0 ? '' : 'text-foreground'}`}>{date.getDate()}</p>
                    {dayBookings.length > 0 && (
                      <div className="flex justify-center">
                        <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                          i === 0 ? 'bg-white/20 text-white' : 'bg-primary/20 text-primary'
                        }`}>
                          {dayBookings.length} {dayBookings.length === 1 ? 'event' : 'events'}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming List */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Upcoming
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-80">
              <div className="space-y-3">
                {(data?.upcomingBookings || []).map((booking) => (
                  <div
                    key={booking.id}
                    className="p-4 rounded-xl bg-muted/50 hover:bg-muted transition-all duration-300 cursor-pointer group border border-transparent hover:border-primary/20"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-12 rounded-full ${statusColors[booking.status]} group-hover:h-14 transition-all`} />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">{booking.eventType}</p>
                        <p className="text-xs text-muted-foreground">{booking.client.name}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(booking.eventDate).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                      <Badge variant="secondary" className={`text-xs text-white ${statusColors[booking.status]}`}>
                        {booking.status}
                      </Badge>
                    </div>
                  </div>
                ))}
                {(!data?.upcomingBookings || data.upcomingBookings.length === 0) && (
                  <div className="text-center py-8 text-muted-foreground">
                    <CalendarDays className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No upcoming bookings</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
