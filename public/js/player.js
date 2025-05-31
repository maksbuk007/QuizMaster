import { db } from './firebase.js';
import { checkAchievements } from './achievements.js';
import { collection, doc, addDoc, updateDoc, getDocs, query, where, onSnapshot, increment, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

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
    const gamesRef = collection(db, "games");
    const q = query(gamesRef, where("gameCode", "==", gameCode));
    const querySnapshot = await getDocs(q);
    
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
    const playersRef = collection(db, `games/${gameId}/players`);
    const playerRef = await addDoc(playersRef, {
      name: playerName,
      score: 0,
      answers: {},
      joinedAt: serverTimestamp(),
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
  const gameRef = doc(db, "games", gameId);
  
  onSnapshot(gameRef, (doc) => {
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
    const playerRef = doc(db, `games/${gameId}/players`, playerId);
    await updateDoc(playerRef, {
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
      await updateDoc(playerRef, {
        score: increment(100)
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
  const playersRef = collection(db, `games/${gameId}/players`);
  const playersSnapshot = await getDocs(playersRef);
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
        ${index + 1}. ${player.name} - ${player.score} очков
      </li>
    `;
  });
  leaderboard.innerHTML += '</ol>';
  
  // Показываем достижения
  const currentPlayer = players.find(p => p.id === playerId);
  if (currentPlayer && currentPlayer.achievements) {
    badgesContainer.innerHTML = '';
    currentPlayer.achievements.forEach(achievement => {
      badgesContainer.innerHTML += `
        <div class="badge">
          <img src="images/badges/${achievement.id}.png" alt="${achievement.name}">
          <span>${achievement.name}</span>
        </div>
      `;
    });
  }
}

// Обработчик кнопки "Играть снова"
playAgainBtn.addEventListener('click', () => {
  resultScreen.classList.add('hidden');
  joinScreen.classList.remove('hidden');
  document.getElementById('gameCodeInput').value = '';
  document.getElementById('playerNameInput').value = '';
});