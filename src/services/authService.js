import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  updateEmail,
  sendPasswordResetEmail,
  verifyPasswordResetCode as firebaseVerifyPasswordResetCode,
  confirmPasswordReset as firebaseConfirmPasswordReset,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  deleteUser,
} from "firebase/auth";
import { auth } from "./firebase";
import { createOrUpdateUserProfile, deleteUserProfile } from "./userService";

export const registerUser = async (name, email, password) => {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  const user = credential.user;
  if (name) {
    await updateProfile(user, { displayName: name });
  }
  await createOrUpdateUserProfile(user.uid, {
    name,
    email,
    createdAt: credential.user.metadata?.creationTime ? new Date(credential.user.metadata.creationTime) : new Date(),
  });
  return user;
};

export const loginUser = async (email, password) => {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
};

export const logoutUser = () => signOut(auth);

export const sendPasswordRecovery = (email) => {
  return sendPasswordResetEmail(auth, email);
};

export const verifyResetCode = (code) => firebaseVerifyPasswordResetCode(auth, code);

export const applyPasswordReset = (code, newPassword) => firebaseConfirmPasswordReset(auth, code, newPassword);

export const changePassword = async (currentPassword, newPassword) => {
  const user = auth.currentUser;
  if (!user || !user.email) {
    throw new Error("Usuário não autenticado");
  }
  const credential = EmailAuthProvider.credential(user.email, currentPassword);
  await reauthenticateWithCredential(user, credential);
  await updatePassword(user, newPassword);
};

export const deleteAccount = async (currentPassword) => {
  const user = auth.currentUser;
  if (!user || !user.email) {
    throw new Error("Usuário não autenticado");
  }
  const credential = EmailAuthProvider.credential(user.email, currentPassword);
  await reauthenticateWithCredential(user, credential);
  await deleteUserProfile(user.uid);
  await deleteUser(user);
};

export const updateUserAccount = async ({ name, email }) => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("Usuário não autenticado");
  }
  const promises = [];
  if (name && name !== user.displayName) {
    promises.push(updateProfile(user, { displayName: name }));
  }
  if (email && email !== user.email) {
    promises.push(updateEmail(user, email));
  }
  await Promise.all(promises);
  await createOrUpdateUserProfile(user.uid, {
    name: name || user.displayName || "",
    email: email || user.email || "",
  });
};
