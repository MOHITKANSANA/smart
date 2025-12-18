import type { User, Paper } from './types';

// Mock data is now for reference and will be replaced by Firestore data.

export const mockUsers: User[] = [
  { id: '1', fullName: 'विद्यार्थी कुमार', email: 'student@example.com', role: 'student' },
  { id: '2', fullName: 'एडमिन बॉस', email: 'admin@example.com', role: 'admin' },
];

export const mockPapers: Paper[] = [
  {
    id: 'paper-1',
    name: 'Paper I',
    paperNumber: 1,
    gradient: 'from-blue-500 to-indigo-600',
  },
  {
    id: 'paper-2',
    name: 'Paper II',
    paperNumber: 2,
    gradient: 'from-purple-500 to-pink-600',
  },
  {
    id: 'paper-3',
    name: 'Paper III',
    paperNumber: 3,
    gradient: 'from-green-500 to-teal-600',
  },
  {
    id: 'paper-4',
    name: 'Paper IV',
    paperNumber: 4,
    gradient: 'from-orange-500 to-red-600',
  },
   {
    id: 'paper-5',
    name: 'Paper V',
    paperNumber: 5,
    gradient: 'from-cyan-500 to-light-blue-600',
  },
   {
    id: 'paper-6',
    name: 'Paper VI',
    paperNumber: 6,
    gradient: 'from-rose-500 to-fuchsia-600',
  },
];
