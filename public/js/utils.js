// Генерация уникального 8-значного кода игры
window.generateGameCode = async function() {
  if (!window.firebaseDb) {
    console.error('Firebase not initialized');
    return '';
  }
  
  const db = window.firebaseDb;
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  let isUnique = false;
  
  while (!isUnique) {
    code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    try {
      // Проверяем уникальность кода
      const gamesRef = db.collection('games');
      const querySnapshot = await gamesRef.where('gameCode', '==', code).get();
      isUnique = querySnapshot.empty;
    } catch (error) {
      console.error('Error checking game code uniqueness:', error);
      break;
    }
  }
  
  return code;
};

// Форматирование времени
window.formatTime = function(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

// Генерация случайного ID
window.generateId = function(length = 8) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};