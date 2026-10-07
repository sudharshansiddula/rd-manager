// Storage Service for App - Hybrid Architecture with Instant Local Cache & Firestore Cloud Sync
import type { Member, RDInstallment, Loan, LoanRepayment, Transaction, AppSettings } from '../types';
import { db as firestoreDb } from '../firebase';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { DEFAULT_WHATSAPP_TEMPLATE_TE } from '../utils';

interface DatabaseSchema {
  members: Member[];
  installments: RDInstallment[];
  loans: Loan[];
  loanRepayments: LoanRepayment[];
  transactions: Transaction[];
  settings: AppSettings;
}

const defaultDb: DatabaseSchema = {
  members: [],
  installments: [],
  loans: [],
  loanRepayments: [],
  transactions: [],
  settings: {
    defaultView: 'dashboard',
    lateFine: { period: 'MONTHLY', dueDate: 10, rate: 2 },
    whatsappTemplate: DEFAULT_WHATSAPP_TEMPLATE_TE,
    loanInterestRate: 2,
    zoomLevel: 100,
    textSize: 100
  }
};

const LOCAL_CACHE_KEY = 'rd_manager_db_cache';

function loadCachedDb(): DatabaseSchema {
  try {
    const cached = typeof window !== 'undefined' ? localStorage.getItem(LOCAL_CACHE_KEY) : null;
    if (cached) {
      const parsed = JSON.parse(cached);
      return {
        ...defaultDb,
        ...parsed,
        settings: {
          ...defaultDb.settings,
          ...(parsed.settings || {}),
          lateFine: {
            ...defaultDb.settings.lateFine,
            ...(parsed.settings?.lateFine || {})
          }
        }
      };
    }
  } catch (e) {
    console.warn("Failed to parse local storage cache:", e);
  }
  return { ...defaultDb };
}

let memoryDb: DatabaseSchema = loadCachedDb();
let isInitialized = false;
let isLoadedFromServer = false;
let saveTimeout: ReturnType<typeof setTimeout> | null = null;
let currentUserId: string | null = null;
let unsubscribeSnapshot: (() => void) | null = null;

// Simple event target to notify the app when storage changes
export const storageEvents = new EventTarget();

const flushToFirestore = async () => {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
    saveTimeout = null;
  }
  if (!currentUserId) return;
  try {
    const docRef = doc(firestoreDb, 'rd_manager_users', currentUserId);
    await setDoc(docRef, memoryDb);
    console.log("Firestore successfully synced.");
  } catch (err) {
    console.error("Firestore immediate save error:", err);
  }
};

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    flushToFirestore();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      flushToFirestore();
    }
  });
}

export const StorageService = {
  // Initialize and subscribe to Firestore updates
  initSync(userId: string) {
    if (isInitialized && currentUserId === userId) return;

    if (unsubscribeSnapshot) {
      unsubscribeSnapshot();
    }

    currentUserId = userId;
    isInitialized = true;
    console.log(`Initializing Firestore sync for user ${userId}...`);

    try {
      const docRef = doc(firestoreDb, 'rd_manager_users', userId);

      unsubscribeSnapshot = onSnapshot(docRef, (docSnap: any) => {
        console.log("SNAPSHOT FIRED:", { exists: docSnap.exists(), fromCache: docSnap.metadata?.fromCache });

        if (docSnap.exists()) {
          const remoteDb = docSnap.data() as DatabaseSchema;
          memoryDb = {
            ...defaultDb,
            ...remoteDb,
            settings: {
              ...defaultDb.settings,
              ...(remoteDb.settings || {}),
              lateFine: {
                ...defaultDb.settings.lateFine,
                ...(remoteDb.settings?.lateFine || {})
              }
            }
          };
          isLoadedFromServer = true;
          try {
            localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(memoryDb));
          } catch (e) {}
          storageEvents.dispatchEvent(new Event('db_updated'));
        } else {
          if (docSnap.metadata?.fromCache) {
            console.log('Cache is empty. Waiting for server fetch...');
            return;
          }

          console.log('No data found on server. Initializing with local/default data...');
          isLoadedFromServer = true;
          setDoc(docRef, memoryDb).catch(err => console.error("Initial Firestore save error:", err));
          storageEvents.dispatchEvent(new Event('db_updated'));
        }
      }, (error) => {
        console.error('Firestore snapshot error:', error);
      });
    } catch (error) {
      console.error('Error setting up Firestore sync:', error);
    }
  },

  clearSync() {
    if (unsubscribeSnapshot) unsubscribeSnapshot();
    currentUserId = null;
    isInitialized = false;
    isLoadedFromServer = false;
    memoryDb = loadCachedDb();
  },

  getDb(): DatabaseSchema {
    return memoryDb;
  },

  saveDb(db: DatabaseSchema, immediate = false) {
    memoryDb = db; // Optimistic update

    // Synchronously write to local cache immediately so no data is ever lost across reload
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(memoryDb));
      }
    } catch (e) {
      console.warn("LocalStorage save error:", e);
    }

    // Fire event for UI update
    storageEvents.dispatchEvent(new Event('db_updated'));

    if (!currentUserId) {
      console.warn("User not logged in yet. Saved to local cache only.");
      return;
    }

    if (saveTimeout) {
      clearTimeout(saveTimeout);
      saveTimeout = null;
    }

    if (immediate) {
      flushToFirestore();
    } else {
      saveTimeout = setTimeout(() => {
        flushToFirestore();
      }, 500); // 500ms debounce for high responsiveness
    }
  },

  getSettings(): AppSettings {
    const db = this.getDb();

    let currentTemplate = db.settings?.whatsappTemplate ?? defaultDb.settings.whatsappTemplate;
    if (currentTemplate && (currentTemplate.includes('{rdCalc}') || currentTemplate.includes('• ఆర్డి పొదుపు బకాయిలు') || currentTemplate.includes('• RD Savings Due') || currentTemplate.includes('📋') || currentTemplate.includes('🔹') || currentTemplate.includes('\uFFFD'))) {
      currentTemplate = DEFAULT_WHATSAPP_TEMPLATE_TE;
    }

    const mergedSettings: AppSettings = {
      ...defaultDb.settings,
      ...(db.settings || {}),
      defaultView: db.settings?.defaultView ?? defaultDb.settings.defaultView,
      lateFine: {
        ...defaultDb.settings.lateFine,
        ...(db.settings?.lateFine || {})
      },
      whatsappTemplate: currentTemplate,
      loanInterestRate: db.settings?.loanInterestRate ?? defaultDb.settings.loanInterestRate,
      zoomLevel: db.settings?.zoomLevel ?? defaultDb.settings.zoomLevel,
      textSize: db.settings?.textSize ?? defaultDb.settings.textSize
    };

    if (!db.settings || JSON.stringify(db.settings) !== JSON.stringify(mergedSettings)) {
      db.settings = mergedSettings;
      this.saveDb(db, false);
    }

    return db.settings;
  },

  saveSettings(settings: AppSettings) {
    const db = this.getDb();
    db.settings = { ...settings };
    // Settings changes are high importance - save immediately!
    this.saveDb(db, true);
  },

  // ---------------- MEMBERS ----------------
  getMembers(): Member[] {
    return [...(this.getDb().members || [])];
  },

  saveMember(member: Member) {
    const db = this.getDb();
    if (!db.members) db.members = [];
    const idx = db.members.findIndex(m => m.id === member.id);
    if (idx >= 0) {
      db.members[idx] = member;
    } else {
      db.members.push(member);
    }
    this.saveDb(db);
  },

  deleteMember(memberId: string) {
    const db = this.getDb();
    if (db.members) db.members = db.members.filter(m => m.id !== memberId);
    if (db.installments) db.installments = db.installments.filter(i => i.memberId !== memberId);
    if (db.loans) db.loans = db.loans.filter(l => l.memberId !== memberId);
    if (db.loanRepayments) db.loanRepayments = db.loanRepayments.filter(lr => lr.memberId !== memberId);
    if (db.transactions) db.transactions = db.transactions.filter(t => t.memberId !== memberId);
    this.saveDb(db, true);
  },

  // ---------------- RD INSTALLMENTS ----------------
  getInstallments(memberId?: string): RDInstallment[] {
    const db = this.getDb();
    const insts = db.installments || [];
    if (memberId) return insts.filter(i => i.memberId === memberId);
    return [...insts];
  },

  saveInstallments(installments: RDInstallment[]) {
    const db = this.getDb();
    if (!db.installments) db.installments = [];
    installments.forEach(inst => {
      const idx = db.installments.findIndex(i => i.id === inst.id);
      if (idx >= 0) db.installments[idx] = inst;
      else db.installments.push(inst);
    });
    this.saveDb(db);
  },

  // ---------------- LOANS ----------------
  getLoans(memberId?: string): Loan[] {
    const db = this.getDb();
    const loans = db.loans || [];
    if (memberId) return loans.filter(l => l.memberId === memberId);
    return [...loans];
  },

  saveLoan(loan: Loan) {
    const db = this.getDb();
    if (!db.loans) db.loans = [];
    const idx = db.loans.findIndex(l => l.id === loan.id);
    if (idx >= 0) db.loans[idx] = loan;
    else db.loans.push(loan);
    this.saveDb(db);
  },

  // ---------------- LOAN REPAYMENTS ----------------
  getLoanRepayments(memberId?: string): LoanRepayment[] {
    const db = this.getDb();
    const reps = db.loanRepayments || [];
    if (memberId) return reps.filter(lr => lr.memberId === memberId);
    return [...reps];
  },

  saveLoanRepayments(repayments: LoanRepayment[]) {
    const db = this.getDb();
    if (!db.loanRepayments) db.loanRepayments = [];
    repayments.forEach(rep => {
      const idx = db.loanRepayments.findIndex(r => r.id === rep.id);
      if (idx >= 0) db.loanRepayments[idx] = rep;
      else db.loanRepayments.push(rep);
    });
    this.saveDb(db);
  },

  // ---------------- TRANSACTIONS ----------------
  getTransactions(): Transaction[] {
    return [...(this.getDb().transactions || [])];
  },

  saveTransaction(txn: Transaction) {
    const db = this.getDb();
    if (!db.transactions) db.transactions = [];
    db.transactions.push(txn);
    this.saveDb(db);
  }
};
