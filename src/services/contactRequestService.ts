import type { EmployerContactRequest } from '@/types';
import { getDb, saveDb } from './dataService';

const CONTACTS_KEY = 'skillsphere_employer_contacts';

function loadContacts(): EmployerContactRequest[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CONTACTS_KEY);
    if (raw) return JSON.parse(raw) as EmployerContactRequest[];
  } catch {
    // fall through
  }
  return [];
}

function saveContacts(contacts: EmployerContactRequest[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CONTACTS_KEY, JSON.stringify(contacts));
  } catch {
    // storage unavailable
  }
}

export function createEmployerContactRequest(
  request: Omit<EmployerContactRequest, 'id' | 'createdAt' | 'status'>
): EmployerContactRequest {
  const contacts = loadContacts();
  const newRequest: EmployerContactRequest = {
    ...request,
    id: `ecr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  contacts.push(newRequest);
  saveContacts(contacts);

  // Notify the student through notifications
  const db = getDb();
  db.notifications.push({
    id: `n-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    userId: request.learnerId,
    title: 'New Employer Contact Request',
    message: `${request.employerName} from ${request.companyName} sent you an inquiry: "${request.message.slice(0, 75)}${request.message.length > 75 ? '...' : ''}"`,
    read: false,
    createdAt: new Date().toISOString(),
  });
  saveDb();

  return newRequest;
}

export function getEmployerContactRequestsForLearner(learnerId: string): EmployerContactRequest[] {
  return loadContacts().filter((c) => c.learnerId === learnerId);
}

export function getAllEmployerContactRequests(): EmployerContactRequest[] {
  return loadContacts();
}

export function updateContactRequestStatus(
  requestId: string,
  status: EmployerContactRequest['status']
): EmployerContactRequest | undefined {
  const contacts = loadContacts();
  const idx = contacts.findIndex((c) => c.id === requestId);
  if (idx < 0) return undefined;
  contacts[idx] = { ...contacts[idx], status };
  saveContacts(contacts);
  return contacts[idx];
}

