import { doc, getDoc, serverTimestamp, setDoc, deleteDoc, collection, getDocs } from "firebase/firestore";
import { db } from "./firebase";

export const createOrUpdateUserProfile = async (uid, payload = {}) => {
  if (!uid) return;
  const profileRef = doc(db, "users", uid);
  await setDoc(
    profileRef,
    {
      ...payload,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
};

export const getUserProfile = async (uid) => {
  if (!uid) return null;
  const profileSnap = await getDoc(doc(db, "users", uid));
  return profileSnap.exists() ? profileSnap.data() : null;
};

export const deleteUserProfile = async (uid) => {
  if (!uid) return;
  await deleteDoc(doc(db, "users", uid));
};

export const deleteAllUserData = async (uid) => {
  if (!uid) return;
  const subcollections = ["initialQuiz", "progress", "lessonsCompleted"];
  for (const sub of subcollections) {
    const colRef = collection(db, "users", uid, sub);
    const snapshot = await getDocs(colRef);
    await Promise.all(snapshot.docs.map((docSnap) => deleteDoc(docSnap.ref)));
  }
};

export const fetchInitialQuizQuestions = async () => {
  const snapshot = await getDocs(collection(db, "initialQuizQuestions"));
  const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  return items
    .map((q) => ({
      id: q.id,
      question: q.question || "",
      options: q.options || [],
      correct: q.correct ?? null,
      order: q.order ?? 0,
      value: q.value ?? null,
    }))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
};

export const saveInitialQuizResult = async (uid, payload = {}) => {
  if (!uid) return;
  const target = doc(db, "users", uid, "initialQuiz", "result");
  await setDoc(
    target,
    {
      ...payload,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
};

export const saveLessonProgress = async (uid, lessonId, payload = {}) => {
  if (!uid || !lessonId) return;
  const target = doc(db, "users", uid, "lessonsCompleted", String(lessonId));
  await setDoc(
    target,
    {
      ...payload,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
};

export const saveModuleUnlock = async (uid, moduleId, payload = {}) => {
  if (!uid || !moduleId) return;
  const target = doc(db, "users", uid, "moduleUnlocks", String(moduleId));
  await setDoc(
    target,
    {
      ...payload,
      passed: payload?.passed ?? true,
      status: payload?.status || "unlocked",
      unlockedAt: serverTimestamp(),
    },
    { merge: true }
  );
};
