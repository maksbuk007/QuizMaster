import { auth, db, googleProvider } from './firebase.js';
import { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { doc, getDoc, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Список админов по email
const adminEmails = [
  'bukatinmaksimilian6@gmail.com',
  // Добавьте другие email админов здесь
];

// Проверяем, загружены ли Firebase SDK
if (!window.firebaseAuth || !window.firebaseDb) {
  console.error('Firebase not initialized');
} else {
  const auth = window.firebaseAuth;
  const db = window.firebaseDb;
  const googleProvider = window.googleProvider;
  
  // Функция входа через Google
  export async function signInWithGoogle() {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      // Проверяем, существует ли пользователь в Firestore
      const userRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        // Создаем нового пользователя
        await setDoc(userRef, {
          uid: user.uid,
          displayName: user.displayName,
          email: user.email,
          photoURL: user.photoURL,
          createdAt: serverTimestamp(),
          isAdmin: adminEmails.includes(user.email),
          achievements: []
        });
      }
      
      return user;
    } catch (error) {
      console.error("Ошибка входа:", error);
      alert(`Ошибка входа: ${error.message}`);
    }
  }
  
  // Функция входа через email
  export async function signInWithEmail(email, password) {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      return result.user;
    } catch (error) {
      console.error("Ошибка входа:", error);
      alert(`Ошибка входа: ${error.message}`);
    }
  }
  
  // Функция регистрации через email
  export async function registerWithEmail(email, password, displayName) {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      const user = result.user;
      
      // Создаем профиль пользователя
      const userRef = doc(db, "users", user.uid);
      await setDoc(userRef, {
        uid: user.uid,
        displayName: displayName,
        email: user.email,
        createdAt: serverTimestamp(),
        isAdmin: adminEmails.includes(user.email),
        achievements: []
      });
      
      return user;
    } catch (error) {
      console.error("Ошибка регистрации:", error);
      alert(`Ошибка регистрации: ${error.message}`);
    }
  }
  
  // Функция выхода
  export async function signOutUser() {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Ошибка выхода:", error);
    }
  }
  
  // Проверка, является ли пользователь администратором
  export async function checkAdmin(uid) {
    try {
      const userRef = doc(db, "users", uid);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        return userData.isAdmin || adminEmails.includes(userData.email);
      }
      return false;
    } catch (error) {
      console.error("Ошибка проверки админа:", error);
      return false;
    }
  }
  
  // Обновление UI при изменении состояния аутентификации
  auth.onAuthStateChanged(function(user) {
    const authStateElement = document.getElementById('authState');
    if (!authStateElement) return;
    
    if (user) {
      authStateElement.innerHTML = `
        <div class="user-info">
          <img src="${user.photoURL || 'images/default-avatar.png'}" alt="${user.displayName}" class="user-avatar">
          <span>${user.displayName}</span>
          <button id="logoutBtn" class="btn"><i class="fas fa-sign-out-alt"></i> Выйти</button>
        </div>
      `;
      
      document.getElementById('logoutBtn')?.addEventListener('click', signOutUser);
      
      // Проверяем, является ли администратором
      checkAdmin(user.uid).then(function(isAdmin) {
        if (isAdmin) {
          const adminBtn = document.createElement('button');
          adminBtn.id = 'adminBtn';
          adminBtn.className = 'btn btn-warning';
          adminBtn.innerHTML = '<i class="fas fa-crown"></i> Панель администратора';
          adminBtn.addEventListener('click', function() {
            window.location.href = 'admin.html';
          });
          
          authStateElement.appendChild(adminBtn);
        }
      });
    } else {
      authStateElement.innerHTML = `
        <div class="auth-buttons">
          <button id="loginBtn" class="btn btn-primary">
            <i class="fas fa-sign-in-alt"></i> Войти
          </button>
          <button id="registerBtn" class="btn btn-secondary">
            <i class="fas fa-user-plus"></i> Регистрация
          </button>
        </div>
      `;
      
      document.getElementById('loginBtn')?.addEventListener('click', showLoginModal);
      document.getElementById('registerBtn')?.addEventListener('click', showRegisterModal);
    }
  });
}

// Показ модального окна входа
function showLoginModal() {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content">
      <h2>Вход</h2>
      <form id="loginForm">
        <div class="form-group">
          <label for="loginEmail">Email</label>
          <input type="email" id="loginEmail" required>
        </div>
        <div class="form-group">
          <label for="loginPassword">Пароль</label>
          <input type="password" id="loginPassword" required>
        </div>
        <button type="submit" class="btn btn-primary">Войти</button>
        <button type="button" class="btn btn-secondary" id="googleLoginBtn">
          <i class="fab fa-google"></i> Войти через Google
        </button>
      </form>
      <button class="modal-close">&times;</button>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  modal.querySelector('.modal-close').addEventListener('click', () => {
    modal.remove();
  });
  
  modal.querySelector('#loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    await signInWithEmail(email, password);
    modal.remove();
  });
  
  modal.querySelector('#googleLoginBtn').addEventListener('click', async () => {
    await signInWithGoogle();
    modal.remove();
  });
}

// Показ модального окна регистрации
function showRegisterModal() {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content">
      <h2>Регистрация</h2>
      <form id="registerForm">
        <div class="form-group">
          <label for="registerName">Имя</label>
          <input type="text" id="registerName" required>
        </div>
        <div class="form-group">
          <label for="registerEmail">Email</label>
          <input type="email" id="registerEmail" required>
        </div>
        <div class="form-group">
          <label for="registerPassword">Пароль</label>
          <input type="password" id="registerPassword" required>
        </div>
        <button type="submit" class="btn btn-primary">Зарегистрироваться</button>
      </form>
      <button class="modal-close">&times;</button>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  modal.querySelector('.modal-close').addEventListener('click', () => {
    modal.remove();
  });
  
  modal.querySelector('#registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const displayName = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    await registerWithEmail(email, password, displayName);
    modal.remove();
  });
}