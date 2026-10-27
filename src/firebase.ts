import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInAnonymously
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  addDoc,
  getDocs, 
  query, 
  orderBy, 
  limit, 
  onSnapshot, 
  serverTimestamp,
  where,
  deleteDoc,
  getDocFromServer
} from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json';

// Check if we have valid Firebase configuration populated
const isFirebaseConfigured = !!(firebaseConfig && firebaseConfig.apiKey && firebaseConfig.projectId);

let app;
let auth: any = null;
let db: any = null;

if (isFirebaseConfigured) {
  try {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    db = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId || '(default)');
    auth = getAuth(app);

    if (typeof window !== 'undefined' && auth) {
      (window as any).signUpUser = function(email: any, password: any) {
        return createUserWithEmailAndPassword(auth, email, password)
          .then((userCredential) => {
            console.log("Account created successfully:", userCredential.user.email);
            return userCredential;
          })
          .catch((error) => {
            console.error("Registration Error:", error.message);
            throw error;
          });
      };

      (window as any).logInUser = function(email: any, password: any) {
        return signInWithEmailAndPassword(auth, email, password)
          .then((userCredential) => {
            console.log("Logged in safely:", userCredential.user.email);
            return userCredential;
          })
          .catch((error) => {
            console.error("Login Error:", error.message);
            throw error;
          });
      };
    }

    // Bootstrap test connection validation as required by system guidelines
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.warn("Firebase local warning: the client is booting offline or rules did not permit 'test/connection' collection read.");
        }
      }
    };
    testConnection();
  } catch (error) {
    console.error('Firebase initialization error, active fallback mode:', error);
  }
}

// Google Auth provider config with Google Docs & Google Drive scopes
const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('https://www.googleapis.com/auth/documents');
googleProvider.addScope('https://www.googleapis.com/auth/drive.file');
googleProvider.addScope('https://www.googleapis.com/auth/drive.readonly');
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

export {
  isFirebaseConfigured,
  auth,
  db,
  googleProvider,
  GoogleAuthProvider,
  signInWithPopup,
  signInAnonymously,
  signOut,
  onAuthStateChanged,
  collection,
  doc,
  getDoc,
  setDoc,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  where,
  deleteDoc
};
