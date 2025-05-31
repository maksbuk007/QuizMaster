import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, GoogleAuthProvider } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Конфигурация Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBqstZchhqjqt_QxILoliASxMqlorWbFG0",
  authDomain: "quiz-master-3edcc.firebaseapp.com",
  databaseURL: "https://quiz-master-3edcc-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "quiz-master-3edcc",
  storageBucket: "quiz-master-3edcc.firebasestorage.app",
  messagingSenderId: "876503925337",
  appId: "1:876503925337:web:06f391c45c3ef00d312748",
};

// Инициализация Firebase
try {
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);
  const googleProvider = new GoogleAuthProvider();

  // Экспортируем для использования в других модулях
  export { auth, db, googleProvider };
} catch (error) {
  console.error('Firebase initialization error:', error);
}