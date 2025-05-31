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
if (typeof firebase === 'undefined') {
  console.error('Firebase SDK not loaded');
} else {
  try {
    // Проверяем, не инициализировано ли уже приложение
    if (firebase.apps.length === 0) {
      firebase.initializeApp(firebaseConfig);
      console.log('Firebase initialized');
    } else {
      console.log('Firebase already initialized');
    }
    
    // Создаем глобальные ссылки
    window.firebaseAuth = firebase.auth();
    window.firebaseDb = firebase.firestore();
    window.googleProvider = new firebase.auth.GoogleAuthProvider();
    
  } catch (error) {
    console.error('Firebase initialization error:', error);
  }
}