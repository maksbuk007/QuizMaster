import { auth } from './firebase.js';
import { checkAdmin } from './auth.js';

document.addEventListener('DOMContentLoaded', function() {
  // Проверяем, загружены ли утилиты
  if (!window.checkAdmin) {
    console.error('Utils not loaded');
    return;
  }
  
  const createGameBtn = document.getElementById('createGameBtn');
  const joinGameBtn = document.getElementById('joinGameBtn');
  
  if (createGameBtn) {
    createGameBtn.addEventListener('click', async function() {
      try {
        const user = auth.currentUser;
        if (user) {
          const isAdmin = await checkAdmin(user.uid);
          if (isAdmin) {
            window.location.href = 'admin.html';
          } else {
            alert('Только администраторы могут создавать игры.');
          }
        } else {
          alert('Пожалуйста, войдите в систему, чтобы создать игру.');
        }
      } catch (error) {
        console.error('Ошибка при проверке прав администратора:', error);
        alert('Произошла ошибка при проверке прав администратора.');
      }
    });
  }
  
  if (joinGameBtn) {
    joinGameBtn.addEventListener('click', function() {
      window.location.href = 'player.html';
    });
  }
});