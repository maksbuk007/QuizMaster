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
      const user = firebase.auth().currentUser;
      if (user) {
        const isAdmin = await window.checkAdmin(user.uid);
        if (isAdmin) {
          window.location.href = 'admin.html';
        } else {
          alert('Только администраторы могут создавать игры.');
        }
      } else {
        alert('Пожалуйста, войдите в систему, чтобы создать игру.');
      }
    });
  }
  
  if (joinGameBtn) {
    joinGameBtn.addEventListener('click', function() {
      window.location.href = 'player.html';
    });
  }
});