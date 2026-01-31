
// src/main.js
import './style.css';
import { db } from "./firebase";
import {
  collection, addDoc, query, orderBy, limit, getDocs, serverTimestamp
} from "firebase/firestore";
console.log("🔥 main.js loaded, Firebase DB =", db);


const entriesRef = collection(db, "entries");

const listEl = document.getElementById("rank-list");
const inputEl = document.getElementById("username");
const btnEl = document.getElementById("submitBtn");
const statusEl = document.getElementById("status");

function setStatus(msg) {
  statusEl.textContent = msg || "";
}

async function renderTop10() {
  listEl.innerHTML = "";
  const q = query(entriesRef, orderBy("createdAt", "asc"), limit(10));
  const snap = await getDocs(q);

  snap.forEach(doc => {
    const li = document.createElement("li");
    li.textContent = doc.data().name;
    listEl.appendChild(li);
  });
}

async function submitName() {
  const name = inputEl.value.trim();
  if (!name) return;

  btnEl.disabled = true;
  await addDoc(entriesRef, {
    name,
    createdAt: serverTimestamp()
  });
  btnEl.disabled = false;
  renderTop10();
}

btnEl.addEventListener("click", submitName);
inputEl.addEventListener("keydown", e => e.key === "Enter" && submitName());

renderTop10();
