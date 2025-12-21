
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
  purchasedItems?: string[]; // Array of item IDs (pdf/combo)
};

export type ComboPdfDetail = {
  id: string;
  name: string;
  googleDriveLink: string;
  accessType: 'Free';
}

export type Combo = {
  id: string;
  name: string;
  accessType: 'Free' | 'Paid';
  price?: number;
  pdfIds: string[]; // This might become deprecated in favor of pdfDetails
  pdfDetails?: ComboPdfDetail[]; // Array of PDF details stored directly in the combo
  imageUrl?: string;
  createdAt: any; // Firestore ServerTimestamp
};

export type Notification = {
    id: string;
    title: string;
    message: string;
    imageUrl?: string;
    createdAt: any; // Firestore ServerTimestamp
    readBy?: string[];
}

export type Payment = {
    id?: string;
    userId: string;
    itemId: string;
    itemType: 'pdf' | 'combo';
    amount: number;
    orderId: string;
    paymentId: string;
    status: 'PENDING' | 'SUCCESS' | 'FAILED';
    createdAt: any; // Firestore ServerTimestamp
}

export type NoteStyleSettings = {
    h1Color: string;
    h2Color: string;
    textColor: string;
    highlightColor: string;
}
