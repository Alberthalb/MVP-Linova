import { doc, getDoc, serverTimestamp, setDoc, deleteDoc } from "firebase/firestore";
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
