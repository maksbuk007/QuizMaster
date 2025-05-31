import { db } from './firebase.js';
import { auth } from './firebase.js';
import { checkAdmin } from './auth.js';

let gameId = null;
let gameRef = null;
let timerInterval = null;

// DOM элементы
const gameTitleElement = document.getElementById('gameTitle');
const gameCodeElement = document.getElementById('gameCode');
const statusTextElement = document.getElementById('statusText');
const playersCountElement = document.getElementById('playersCount');
const playersContainer = document.getElementById('playersContainer');
const startGameBtn = document.getElementById('startGameBtn');
const nextQuestionBtn = document.getElementById('nextQuestionBtn');
const endGameBtn = document.getElementById('endGameBtn');
const questionPanel = document.getElementById('questionPanel');
const questionContainer = document.getElementById('questionContainer');
const optionsContainer = document.getElementById('optionsContainer');
const timerBar = document.getElementById('timerBar');
const timerText = document.getElementById('timerText');

// Инициализация панели ведущего
document.addEventListener('DOMContentLoaded', async () => {
  const user = auth.currentUser;
  if (!user) {
    alert('Пожалуйста, войдите в систему.');
    window.location.href = 'index.html';
    return;
  }

  const isAdmin = await checkAdmin(user.uid);
  if (!isAdmin) {
    alert('Только администраторы могут запускать игры.');
    window.location.href = 'index.html';
    return;
  }

  // Получаем gameId из URL
  const urlParams = new URLSearchParams(window.location.search);
  gameId = urlParams.get('gameId');
  if (!gameId) {
    alert('Игра не указана.');
    window.location.href = 'admin.html';
    return;
  }

  gameRef = db.collection('games').doc(gameId);
  loadGame();
});

// Загрузка данных игры
async function loadGame() {
  const gameDoc = await gameRef.get();
  if (!gameDoc.exists) {
    alert('Игра не найдена.');
    window.location.href = 'admin.html';
    return;
  }

  const game = gameDoc.data();
  gameTitleElement.textContent = game.title;
  gameCodeElement.textContent = game.gameCode;
  
  // Обновляем статус
  updateStatus(game);
  
  // Загружаем игроков
  loadPlayers();
  
  // Обработчики кнопок
  startGameBtn.addEventListener('click', startGame);
  nextQuestionBtn.addEventListener('click', nextQuestion);
  endGameBtn.addEventListener('click', endGame);
  
  // Слушаем изменения в игре
  gameRef.onSnapshot(doc => {
    const game = doc.data();
    updateStatus(game);
    
    if (game.status === 'question') {
      showQuestion(game);
    } else if (game.status === 'results') {
      showResults(game);
    }
  });
  
  // Слушаем изменения игроков
  gameRef.collection('players').onSnapshot(snapshot => {
    loadPlayers();
  });
}

// Обновление статуса игры
function updateStatus(game) {
  if (game.isActive) {
    if (game.status === 'waiting') {
      statusTextElement.textContent = 'Ожидание игроков';
      statusTextElement.className = 'waiting';
      startGameBtn.disabled = false;
      nextQuestionBtn.disabled = true;
      questionPanel.classList.add('hidden');
    } else if (game.status === 'question') {
      statusTextElement.textContent = 'Вопрос активен';
      statusTextElement.className = 'active';
      startGameBtn.disabled = true;
      nextQuestionBtn.disabled = true;
      questionPanel.classList.remove('hidden');
    } else if (game.status === 'results') {
      statusTextElement.textContent = 'Показ результатов';
      statusTextElement.className = 'results';
      startGameBtn.disabled = true;
      nextQuestionBtn.disabled = false;
      questionPanel.classList.remove('hidden');
    }
  } else {
    statusTextElement.textContent = 'Игра неактивна';
    statusTextElement.className = 'inactive';
    startGameBtn.disabled = true;
    nextQuestionBtn.disabled = true;
    questionPanel.classList.add('hidden');
  }
}

// Загрузка игроков
async function loadPlayers() {
  const playersSnapshot = await gameRef.collection('players').get();
  playersCountElement.textContent = playersSnapshot.size;
  playersContainer.innerHTML = '';
  
  playersSnapshot.forEach(doc => {
    const player = doc.data();
    const playerElement = document.createElement('div');
    playerElement.className = 'player-card';
    playerElement.innerHTML = `
      <h4>${player.name}</h4>
      <div class="player-score">${player.score || 0} очков</div>
    `;
    playersContainer.appendChild(playerElement);
  });
}

// Начало игры
async function startGame() {
  try {
    await gameRef.update({
      status: 'waiting',
      currentQuestion: -1,
      isActive: true,
      startedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  } catch (error) {
    console.error("Ошибка начала игры:", error);
    alert(`Ошибка начала игры: ${error.message}`);
  }
}

// Следующий вопрос
async function nextQuestion() {
  const gameDoc = await gameRef.get();
  const game = gameDoc.data();
  const nextIndex = game.currentQuestion + 1;
  
  if (nextIndex >= game.questions.length) {
    endGame();
    return;
  }
  
  try {
    await gameRef.update({
      status: 'question',
      currentQuestion: nextIndex,
      questionStartTime: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    // Запускаем таймер
    startTimer(15);
  } catch (error) {
    console.error("Ошибка перехода к следующему вопросу:", error);
    alert(`Ошибка перехода к следующему вопросу: ${error.message}`);
  }
}

// Завершение игры
async function endGame() {
  try {
    await gameRef.update({
      status: 'ended',
      isActive: false,
      endedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    alert('Игра завершена!');
    window.location.href = 'admin.html';
  } catch (error) {
    console.error("Ошибка завершения игры:", error);
    alert(`Ошибка завершения игры: ${error.message}`);
  }
}

// Показ вопроса
function showQuestion(game) {
  const question = game.questions[game.currentQuestion];
  
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
    const optionElement = document.createElement('div');
    optionElement.className = 'option-card';
    optionElement.innerHTML = `
      <div class="option-text">${option}</div>
      <div class="option-stats">
        <span class="players-count">0 игроков</span>
        <span class="percentage">0%</span>
      </div>
    `;
    optionsContainer.appendChild(optionElement);
  });
  
  // Запускаем таймер
  if (!timerInterval) {
    startTimer(15);
  }
}

// Показ результатов
function showResults(game) {
  const question = game.questions[game.currentQuestion];
  const correctAnswerIndex = question.correctAnswer;
  
  // Обновляем варианты ответов с результатами
  const optionCards = optionsContainer.querySelectorAll('.option-card');
  optionCards.forEach((card, index) => {
    if (index === correctAnswerIndex) {
      card.classList.add('correct');
    } else {
      card.classList.add('incorrect');
    }
    
    // Здесь можно добавить статистику ответов
    const playersCount = card.querySelector('.players-count');
    playersCount.textContent = '5 игроков'; // Заглушка, реальные данные нужно получать из БД
    
    const percentage = card.querySelector('.percentage');
    percentage.textContent = '25%'; // Заглушка
  });
  
  nextQuestionBtn.disabled = false;
}

// Запуск таймера
function startTimer(seconds) {
  clearInterval(timerInterval);
  
  let timeLeft = seconds;
  timerText.textContent = timeLeft;
  timerBar.style.width = '100%';
  
  timerInterval = setInterval(() => {
    timeLeft--;
    timerText.textContent = timeLeft;
    timerBar.style.width = `${(timeLeft / seconds) * 100}%`;
    
    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      timerInterval = null;
      showResultsAfterTimeout();
    }
  }, 1000);
}

// Показ результатов после окончания времени
async function showResultsAfterTimeout() {
  const gameDoc = await gameRef.get();
  const game = gameDoc.data();
  
  try {
    await gameRef.update({
      status: 'results'
    });
  } catch (error) {
    console.error("Ошибка переключения на результаты:", error);
  }
}