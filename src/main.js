import './style.css';
import { db } from "./firebase";
import {
  collection, setDoc, query, orderBy, limit,
  getDocs, serverTimestamp, doc
} from "firebase/firestore";

const entriesRef = collection(db, "entries");

const listEl   = document.getElementById("rank-list");
const inputEl  = document.getElementById("username");
const btnEl    = document.getElementById("submitBtn");
const statusEl = document.getElementById("status");

const SUBMIT_NAME_KEY = "happynewyear_submitted_name";
const SUBMIT_RANK_KEY = "happynewyear_rank";

const REWARDS = {
  1: { text: "🎁 This is Starbucks for you #1", url: "https://twtks.bz/t/RRdqmnNeSH" },
  2: { text: "🎁 This is Starbucks for you #2", url: "https://twtks.bz/t/5WDTiJgdWh" },
  3: { text: "🎁 This is Starbucks for you #3", url: "https://twtks.bz/t/fWNblH84uk" }
};

function setStatus(msg, html = false) {
  html ? statusEl.innerHTML = msg : statusEl.textContent = msg || "";
}

/* ===== 排行榜 ===== */
async function renderTop10() {
  listEl.innerHTML = "";

  const q = query(entriesRef, orderBy("rank", "asc"), limit(10));
  const snap = await getDocs(q);

  snap.docs.forEach((d) => {
    const li = document.createElement("li");
    const { name, rank } = d.data();

    li.textContent = `NO.${rank} ${name}`;
    if (rank <= 3) li.textContent += " 🏆";

    listEl.appendChild(li);
  });
}

/* ===== 取得目前名次 ===== */
async function getCurrentRank() {
  const snap = await getDocs(entriesRef);
  return snap.size + 1;
}

/* ===== 送出 ===== */
async function submitName() {
  if (localStorage.getItem(SUBMIT_NAME_KEY)) {
    setStatus(`🎯 You already submitted as "${localStorage.getItem(SUBMIT_NAME_KEY)}"`);
    return;
  }

  const name = inputEl.value.trim();
  const error = validateName(name);
  if (error) {
    setStatus(`❌ ${error}`);
    return;
  }

  btnEl.disabled = true;
  inputEl.disabled = true;
  setStatus("Submitting...");

  try {
    const rank = await getCurrentRank();

    await setDoc(doc(db, "entries", name), {
      name,
      rank,
      createdAt: serverTimestamp()
    });

    localStorage.setItem(SUBMIT_NAME_KEY, name);
    localStorage.setItem(SUBMIT_RANK_KEY, rank);

    if (rank <= 3) {
      const r = REWARDS[rank];
      setStatus(
        `🎉 You are NO.${rank}!<br>
         <a href="${r.url}" target="_blank">${r.text}</a>`,
        true
      );
    } else if (rank <= 10) {
      setStatus(`🎉 You are NO.${rank}!`);
    } else {
      setStatus(`📌 You are rank #${rank}. Thanks for joining!`);
    }

    await renderTop10();

  } catch (e) {
    console.error(e);
    setStatus("❌ Submit failed (name may already exist)");
    btnEl.disabled = false;
    inputEl.disabled = false;
  }
}
function validateName(name) {
  if (!name) return "Name is required";
  if (name.length < 1) return "Name is too short";
  if (name.length > 30) return "Name is too long (max 30 characters)";

  // 跟 rule 對齊：string + 安全字元
  if (!/^[a-zA-Z0-9 _-]+$/.test(name)) {
    return "Only letters, numbers, space, _ and - allowed";
  }

  return null;
}

/* ===== 還原狀態 ===== */
async function restoreState() {
  const name = localStorage.getItem(SUBMIT_NAME_KEY);
  const rank = localStorage.getItem(SUBMIT_RANK_KEY);
  if (!name || !rank) return;

  inputEl.value = name;
  inputEl.disabled = true;
  btnEl.disabled = true;

  if (rank <= 3) {
    const r = REWARDS[rank];
    setStatus(
      `🎉 You are NO.${rank}!<br>
       <a href="${r.url}" target="_blank">${r.text}</a>`,
      true
    );
  } else if (rank <= 10) {
    setStatus(`🎯 You are NO.${rank}`);
  } else {
    setStatus(`📌 You are rank #${rank}`);
  }
}

/* ===== events ===== */
btnEl.addEventListener("click", submitName);
inputEl.addEventListener("keydown", e => e.key === "Enter" && submitName());

/* ===== init ===== */
(async () => {
  await renderTop10();
  await restoreState();
})();
