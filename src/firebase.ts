import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  linkWithPopup,
  linkWithRedirect,
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

// Keep ordinary account sign-in lightweight. Requesting every Workspace scope
// during login can block the entire Google sign-in flow for users whose OAuth
// consent screen or APIs have not enabled all of those scopes.
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Ask for Workspace permissions only when a user opens a Gmail/Docs/Drive feature.
const googleWorkspaceProvider = new GoogleAuthProvider();
[
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/documents',
  'https://www.googleapis.com/auth/presentations',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/tasks',
  'https://www.googleapis.com/auth/chat.spaces.readonly',
  'https://www.googleapis.com/auth/chat.messages.readonly',
  'https://www.googleapis.com/auth/chat.messages.create'
].forEach((scope) => googleWorkspaceProvider.addScope(scope));
googleWorkspaceProvider.setCustomParameters({
  prompt: 'consent',
  include_granted_scopes: 'true',
});

export {
  isFirebaseConfigured,
  auth,
  db,
  googleProvider,
  googleWorkspaceProvider,
  GoogleAuthProvider,
  signInWithRedirect,
  getRedirectResult,
  linkWithPopup,
  linkWithRedirect,
  signInWithPopup,
  signInAnonymously,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
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
