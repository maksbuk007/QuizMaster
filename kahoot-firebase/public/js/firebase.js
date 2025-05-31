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
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Провайдеры аутентификации
const googleProvider = new firebase.auth.GoogleAuthProvider();

// Экспорт
export { auth, db, googleProvider };