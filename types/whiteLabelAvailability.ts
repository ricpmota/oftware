export type WhiteLabelAvailabilityStatus = 'available' | 'reserved' | 'blocked';

export type WhiteLabelAvailability = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: WhiteLabelAvailabilityStatus;
  leadId?: string;
  doctorName?: string;
  doctorEmail?: string;
  doctorPhone?: string;
  googleCalendarEventId?: string;
  googleMeetLink?: string;
  createdAt: Date | null;
  updatedAt: Date | null;
};

export type WhiteLabelAvailabilityApiRow = Omit<
  WhiteLabelAvailability,
  'createdAt' | 'updatedAt'
> & {
  createdAt: string | null;
  updatedAt: string | null;
};
