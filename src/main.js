import './style.css';
import { db } from "./firebase";
import {
  collection, setDoc, addDoc, query, orderBy, limit,
  getDocs, serverTimestamp, doc
} from "firebase/firestore";

const entriesRef = collection(db, "entries");

const listEl   = document.getElementById("rank-list");
const inputEl  = document.getElementById("username");
const btnEl    = document.getElementById("submitBtn");
const statusEl = document.getElementById("status");

const SUBMIT_NAME_KEY = "happynewyear_submitted_name";
const SUBMIT_RANK_KEY = "happynewyear_rank";

const messageInput = document.getElementById("messageInput");
const messageBtn = document.getElementById("messageBtn");
const messageStatus = document.getElementById("messageStatus");
const messageList = document.getElementById("messageList");



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
    const { name, rank, createdAt } = d.data();

    const time = createdAt?.toDate
      ? formatTime(createdAt.toDate())
      : "";

    li.innerHTML = `
      <div class="rank-row">
        <span class="rank-name">
          NO.${rank} ${name}${rank <= 3 ? " 🏆" : ""}
        </span>
        <span class="rank-time">${time}</span>
      </div>
    `;

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

    messageInput.disabled = false;
    messageBtn.disabled = false;
    messageStatus.textContent = "💬 You can now leave messages";

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

  if (!localStorage.getItem(SUBMIT_NAME_KEY)) {
    messageInput.disabled = true;
    messageBtn.disabled = true;
    messageStatus.textContent = "💡 Join the ranking to leave a message";
  }
}


async function renderMessages() {
  messageList.innerHTML = "";

  const q = query(
    collection(db, "messages"),
    orderBy("createdAt", "desc"),
    limit(20)
  );

  const snap = await getDocs(q);

  snap.forEach(doc => {
    const { name, message, createdAt } = doc.data();

    const li = document.createElement("li");
    li.className = "message-item";

    const time = createdAt?.toDate
      ? formatTime(createdAt.toDate())
      : "";

    li.innerHTML = `
      <div class="message-left">
        <strong>${name}</strong>: ${message}
      </div>
      <div class="message-time">
        ${time}
      </div>
    `;

    messageList.appendChild(li);
  });
}

function formatTime(date) {
  const d = date.toLocaleDateString("en-US", {
    year: "2-digit",
    month: "2-digit",
    day: "2-digit"
  });

  const t = date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });

  return `${d} ${t}`;
}

async function submitMessage() {
  const name = localStorage.getItem(SUBMIT_NAME_KEY);

  // ❌ 沒參加排名 → 不給留言
  if (!name) {
    messageStatus.textContent = "🚫 Please enter your name in ranking first";
    return;
  }

  const message = messageInput.value.trim();
  if (!message) {
    messageStatus.textContent = "❌ Message cannot be empty";
    return;
  }
  if (message.length > 50) {
    messageStatus.textContent = "❌ Message too long (max 50)";
    return;
  }

  messageBtn.disabled = true;
  messageStatus.textContent = "Sending...";

  try {
    await addDoc(collection(db, "messages"), {
      name,
      message,
      createdAt: serverTimestamp()
    });

    messageInput.value = "";          // ✅ 可以再留言
    messageBtn.disabled = false;
    messageStatus.textContent = "✅ Message sent!";

    await renderMessages();
  } catch (e) {
    console.error(e);
    messageBtn.disabled = false;
    messageStatus.textContent = "❌ Failed to send message";
  }
}




/* ===== events ===== */
btnEl.addEventListener("click", submitName);
inputEl.addEventListener("keydown", e => e.key === "Enter" && submitName());
messageBtn.addEventListener("click", submitMessage);

/* ===== init ===== */
(async () => {
  await renderTop10();
  await restoreState();
  await renderMessages();
})();
