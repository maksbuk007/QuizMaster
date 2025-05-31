import { db } from './firebase.js';
import { checkAchievements } from './achievements.js';

let gameId = null;
let playerId = null;
let playerName = null;
let currentQuestionIndex = 0;
let timerInterval = null;
let playerScore = 0;

// DOM элементы
const joinScreen = document.getElementById('joinScreen');
const gameScreen = document.getElementById('gameScreen');
const resultScreen = document.getElementById('resultScreen');
const joinForm = document.getElementById('joinForm');
const questionContainer = document.getElementById('questionContainer');
const optionsContainer = document.getElementById('optionsContainer');
const timerText = document.getElementById('timerText');
const timerBar = document.getElementById('timerBar');
const leaderboard = document.getElementById('leaderboard');
const playAgainBtn = document.getElementById('playAgainBtn');
const badgesContainer = document.querySelector('.badges-container');

// Присоединение к игре
joinForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const gameCode = document.getElementById('gameCodeInput').value.trim().toUpperCase();
  playerName = document.getElementById('playerNameInput').value.trim();
  
  if (gameCode.length !== 8) {
    alert('Код игры должен состоять из 8 символов');
    return;
  }
  
  if (!playerName) {
    alert('Пожалуйста, введите ваше имя');
    return;
  }
  
  try {
    // Поиск игры по коду
    const gamesRef = db.collection("games");
    const querySnapshot = await gamesRef.where("gameCode", "==", gameCode).get();
    
    if (querySnapshot.empty) {
      alert('Игра с таким кодом не найдена');
      return;
    }
    
    // Предполагаем, что код уникален, берем первую игру
    const gameDoc = querySnapshot.docs[0];
    gameId = gameDoc.id;
    const game = gameDoc.data();
    
    if (!game.isActive) {
      alert('Эта игра в данный момент не активна');
      return;
    }
    
    // Регистрируем игрока
    const playerRef = await db.collection(`games/${gameId}/players`).add({
      name: playerName,
      score: 0,
      answers: {},
      joinedAt: firebase.firestore.FieldValue.serverTimestamp(),
      achievements: []
    });
    
    playerId = playerRef.id;
    
    // Обновляем UI
    joinScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');
    
    // Отображаем информацию об игроке
    document.getElementById('playerInfo').textContent = playerName;
    
    // Начинаем слушать игру
    listenToGame(gameId);
  } catch (error) {
    console.error("Ошибка присоединения к игре:", error);
    alert(`Ошибка присоединения к игре: ${error.message}`);
  }
});

// Прослушивание изменений в игре
function listenToGame(gameId) {
  const gameRef = db.collection("games").doc(gameId);
  
  gameRef.onSnapshot((doc) => {
    const game = doc.data();
    if (!game) return;
    
    if (game.status === 'waiting') {
      showWaitingScreen();
    } else if (game.status === 'question') {
      showQuestion(game);
    } else if (game.status === 'results') {
      showResults(game);
    } else if (game.status === 'ended') {
      showFinalResults(game);
    }
  });
}

// Показ экрана ожидания
function showWaitingScreen() {
  questionContainer.innerHTML = '<div class="waiting-screen"><h2>Ожидайте начала игры...</h2><div class="loader"></div></div>';
  optionsContainer.innerHTML = '';
  resetTimer();
}

// Показ вопроса
function showQuestion(game) {
  if (currentQuestionIndex !== game.currentQuestion) {
    currentQuestionIndex = game.currentQuestion;
    resetTimer();
  }
  
  const question = game.questions[currentQuestionIndex];
  
  let questionHTML = `<h2>${question.text}</h2>`;
  
  if (question.type === 'image' && question.mediaUrl) {
    questionHTML += `<div class="media-container"><img src="${question.mediaUrl}" alt="Изображение для вопроса"></div>`;
  } else if (question.type === 'video' && question.mediaUrl) {
    questionHTML += `
      <div class="media-container">
        <video controls>
          <source src="${question.mediaUrl}" type="video/mp4">
          Ваш браузер не поддерживает видео.
        </video>
      </div>
    `;
  }
  
  questionContainer.innerHTML = questionHTML;
  
  // Отображение вариантов ответа
  optionsContainer.innerHTML = '';
  question.options.forEach((option, index) => {
    const button = document.createElement('button');
    button.className = 'option-btn';
    button.textContent = option;
    button.onclick = () => submitAnswer(index, game);
    optionsContainer.appendChild(button);
  });
  
  // Запуск таймера
  startTimer(15);
}

// Отправка ответа
async function submitAnswer(answerIndex, game) {
  try {
    // Сохраняем ответ игрока
    const playerRef = db.collection(`games/${gameId}/players`).doc(playerId);
    await playerRef.update({
      [`answers.${currentQuestionIndex}`]: answerIndex
    });
    
    // Блокируем кнопки после ответа
    document.querySelectorAll('.option-btn').forEach(btn => {
      btn.disabled = true;
    });
    
    // Проверяем правильность ответа
    const isCorrect = answerIndex === game.questions[currentQuestionIndex].correctAnswer;
    if (isCorrect) {
      playerScore += 100;
      await playerRef.update({
        score: firebase.firestore.FieldValue.increment(100)
      });
    }
    
    // Проверяем достижения
    await checkAchievements(playerId, gameId);
  } catch (error) {
    console.error("Ошибка отправки ответа:", error);
  }
}

// Запуск таймера
function startTimer(seconds) {
  let timeLeft = seconds;
  timerText.textContent = timeLeft;
  timerBar.style.width = '100%';
  
  timerInterval = setInterval(() => {
    timeLeft--;
    timerText.textContent = timeLeft;
    timerBar.style.width = `${(timeLeft / seconds) * 100}%`;
    
    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      timerText.textContent = 'Время вышло!';
      document.querySelectorAll('.option-btn').forEach(btn => {
        btn.disabled = true;
      });
    }
  }, 1000);
}

// Сброс таймера
function resetTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
  }
  timerText.textContent = '15';
  timerBar.style.width = '100%';
}

// Показ результатов
function showResults(game) {
  // Показываем правильный ответ
  const question = game.questions[game.currentQuestion];
  const correctAnswer = question.options[question.correctAnswer];
  
  questionContainer.innerHTML = `
    <h2>${question.text}</h2>
    <div class="result-info">
      <p>Правильный ответ: <strong>${correctAnswer}</strong></p>
    </div>
  `;
  
  optionsContainer.innerHTML = '';
}

// Показ финальных результатов
async function showFinalResults(game) {
  gameScreen.classList.add('hidden');
  resultScreen.classList.remove('hidden');
  
  // Получаем игроков и сортируем по очкам
  const playersRef = db.collection(`games/${gameId}/players`);
  const playersSnapshot = await playersRef.get();
  const players = [];
  
  playersSnapshot.forEach(doc => {
    players.push({ id: doc.id, ...doc.data() });
  });
  
  players.sort((a, b) => b.score - a.score);
  
  // Отображаем таблицу лидеров
  leaderboard.innerHTML = '<h3>Таблица лидеров</h3><ol>';
  players.forEach((player, index) => {
    const isCurrent = player.id === playerId;
    leaderboard.innerHTML += `
      <li class="${isCurrent ? 'current-player' : ''}">
        <span class="player-position">${index + 1}.</span>
        <span class="player-name">${player.name}</span>
        <span class="player-score">${player.score} очков</span>
      </li>
    `;
  });
  leaderboard.innerHTML += '</ol>';
  
  // Показываем достижения текущего игрока
  const currentPlayer = players.find(p => p.id === playerId);
  if (currentPlayer && currentPlayer.achievements && currentPlayer.achievements.length > 0) {
    badgesContainer.innerHTML = '';
    
    currentPlayer.achievements.forEach(badgeId => {
      // Загрузка информации о бейдже
      db.collection("achievements").doc(badgeId).get().then(badgeDoc => {
        if (badgeDoc.exists) {
          const badge = badgeDoc.data();
          const badgeElement = document.createElement('div');
          badgeElement.className = 'badge';
          badgeElement.title = `${badge.name}\n${badge.description}`;
          
          if (badge.badgeUrl) {
            badgeElement.innerHTML = `<img src="${badge.badgeUrl}" alt="${badge.name}">`;
          } else {
            badgeElement.innerHTML = '<i class="fas fa-medal"></i>';
          }
          
          badgesContainer.appendChild(badgeElement);
        }
      });
    });
  } else {
    badgesContainer.innerHTML = '<p>Вы пока не получили достижений</p>';
  }
  
  // Обработчик кнопки "Играть снова"
  playAgainBtn.addEventListener('click', () => {
    resultScreen.classList.add('hidden');
    joinScreen.classList.remove('hidden');
    gameId = null;
    playerId = null;
    playerScore = 0;
    currentQuestionIndex = 0;
  });
}