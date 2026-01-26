//lib/firebaseStats.ts

import { doc, setDoc, updateDoc, increment, Timestamp } from 'firebase/firestore';
import { db } from './firebase';

interface GlobalStatsUpdatePayload {
  chapterDelta?: number;
  subchapterDelta?: number;
  lessonDelta?: number;
  assignmentDelta?: number;
  videoDelta?: number;
  problemDelta?: number;
  testDelta?: number;
  userDelta?: number;
}

// 🟢 Статистик анх үүсгэхэд нэг удаа дуудаж ажиллуулна
export const initializeStats = async () => {
  await setDoc(doc(db, 'stats', 'global'), {
    userCount: 0,
    chapterCount: 0,
    subchapterCount: 0,
    lessonCount: 0,
    assignmentCount: 0,
    videoCount: 0,
    problemCount: 0,
    testCount: 0,
    lastUpdated: Timestamp.now(),
  });
};

// 🔁 Статистикийг updateDoc ашиглан increment хийж шинэчлэх
export const updateGlobalStats = async (updates: GlobalStatsUpdatePayload) => {
  const statsRef = doc(db, 'stats', 'global');

  const payload: {
    chapterCount?: ReturnType<typeof increment>;
    subchapterCount?: ReturnType<typeof increment>;
    lessonCount?: ReturnType<typeof increment>;
    assignmentCount?: ReturnType<typeof increment>;
    videoCount?: ReturnType<typeof increment>;
    problemCount?: ReturnType<typeof increment>;
    testCount?: ReturnType<typeof increment>;
    userCount?: ReturnType<typeof increment>;
    lastUpdated: Timestamp;
  } = {
    lastUpdated: Timestamp.now(),
  };

  if (updates.chapterDelta !== undefined) {
    payload.chapterCount = increment(updates.chapterDelta);
  }
  if (updates.subchapterDelta !== undefined) {
    payload.subchapterCount = increment(updates.subchapterDelta);
  }
  if (updates.lessonDelta !== undefined) {
    payload.lessonCount = increment(updates.lessonDelta);
  }
  if (updates.assignmentDelta !== undefined) {
    payload.assignmentCount = increment(updates.assignmentDelta);
  }
  if (updates.videoDelta !== undefined) {
    payload.videoCount = increment(updates.videoDelta);
  }
  if (updates.problemDelta !== undefined) {
    payload.problemCount = increment(updates.problemDelta);
  }
  if (updates.testDelta !== undefined) {
    payload.testCount = increment(updates.testDelta);
  }
  if (updates.userDelta !== undefined) {
    payload.userCount = increment(updates.userDelta);
  }

  await updateDoc(statsRef, payload);
};