import { auth, db } from './firebase.js';
import { checkAdmin, generateGameCode } from './utils.js';

// DOM элементы
const gamesList = document.querySelector('.games-list');
const gameForm = document.getElementById('gameForm');
const questionsContainer = document.getElementById('questionsContainer');
const addQuestionBtn = document.getElementById('addQuestionBtn');
const questionTemplate = document.getElementById('questionTemplate');
const optionTemplate = document.getElementById('optionTemplate');
const achievementsList = document.querySelector('.achievements-list');
const addAchievementBtn = document.getElementById('addAchievementBtn');
const achievementTemplate = document.getElementById('achievementTemplate');
const gameCardTemplate = document.getElementById('gameCardTemplate');

let currentUser = null;

// Инициализация админ панели
document.addEventListener('DOMContentLoaded', async () => {
  currentUser = auth.currentUser;
  
  if (!currentUser) {
    alert('Доступ запрещен. Пожалуйста, войдите в систему.');
    window.location.href = 'index.html';
    return;
  }
  
  const isAdmin = await checkAdmin(currentUser.uid);
  if (!isAdmin) {
    alert('У вас нет прав доступа к панели администратора.');
    window.location.href = 'index.html';
    return;
  }
  
  // Загрузка списка игр
  loadGames();
  
  // Загрузка достижений
  loadAchievements();
  
  // Инициализация вкладок
  initTabs();
  
  // Обработчики
  addQuestionBtn.addEventListener('click', addQuestion);
  gameForm.addEventListener('submit', createGame);
  addAchievementBtn.addEventListener('click', addAchievement);
});

// Инициализация вкладок
function initTabs() {
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');
  
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      // Удаляем активный класс у всех кнопок и контента
      tabBtns.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));
      
      // Добавляем активный класс текущей кнопке и контенту
      btn.classList.add('active');
      const tabId = btn.getAttribute('data-tab');
      document.getElementById(`${tabId}-tab`).classList.add('active');
    });
  });
}

// Загрузка списка игр
async function loadGames() {
  try {
    const querySnapshot = await db.collection("games").orderBy("createdAt", "desc").get();
    gamesList.innerHTML = '';
    
    if (querySnapshot.empty) {
      gamesList.innerHTML = '<p>Игр пока нет</p>';
      return;
    }
    
    querySnapshot.forEach(doc => {
      const game = doc.data();
      const gameElement = createGameElement(game, doc.id);
      gamesList.appendChild(gameElement);
    });
  } catch (error) {
    console.error("Ошибка загрузки игр:", error);
    gamesList.innerHTML = '<p class="error">Ошибка загрузки игр</p>';
  }
}

// Создание элемента игры для списка
function createGameElement(game, id) {
  const element = gameCardTemplate.content.cloneNode(true);
  const gameCard = element.querySelector('.game-card');
  
  gameCard.querySelector('.game-title').textContent = game.title;
  gameCard.querySelector('.game-theme').textContent = `Тема: ${getThemeName(game.theme)}`;
  gameCard.querySelector('.game-code strong').textContent = game.gameCode;
  
  const statusText = gameCard.querySelector('.status-text');
  if (game.isActive) {
    statusText.textContent = 'Активна';
    statusText.classList.add('active');
  } else {
    statusText.textContent = 'Неактивна';
    statusText.classList.remove('active');
  }
  
  // Устанавливаем ID для кнопок
  const editBtn = gameCard.querySelector('.btn-edit');
  const deleteBtn = gameCard.querySelector('.btn-delete');
  const toggleBtn = gameCard.querySelector('.btn-toggle');
  
  editBtn.setAttribute('data-id', id);
  deleteBtn.setAttribute('data-id', id);
  toggleBtn.setAttribute('data-id', id);
  
  // Иконка для кнопки переключения
  toggleBtn.innerHTML = game.isActive ? '<i class="fas fa-pause"></i>' : '<i class="fas fa-play"></i>';
  
  // Обработчики действий
  editBtn.addEventListener('click', () => editGame(id));
  deleteBtn.addEventListener('click', () => deleteGame(id));
  toggleBtn.addEventListener('click', () => toggleGame(id, !game.isActive));
  
  return element;
}

// Добавление вопроса
function addQuestion() {
  const questionClone = questionTemplate.content.cloneNode(true);
  const questionElement = questionClone.querySelector('.question-item');
  const questionNumber = questionsContainer.children.length + 1;
  
  // Установка номера вопроса
  questionElement.querySelector('.question-number').textContent = questionNumber;
  
  // Обработчик удаления вопроса
  questionElement.querySelector('.delete-question').addEventListener('click', () => {
    questionElement.remove();
    updateQuestionNumbers();
  });
  
  // Обработчик изменения типа вопроса
  const typeSelect = questionElement.querySelector('.question-type');
  const mediaUrlGroup = questionElement.querySelector('.media-url');
  
  typeSelect.addEventListener('change', () => {
    if (typeSelect.value === 'text') {
      mediaUrlGroup.classList.add('hidden');
    } else {
      mediaUrlGroup.classList.remove('hidden');
    }
  });
  
  // Обработчик добавления варианта
  const addOptionBtn = questionElement.querySelector('.add-option');
  const optionsContainer = questionElement.querySelector('.options-container');
  const correctAnswerSelect = questionElement.querySelector('.correct-answer');
  
  addOptionBtn.addEventListener('click', () => {
    addOption(optionsContainer, correctAnswerSelect);
  });
  
  // Добавляем два варианта по умолчанию
  addOption(optionsContainer, correctAnswerSelect);
  addOption(optionsContainer, correctAnswerSelect);
  
  questionsContainer.appendChild(questionElement);
}

// Добавление варианта ответа
function addOption(container, correctSelect) {
  const optionClone = optionTemplate.content.cloneNode(true);
  const optionElement = optionClone.querySelector('.option-item');
  
  // Обработчик удаления варианта
  optionElement.querySelector('.delete-option').addEventListener('click', () => {
    optionElement.remove();
    updateCorrectAnswerOptions(correctSelect);
  });
  
  // Обновление вариантов при изменении текста
  optionElement.querySelector('.option-text').addEventListener('input', () => {
    updateCorrectAnswerOptions(correctSelect);
  });
  
  container.appendChild(optionElement);
  updateCorrectAnswerOptions(correctSelect);
}

// Обновление номеров вопросов
function updateQuestionNumbers() {
  const questions = questionsContainer.querySelectorAll('.question-item');
  questions.forEach((question, index) => {
    question.querySelector('.question-number').textContent = index + 1;
  });
}

// Обновление вариантов правильного ответа
function updateCorrectAnswerOptions(selectElement) {
  const container = selectElement.closest('.question-item').querySelector('.options-container');
  const options = container.querySelectorAll('.option-text');
  
  // Очищаем и заполняем заново
  selectElement.innerHTML = '';
  
  options.forEach((option, index) => {
    const optionElement = document.createElement('option');
    optionElement.value = index;
    optionElement.textContent = option.value || `Вариант ${index + 1}`;
    selectElement.appendChild(optionElement);
  });
}

// Создание игры
async function createGame(e) {
  e.preventDefault();
  
  const title = document.getElementById('gameTitle').value;
  const theme = document.getElementById('gameTheme').value;
  const description = document.getElementById('gameDescription').value;
  
  // Собираем вопросы
  const questions = [];
  const questionElements = questionsContainer.querySelectorAll('.question-item');
  
  for (const questionElement of questionElements) {
    const text = questionElement.querySelector('.question-text').value;
    const type = questionElement.querySelector('.question-type').value;
    const mediaUrl = type !== 'text' ? questionElement.querySelector('.media-url-input').value : '';
    const options = [];
    
    // Собираем варианты ответов
    const optionElements = questionElement.querySelectorAll('.option-text');
    optionElements.forEach(option => {
      options.push(option.value);
    });
    
    const correctAnswer = parseInt(questionElement.querySelector('.correct-answer').value);
    
    questions.push({
      text,
      type,
      mediaUrl,
      options,
      correctAnswer
    });
  }
  
  try {
    // Генерируем уникальный код игры
    const gameCode = await generateGameCode();
    
    // Сохраняем игру в Firestore
    await db.collection("games").add({
      title,
      theme,
      description,
      questions,
      gameCode,
      createdBy: currentUser.uid,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      isActive: false
    });
    
    alert(`Игра "${title}" успешно создана с кодом: ${gameCode}`);
    gameForm.reset();
    questionsContainer.innerHTML = '';
    loadGames();
  } catch (error) {
    console.error("Ошибка создания игры:", error);
    alert(`Ошибка создания игры: ${error.message}`);
  }
}

// Редактирование игры
async function editGame(gameId) {
  // Реализация редактирования игры
  alert(`Редактирование игры ${gameId} будет реализовано в следующей версии`);
}

// Удаление игры
async function deleteGame(gameId) {
  if (!confirm("Вы уверены, что хотите удалить эту игру? Все данные будут потеряны.")) return;
  
  try {
    await db.collection("games").doc(gameId).delete();
    alert("Игра успешно удалена!");
    loadGames();
  } catch (error) {
    console.error("Ошибка удаления игры:", error);
    alert(`Ошибка удаления игры: ${error.message}`);
  }
}

// Переключение состояния игры
async function toggleGame(gameId, isActive) {
  try {
    await db.collection("games").doc(gameId).update({
      isActive: isActive
    });
    
    alert(`Игра успешно ${isActive ? 'активирована' : 'деактивирована'}!`);
    loadGames();
  } catch (error) {
    console.error("Ошибка изменения статуса игры:", error);
    alert(`Ошибка изменения статуса игры: ${error.message}`);
  }
}

// Загрузка достижений
async function loadAchievements() {
  try {
    const querySnapshot = await db.collection("achievements").get();
    achievementsList.innerHTML = '';
    
    if (querySnapshot.empty) {
      achievementsList.innerHTML = '<p>Достижений пока нет</p>';
      return;
    }
    
    querySnapshot.forEach(doc => {
      const achievement = doc.data();
      const achievementElement = createAchievementElement(achievement, doc.id);
      achievementsList.appendChild(achievementElement);
    });
  } catch (error) {
    console.error("Ошибка загрузки достижений:", error);
    achievementsList.innerHTML = '<p class="error">Ошибка загрузки достижений</p>';
  }
}

// Создание элемента достижения
function createAchievementElement(achievement, id) {
  const element = achievementTemplate.content.cloneNode(true);
  const achievementElement = element.querySelector('.achievement-item');
  
  achievementElement.querySelector('[data-field="name"]').textContent = achievement.name;
  achievementElement.querySelector('[data-field="description"]').textContent = achievement.description;
  
  // Устанавливаем ID для кнопок
  achievementElement.querySelector('.btn-edit').setAttribute('data-id', id);
  achievementElement.querySelector('.btn-delete').setAttribute('data-id', id);
  
  // Обработчики
  achievementElement.querySelector('.btn-edit').addEventListener('click', (e) => {
    e.stopPropagation();
    editAchievement(id);
  });
  
  achievementElement.querySelector('.btn-delete').addEventListener('click', (e) => {
    e.stopPropagation();
    deleteAchievement(id);
  });
  
  return element;
}

// Добавление достижения
function addAchievement() {
  const name = prompt("Введите название достижения:");
  if (!name) return;
  
  const description = prompt("Введите описание достижения:");
  if (!description) return;
  
  try {
    db.collection("achievements").add({
      name,
      description,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
      alert(`Достижение "${name}" успешно добавлено!`);
      loadAchievements();
    });
  } catch (error) {
    console.error("Ошибка добавления достижения:", error);
    alert(`Ошибка добавления достижения: ${error.message}`);
  }
}

// Редактирование достижения
async function editAchievement(id) {
  const achievementRef = db.collection("achievements").doc(id);
  const achievementDoc = await achievementRef.get();
  
  if (!achievementDoc.exists) {
    alert("Достижение не найдено!");
    return;
  }
  
  const achievement = achievementDoc.data();
  
  const name = prompt("Введите новое название достижения:", achievement.name);
  if (!name) return;
  
  const description = prompt("Введите новое описание достижения:", achievement.description);
  if (!description) return;
  
  try {
    await achievementRef.update({
      name,
      description
    });
    
    alert(`Достижение "${name}" успешно обновлено!`);
    loadAchievements();
  } catch (error) {
    console.error("Ошибка обновления достижения:", error);
    alert(`Ошибка обновления достижения: ${error.message}`);
  }
}

// Удаление достижения
async function deleteAchievement(id) {
  if (!confirm("Вы уверены, что хотите удалить это достижение?")) return;
  
  try {
    await db.collection("achievements").doc(id).delete();
    alert("Достижение успешно удалено!");
    loadAchievements();
  } catch (error) {
    console.error("Ошибка удаления достижения:", error);
    alert(`Ошибка удаления достижения: ${error.message}`);
  }
}

// Получение названия темы по ключу
function getThemeName(themeKey) {
  const themes = {
    'general': 'Общие знания',
    'science': 'Наука',
    'history': 'История',
    'sports': 'Спорт',
    'movies': 'Фильмы',
    'music': 'Музыка'
  };
  return themes[themeKey] || themeKey;
}