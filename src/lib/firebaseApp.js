import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFirebaseConfig, isFirestoreEnabled } from '../config.js';

let _db;
let _auth;

export function getFirebaseApp() {
  if (!isFirestoreEnabled()) return null;
  const config = getFirebaseConfig();
  if (getApps().length) {
    return getApp();
  }
  return initializeApp(config);
}

/**
 * @returns {import('firebase/firestore').Firestore | null}
 */
export function getFirestoreDb() {
  if (!isFirestoreEnabled()) return null;
  if (!_db) {
    const app = getFirebaseApp();
    if (!app) return null;
    _db = getFirestore(app);
  }
  return _db;
}

/**
 * @returns {import('firebase/auth').Auth | null}
 */
export function getFirebaseAuth() {
  if (!isFirestoreEnabled()) return null;
  if (!_auth) {
    const app = getFirebaseApp();
    if (!app) return null;
    _auth = getAuth(app);
  }
  return _auth;
}
