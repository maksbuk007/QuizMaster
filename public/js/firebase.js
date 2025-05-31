import { getAuth, GoogleAuthProvider } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Используем уже инициализированные экземпляры
const auth = window.auth;
const db = window.db;
const googleProvider = new GoogleAuthProvider();

// Экспортируем для использования в других модулях
export { auth, db, googleProvider };