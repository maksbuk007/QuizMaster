import { db } from './firebase.js';

// Определения достижений
export const achievements = [
  {
    id: 'first_blood',
    name: 'Первая кровь',
    description: 'Правильно ответить на первый вопрос в игре',
    check: async (playerId, gameId) => {
      const playerRef = db.collection(`games/${gameId}/players`).doc(playerId);
      const playerDoc = await playerRef.get();
      
      if (playerDoc.exists) {
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
      const playerRef = db.collection(`games/${gameId}/players`).doc(playerId);
      const playerDoc = await playerRef.get();
      
      if (playerDoc.exists) {
        const playerData = playerDoc.data();
        const gameRef = db.collection("games").doc(gameId);
        const gameDoc = await gameRef.get();
        
        if (gameDoc.exists) {
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
  const playerRef = db.collection(`games/${gameId}/players`).doc(playerId);
  
  for (const achievement of achievements) {
    // Проверяем, есть ли уже это достижение у игрока
    const playerDoc = await playerRef.get();
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
    await playerRef.update({
      achievements: firebase.firestore.FieldValue.arrayUnion(badgeId)
    });
    console.log(`Игрок награжден бейджем: ${badgeId}`);
  } catch (error) {
    console.error("Ошибка награждения бейджем:", error);
  }
};