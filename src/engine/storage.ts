// Storage Service for App - Migrated to Firestore (Fully removed localStorage)
import type { Member, RDInstallment, Loan, LoanRepayment, Transaction, AppSettings } from '../types';
import { db as firestoreDb } from '../firebase';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';

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
    whatsappTemplate: "నమస్కారం {name} గారు,\n\nఈ నెలకు సంబంధించిన మీ పెండింగ్ బకాయిల వివరాలు:\n\n*మొత్తం కట్టాల్సినది: ₹{totalDue}*\n\nవివరాలు:\n- RD పొదుపు బకాయి: ₹{rdDue}\n- అప్పు వడ్డీ బకాయి: ₹{loanInterestDue}\n- పెనాల్టీ / లేట్ ఫైన్: ₹{lateFee}\n\n(అప్పు అసలు బ్యాలెన్స్: ₹{loanPrincipal})\n\nదయచేసి వీలైనంత త్వరగా చెల్లించగలరు.\nధన్యవాదాలు.",
    loanInterestRate: 2
  }
};

let memoryDb: DatabaseSchema = { ...defaultDb };
let isInitialized = false;
let isLoadedFromServer = false;
let saveTimeout: ReturnType<typeof setTimeout> | null = null;

let currentUserId: string | null = null;
let unsubscribeSnapshot: (() => void) | null = null;

// Simple event target to notify the app when storage changes
export const storageEvents = new EventTarget();

export const StorageService = {
  // Initialize and subscribe to Firestore updates (replaces localStorage entirely)
  initSync(userId: string) {
    if (isInitialized && currentUserId === userId) return;

    // Clear previous sync if switching users
    if (unsubscribeSnapshot) {
      unsubscribeSnapshot();
    }

    currentUserId = userId;
    isInitialized = true;
    isLoadedFromServer = false;
    memoryDb = { ...defaultDb };
    console.log(`Initializing Firestore sync for user ${userId}...`);

    try {
      const docRef = doc(firestoreDb, 'rd_manager_users', userId);

      // onSnapshot automatically uses offline persistence cache and keeps UI perfectly synced
      unsubscribeSnapshot = onSnapshot(docRef, (docSnap: any) => {
        console.log("SNAPSHOT FIRED:", { exists: docSnap.exists(), fromCache: docSnap.metadata.fromCache });

        if (docSnap.exists()) {
          const remoteDb = docSnap.data() as DatabaseSchema;
          memoryDb = { ...defaultDb, ...remoteDb };
          isLoadedFromServer = true;
          storageEvents.dispatchEvent(new Event('db_updated'));
        } else {
          if (docSnap.metadata.fromCache) {
            console.log('Cache is empty. Waiting for server fetch...');
            return;
          }

          console.log('No data found on server. Initializing with default data...');
          isLoadedFromServer = true;
          if (!docSnap.metadata.fromCache) {
            setDoc(docRef, defaultDb).catch(err => console.error("Initial Firestore save error:", err));
          }
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
    memoryDb = { ...defaultDb };
  },

  getDb(): DatabaseSchema {
    return memoryDb;
  },

  saveDb(db: DatabaseSchema) {
    memoryDb = db; // Optimistic update

    // Fire event for UI update
    storageEvents.dispatchEvent(new Event('db_updated'));

    // Prevent overwriting the database before we have fetched it!
    if (!isLoadedFromServer || !currentUserId) {
      console.warn("Attempted to save DB before initial load from Firestore or missing user. Skipping to prevent data loss.");
      return;
    }

    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }

    saveTimeout = setTimeout(() => {
      try {
        const docRef = doc(firestoreDb, 'rd_manager_users', currentUserId!);
        setDoc(docRef, memoryDb).catch(err => console.error("Firestore save error:", err));
      } catch (err) {
        console.error("Firestore save error:", err);
      }
    }, 800); // 800ms debounce
  },

  getSettings(): AppSettings {
    const db = this.getDb();

    const mergedSettings: AppSettings = {
      ...defaultDb.settings,
      ...db.settings,
      defaultView: db.settings?.defaultView ?? defaultDb.settings.defaultView,
      lateFine: {
        ...defaultDb.settings.lateFine,
        ...(db.settings?.lateFine || {}),
        rate: db.settings?.lateFine?.rate ?? defaultDb.settings.lateFine.rate
      },
      whatsappTemplate: db.settings?.whatsappTemplate ?? defaultDb.settings.whatsappTemplate,
      loanInterestRate: db.settings?.loanInterestRate ?? defaultDb.settings.loanInterestRate
    };

    if (!db.settings || JSON.stringify(db.settings) !== JSON.stringify(mergedSettings)) {
      db.settings = mergedSettings;
      this.saveDb(db);
    }

    return db.settings;
  },

  saveSettings(settings: AppSettings) {
    const db = this.getDb();
    db.settings = settings;
    this.saveDb(db);
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
    this.saveDb(db);
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
