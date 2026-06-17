export enum Role {
  ADMIN = 'admin',
  EXECUTIVE = 'executive',
  GENERAL = 'general',
}

export enum MemberCategory {
  ACTIVE = 'active',
  VOLUNTEER = 'volunteer',
  LEAD = 'lead',
}

export type BloodGroup = 'A+' | 'A-' | 'B+' | 'B-' | 'O+' | 'O-' | 'AB+' | 'AB-';

export interface NotificationPreferences {
  urgentNotices: boolean;
  eventReminders: boolean;
}

export interface ActivityLog {
  id?: string;
  userId: string;
  userName: string;
  type: 'login' | 'logout';
  timestamp: any;
}

export interface Member {
  userId: string;
  name: string;
  rank: string;
  phone: string;
  email: string;
  photoURL?: string;
  role: Role;
  category?: MemberCategory;
  bloodGroup?: BloodGroup;
  isVerified?: boolean;
  notificationPreferences?: NotificationPreferences;
  lastLogin?: any;
}

export interface Notice {
  id: string;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  createdAt: any; // Firestore Timestamp
  type: 'urgent' | 'info' | 'meeting';
  imageUrl?: string;
}

export interface Report {
  id: string;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  createdAt: any;
  status: 'pending' | 'reviewed';
}

export interface Event {
  id: string;
  title: string;
  description: string;
  dateTime: string;
  location: string;
  organizerId: string;
}

export interface FundRecord {
  id: string;
  amount: number;
  type: 'donation' | 'expense';
  description: string;
  memberId?: string;
  memberName?: string;
  date: any; // Firestore Timestamp
}
