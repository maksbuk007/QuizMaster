import { auth, db, googleProvider } from './firebase.js';

// DOM элементы
const authStateElement = document.getElementById('authState');

// Функция входа через Google
export const signInWithGoogle = async () => {
  try {
    const result = await auth.signInWithPopup(googleProvider);
    const user = result.user;
    
    // Проверяем, существует ли пользователь в Firestore
    const userRef = db.collection("users").doc(user.uid);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      // Создаем нового пользователя
      await userRef.set({
        uid: user.uid,
        displayName: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        isAdmin: false,
        achievements: []
      });
    }
    
    return user;
  } catch (error) {
    console.error("Ошибка входа:", error);
    alert(`Ошибка входа: ${error.message}`);
  }
};

// Функция выхода
export const signOutUser = async () => {
  try {
    await auth.signOut();
  } catch (error) {
    console.error("Ошибка выхода:", error);
  }
};

// Проверка, является ли пользователь администратором
export const checkAdmin = async (uid) => {
  try {
    const userRef = db.collection("users").doc(uid);
    const userDoc = await userRef.get();
    
    if (userDoc.exists) {
      return userDoc.data().isAdmin || false;
    }
    return false;
  } catch (error) {
    console.error("Ошибка проверки админа:", error);
    return false;
  }
};

// Обновление UI при изменении состояния аутентификации
auth.onAuthStateChanged((user) => {
  if (user) {
    authStateElement.innerHTML = `
      <div class="user-info">
        <img src="${user.photoURL}" alt="${user.displayName}" class="user-avatar">
        <span>${user.displayName}</span>
        <button id="logoutBtn" class="btn"><i class="fas fa-sign-out-alt"></i> Выйти</button>
      </div>
    `;
    
    document.getElementById('logoutBtn').addEventListener('click', signOutUser);
    
    // Проверяем, является ли администратором
    checkAdmin(user.uid).then(isAdmin => {
      if (isAdmin) {
        const adminBtn = document.createElement('button');
        adminBtn.id = 'adminBtn';
        adminBtn.className = 'btn btn-warning';
        adminBtn.innerHTML = '<i class="fas fa-crown"></i> Панель администратора';
        adminBtn.addEventListener('click', () => {
          window.location.href = 'admin.html';
        });
        
        authStateElement.querySelector('.user-info').appendChild(adminBtn);
      }
    });
  } else {
    authStateElement.innerHTML = `
      <button id="loginBtn" class="btn"><i class="fas fa-sign-in-alt"></i> Войти</button>
    `;
    document.getElementById('loginBtn').addEventListener('click', signInWithGoogle);
  }
});