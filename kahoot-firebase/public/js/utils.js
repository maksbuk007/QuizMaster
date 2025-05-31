import { db } from './firebase.js';

// Генерация уникального 8-значного кода игры (только заглавные буквы и цифры)
export const generateGameCode = async () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  let isUnique = false;
  
  while (!isUnique) {
    code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    // Проверяем уникальность кода
    const gamesRef = db.collection('games');
    const querySnapshot = await gamesRef.where('gameCode', '==', code).get();
    isUnique = querySnapshot.empty;
  }
  
  return code;
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

// Форматирование времени
export const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

// Генерация случайного ID
export const generateId = (length = 8) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};