import { db } from './firebase.js';
import { doc, getDoc, updateDoc, arrayUnion } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Определения достижений
export const achievements = [
  {
    id: 'first_blood',
    name: 'Первая кровь',
    description: 'Правильно ответить на первый вопрос в игре',
    check: async (playerId, gameId) => {
      const playerRef = doc(db, `games/${gameId}/players`, playerId);
      const playerDoc = await getDoc(playerRef);
      
      if (playerDoc.exists()) {
        const playerData = playerDoc.data();
        return playerData.answers && playerData.answers[0] !== undefined;
      }
      return false;
    }
  },
  {
    id: 'fast_thinker',
    name: 'Быстрый мыслитель',
    description: 'Ответить на вопрос менее чем за 5 секунд',
    check: async (playerId, gameId) => {
      // В реальном приложении нужно отслеживать время ответа
      return Math.random() > 0.7; // Для демонстрации
    }
  },
  {
    id: 'perfect_score',
    name: 'Идеальный результат',
    description: 'Ответить правильно на все вопросы',
    check: async (playerId, gameId) => {
      const playerRef = doc(db, `games/${gameId}/players`, playerId);
      const playerDoc = await getDoc(playerRef);
      
      if (playerDoc.exists()) {
        const playerData = playerDoc.data();
        const gameRef = doc(db, "games", gameId);
        const gameDoc = await getDoc(gameRef);
        
        if (gameDoc.exists()) {
          const gameData = gameDoc.data();
          const totalQuestions = gameData.questions.length;
          let correctAnswers = 0;
          
          for (let i = 0; i < totalQuestions; i++) {
            if (playerData.answers && 
                playerData.answers[i] !== undefined && 
                playerData.answers[i] === gameData.questions[i].correctAnswer) {
              correctAnswers++;
            }
          }
          
          return correctAnswers === totalQuestions;
        }
      }
      return false;
    }
  }
];

// Проверка достижений
export const checkAchievements = async (playerId, gameId) => {
  const playerRef = doc(db, `games/${gameId}/players`, playerId);
  
  for (const achievement of achievements) {
    // Проверяем, есть ли уже это достижение у игрока
    const playerDoc = await getDoc(playerRef);
    const playerData = playerDoc.data();
    
    if (playerData.achievements && playerData.achievements.includes(achievement.id)) {
      continue; // Достижение уже есть
    }
    
    // Проверяем, выполнено ли достижение
    const earned = await achievement.check(playerId, gameId);
    if (earned) {
      await awardBadge(playerRef, achievement.id);
    }
  }
};

// Награждение бейджем
export const awardBadge = async (playerRef, badgeId) => {
  try {
    await updateDoc(playerRef, {
      achievements: arrayUnion(badgeId)
    });
    console.log(`Игрок награжден бейджем: ${badgeId}`);
  } catch (error) {
    console.error("Ошибка награждения бейджем:", error);
  }
};