'use client';

import React from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css'; // Default styling, can be customized
import { Badge } from '@/components/ui/badge';
import type { Subscription } from '@/types';
import { parseISO, isSameDay } from 'date-fns';

interface SubscriptionCalendarProps {
  subscriptions: Subscription[];
}

export default function SubscriptionCalendar({ subscriptions }: SubscriptionCalendarProps) {

  const tileContent = ({ date, view }: { date: Date, view: string }) => {
    if (view === 'month') {
      const daySubscriptions = subscriptions.filter(sub => 
        sub.nextBillingDate && isSameDay(parseISO(sub.nextBillingDate), date)
      );

      if (daySubscriptions.length > 0) {
        return (
          <div className="flex flex-col items-center mt-1">
            {daySubscriptions.slice(0, 2).map(sub => (
              <Badge key={sub.id} variant="destructive" className="text-xs scale-75 truncate">
                {sub.serviceName}
              </Badge>
            ))}
            {daySubscriptions.length > 2 && 
              <Badge variant="secondary" className="text-xs scale-75">
                +{daySubscriptions.length - 2} more
              </Badge>
            }
          </div>
        );
      }
    }
    return null;
  };

  return (
    <div className="bg-card p-4 rounded-lg shadow-lg">
      <Calendar
        tileContent={tileContent}
        className="react-calendar-custom"
      />
    </div>
  );
}
