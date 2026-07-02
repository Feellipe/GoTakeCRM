'use client';

import * as React from 'react';
import { Bell, Calendar, DollarSign, FileText, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';

interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: 'booking' | 'payment' | 'briefing' | 'client';
}

const notificationIcons: Record<string, typeof Calendar> = {
  booking: Calendar,
  payment: DollarSign,
  briefing: FileText,
  client: UserPlus,
};

interface NotificationDropdownProps {
  notifications: Notification[];
}

// Shared notification item component used in both DropdownMenu and Sheet
function NotificationItem({
  notification,
  onMarkAsRead,
  asDropdownItem = false,
}: {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  asDropdownItem?: boolean;
}) {
  const Icon = notificationIcons[notification.type] || Bell;
  const Wrapper = asDropdownItem ? DropdownMenuItem : 'div';

  return (
    <Wrapper
      className={`p-4 cursor-pointer border-l-2 ${
        notification.read ? 'border-transparent opacity-70' : 'border-primary bg-primary/5'
      }`}
      onClick={() => onMarkAsRead(notification.id)}
    >
      <div className="flex gap-3 w-full">
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
            notification.read ? 'bg-muted' : 'bg-primary/10'
          }`}
        >
          <Icon
            className={`w-4 h-4 ${notification.read ? 'text-muted-foreground' : 'text-primary'}`}
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm ${notification.read ? 'text-muted-foreground' : 'font-medium'}`}>
            {notification.title}
          </p>
          <p className="text-xs text-muted-foreground truncate">{notification.message}</p>
          <p className="text-xs text-muted-foreground/70 mt-1">{notification.time}</p>
        </div>
        {!notification.read && (
          <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-2" />
        )}
      </div>
    </Wrapper>
  );
}

// Shared notification list content (ScrollArea + items) used in both DropdownMenu and Sheet
function NotificationListContent({
  notifications,
  onMarkAsRead,
  useDropdownItems = false,
}: {
  notifications: Notification[];
  onMarkAsRead: (id: string) => void;
  useDropdownItems?: boolean;
}) {
  return (
    <ScrollArea className="h-80">
      {notifications.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground">
          <Bell className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>No notifications</p>
        </div>
      ) : (
        <div>
          {notifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onMarkAsRead={onMarkAsRead}
              asDropdownItem={useDropdownItems}
            />
          ))}
        </div>
      )}
    </ScrollArea>
  );
}

export function NotificationDropdown({ notifications }: NotificationDropdownProps) {
  const [localNotifications, setLocalNotifications] = React.useState(notifications);
  const unreadCount = localNotifications.filter(n => !n.read).length;
  const isMobile = useIsMobile();

  const markAsRead = (id: string) => {
    setLocalNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    setLocalNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  // Shared trigger button (Bell icon with badge)
  const triggerButton = (
    <Button variant="ghost" size="icon" className="relative group">
      <Bell className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-white text-xs flex items-center justify-center animate-pulse">
          {unreadCount}
        </span>
      )}
    </Button>
  );

  // Shared footer
  const footer = (
    <div className="p-2">
      <Button variant="ghost" className="w-full text-sm" size="sm">
        View all notifications
      </Button>
    </div>
  );

  if (isMobile) {
    return (
      <Sheet>
        <SheetTrigger asChild>{triggerButton}</SheetTrigger>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl p-0">
          <SheetHeader className="flex flex-row items-center justify-between p-4 border-b">
            <SheetTitle className="text-lg">Notifications</SheetTitle>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="text-xs h-7"
              >
                Mark all as read
              </Button>
            )}
          </SheetHeader>
          <NotificationListContent
            notifications={localNotifications}
            onMarkAsRead={markAsRead}
            useDropdownItems={false}
          />
          {footer}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{triggerButton}</DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="text-xs h-7"
            >
              Mark all as read
            </Button>
          )}
        </div>
        <NotificationListContent
          notifications={localNotifications}
          onMarkAsRead={markAsRead}
          useDropdownItems={true}
        />
        <DropdownMenuSeparator />
        {footer}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
