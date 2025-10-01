import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  onSnapshot
} from "firebase/firestore";
import { db } from "./config";

// Kullanıcı verilerini kaydet/güncelle
export const saveUserData = async (userId, data) => {
  try {
    const userRef = doc(db, "users", userId);
    await setDoc(userRef, data, { merge: true });
    return { error: null };
  } catch (error) {
    return { error: error.message };
  }
};

// Kullanıcı verilerini oku
export const getUserData = async (userId) => {
  try {
    const userRef = doc(db, "users", userId);
    const docSnap = await getDoc(userRef);

    if (docSnap.exists()) {
      return { data: docSnap.data(), error: null };
    } else {
      return { data: null, error: "User data not found" };
    }
  } catch (error) {
    return { data: null, error: error.message };
  }
};

// Kullanıcı verilerini güncelle
export const updateUserData = async (userId, updates) => {
  try {
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, updates);
    return { error: null };
  } catch (error) {
    return { error: error.message };
  }
};

// Kullanıcı verilerini sil
export const deleteUserData = async (userId) => {
  try {
    const userRef = doc(db, "users", userId);
    await deleteDoc(userRef);
    return { error: null };
  } catch (error) {
    return { error: error.message };
  }
};

// Real-time dinleyici
export const subscribeToUserData = (userId, callback) => {
  const userRef = doc(db, "users", userId);
  return onSnapshot(userRef, (doc) => {
    if (doc.exists()) {
      callback(doc.data());
    } else {
      callback(null);
    }
  });
};

// Koleksiyon sorgusu örneği
export const queryCollection = async (collectionName, field, operator, value) => {
  try {
    const q = query(collection(db, collectionName), where(field, operator, value));
    const querySnapshot = await getDocs(q);
    const results = [];
    querySnapshot.forEach((doc) => {
      results.push({ id: doc.id, ...doc.data() });
    });
    return { data: results, error: null };
  } catch (error) {
    return { data: null, error: error.message };
  }
};
