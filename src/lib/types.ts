export type PdfDocument = {
  id: string;
  name: string;
  description: string;
  googleDriveLink: string;
  accessType: 'Free' | 'Paid';
  price?: number; // Price for individual PDF
  paperId: string;
  tabId: string;
  subFolderId: string;
  createdAt: any; // Firestore ServerTimestamp
};

export type SubFolder = {
  id: string;
  name: string;
  paperId: string;
  tabId: string;
  createdAt: any; // Firestore ServerTimestamp
}

export type Tab = {
  id: string;
  name: string;
  paperId: string;
  createdAt: any; // Firestore ServerTimestamp
}

export type Paper = {
  id: string;
  name: string;
  paperNumber: number;
  createdAt: any; // Firestore ServerTimestamp
};

export type User = {
  id: string;
  fullName: string;
  email: string;
  mobileNumber?: string;
  role: 'student' | 'admin';
};

export type Combo = {
  id: string;
  name: string;
  description: string;
  accessType: 'Free' | 'Paid';
  price?: number;
  pdfIds: string[];
  pdfs?: PdfDocument[]; // Populated on the client
  imageUrl?: string;
  createdAt: any; // Firestore ServerTimestamp
};
