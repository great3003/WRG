(function () {
document.addEventListener("DOMContentLoaded", () => {
const startBtn = document.getElementById("start-btn");
const homeBtn = document.getElementById("home-btn");
const leaderboardBtn = document.getElementById("leaderboard-btn");
const tasksBtn = document.getElementById("tasks-btn");
const howBtn = document.getElementById("how-btn");
const youBtn = document.getElementById("you-btn");
const overlay = document.getElementById("overlay");
const overlayClose = document.getElementById("overlay-close");
const overlayTitle = document.getElementById("overlay-title");
const overlayBody = document.getElementById("overlay-body");
const submitWord = document.getElementById("submit-word");
const wordInput = document.getElementById("word-input");
const prompt = document.getElementById("prompt");
const timerEl = document.getElementById("timer");
const scoreEl = document.getElementById("score");
const requirementsEl = document.getElementById("requirements");
const feedbackEl = document.getElementById("feedback");
const startOverlay = document.getElementById("start-overlay");

const API_BASE = "https://wrg-backend.onrender.com";  

const sounds = {  
  success: new Audio("sounds/success.mp3"),  
  fail: new Audio("sounds/fail.mp3"),  
  badge: new Audio("sounds/badge.mp3"),  
  tick: new Audio("sounds/tick.mp3"),  
  gameover: new Audio("sounds/gameover.mp3"),  
};  

import { sdk } from '@farcaster/miniapp-sdk'

// Wait until the DOM is ready
window.addEventListener('DOMContentLoaded', async () => {
  console.log('DOM fully loaded.')

  // Simulate loading or setup tasks (optional)
  await new Promise(resolve => setTimeout(resolve, 1000))

  // Tell Farcaster that your app is ready to display
  await sdk.actions.ready()
  console.log('Mini app is ready!')
})

let score = 0;  
let baseRoundTime = 40;  
let timeLeft = 40;  
let currentLetter = "A";  
let requiredLength = 3;  
let timerInterval = null;  
let user = null;  

function randomLetter() {  
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";  
  return letters[Math.floor(Math.random() * letters.length)];  
}  

function updateUI() {  
  prompt.textContent = `Letter: ${currentLetter}`;  
  timerEl.textContent = `Time: ${timeLeft}s`;  
  scoreEl.textContent = `Score: ${score}`;  
  requirementsEl.textContent = `Min length: ${requiredLength} • Round time: ${baseRoundTime}s`;  
}  

function openOverlay(title, html) {  
  overlayTitle.textContent = title;  
  overlayBody.innerHTML = html;  
  overlay.style.display = "flex";  
  overlay.setAttribute("aria-hidden", "false");  
  
  const closeBtn = document.getElementById("overlay-close");
  if (options.hideClose) {
    closeBtn.style.display = "none";
  } else {
    closeBtn.style.display = "block";
  }
}  

function closeOverlayFn() {  
  overlay.style.display = "none";  
  overlay.setAttribute("aria-hidden", "true");  
  overlayTitle.textContent = "";  
  overlayBody.innerHTML = "";  
}  

function startTimer() {  
  clearInterval(timerInterval);  
  timeLeft = baseRoundTime;  
  updateUI();  
  timerInterval = setInterval(() => {  
    timeLeft--;  
    if (timeLeft > 0) sounds.tick.play();  
    updateUI();  
    if (timeLeft <= 0) {  
      clearInterval(timerInterval);  
      endGame();  
    }  
  }, 1000);  
}  

function nextRound() {  
  if (baseRoundTime > 15) baseRoundTime -= 5;  
  currentLetter = randomLetter();  
  requiredLength = Math.min(requiredLength + 1, 13);  
  startTimer();  
  updateUI();  
}  

function endGame() {  
  sounds.gameover.play();  
  openOverlay(  
    "Game Over",  
    `  
    <p>Your final score: <strong>${score}</strong></p>  
    <div style="display:flex;gap:10px;justify-content:center;margin-top:10px;">  
      <button id="restart-btn">Start New Round</button>  
      <button id="share-btn">Share Score</button>  
    </div>  
  `  
  );  

  document.getElementById("restart-btn").addEventListener("click", () => {  
    closeOverlayFn();  
    startNewGame();  
  });  

  document.getElementById("share-btn").addEventListener("click", () => {  
    const shareText = `I just scored ${score} points on WRG ⚡ Can you beat me?
    (miniapp link here)`;  
    const shareUrl = `https://warpcast.com/~/compose?text=${encodeURIComponent(shareText)}`;  
    window.open(shareUrl, "_blank");  
  });  

  saveScore();  
}  

function startNewGame() {  
  score = 0;  
  baseRoundTime = 40;  
  requiredLength = 3;  
  currentLetter = randomLetter();  
  updateUI();  
  startTimer();  
  wordInput.focus();  
}  

async function verifyUser(fid) {  
  const res = await fetch(`${API_BASE}/api/verifyUser/${fid}`);  
  const data = await res.json();  
  if (data.error) throw new Error("User not found");  
  user = data;  
  localStorage.setItem("fid", fid);  
  return data;  
}  

async function saveScore() {  
  if (!user) return;  
  await fetch(`${API_BASE}/api/saveScore`, {  
    method: "POST",  
    headers: { "Content-Type": "application/json" },  
    body: JSON.stringify({  
      fid: user.fid,  
      username: user.username,  
      score,  
    }),  
  });  
}  

startBtn.addEventListener("click", () => {  
  startOverlay.style.display = "none";  
  startNewGame();  
});  

homeBtn.addEventListener("click", () => {  
  openOverlay("Home", `<p>Welcome back — ready to play?</p><button id="home-start">Start New Game</button>`, { hideClose: true});  
  setTimeout(() => {  
    const hs = document.getElementById("home-start");  
    if (hs)  
      hs.addEventListener("click", () => {  
        closeOverlayFn();  
        startNewGame();  
      });  
  }, 0);  
});  

leaderboardBtn.addEventListener("click", async () => {  
  openOverlay("Leaderboard", "<p>Loading leaderboard...</p>");  
  try {  
    const res = await fetch(`${API_BASE}/api/leaderboard`);  
    const data = await res.json();  

    if (!Array.isArray(data)) throw new Error("No leaderboard data");  

    const top100 = data.slice(0, 100);  
    const youFID = user?.fid || localStorage.getItem("fid");  
    const youRank = data.findIndex((p) => p.fid === Number(youFID)) + 1;  
    const youPlayer = data.find((p) => p.fid === Number(youFID));  

    let youBox = "";  
    if (youPlayer) {  
      youBox = `  
        <div style="padding:10px;background:#111;margin-bottom:10px;border-radius:8px;">  
          <strong>Your Rank:</strong> #${youRank || "Unranked"}<br/>  
          <strong>Your Score:</strong> ${youPlayer.weekly_score ?? 0}  
        </div>`;  
    }  

    const list = top100  
      .map(  
        (p, i) => `  
        <li>  
          <img src="${p.pfp || "https://i.imgur.com/VH1KXQy.png"}" style="width:30px;height:30px;border-radius:50%;margin-right:8px;">  
          #${i + 1} @${p.username} — ${p.weekly_score ?? 0}  
        </li>`  
      )  
      .join("");  

    overlayBody.innerHTML = youBox + `<ol>${list}</ol>`;  
  } catch (err) {  
    overlayBody.innerHTML = `<p>Couldn't load leaderboard.</p>`;  
  }  
});  

tasksBtn.addEventListener("click", () => {  
  const tasks = Array.from({ length: 5 }, (_, i) => `<li>Task ${i + 1}: Coming soon...</li>`).join("");  
  openOverlay("Tasks", `<ul>${tasks}</ul>`);  
});  

howBtn.addEventListener("click", () => {  
  openOverlay(  
    "How to Play",  
    `<p>Type words starting with the shown letter.<br>Longer words = more points.<br>Each round shortens your time!<br>Reward pool coming soon!!</p>`  
  );  
});  

youBtn.addEventListener("click", async () => {  
  openOverlay("Your Profile", "<p>Loading profile...</p>");  
  try {  
    const fid = localStorage.getItem("fid") || 1428061;
    const data = await verifyUser(fid);  
    const weeklyScore = score;  
    const profileHTML = `  
      <div class="you-profile">  
        <img src="${data.pfp}" alt="${data.username}" class="you-pfp" />  
        <h3>@${data.username}</h3>  
        <div class="you-stats">  
          <p><strong>Weekly Score:</strong> ${weeklyScore}</p>  
          <p><strong>Total Score:</strong> ${score}</p>  
        </div>  
      </div>`;  
    overlayBody.innerHTML = profileHTML;  
    await checkAndMintBadge(weeklyScore, data);  
  } catch (err) {  
    overlayBody.innerHTML = `<p>Couldn't load profile.</p>`;  
  }  
});  

overlayClose.addEventListener("click", closeOverlayFn);  

function showInputError() {  
  wordInput.classList.add("error");  
  sounds.fail.play();  
  setTimeout(() => wordInput.classList.remove("error"), 300);  
}  

function showInputSuccess() {  
  wordInput.classList.add("success");  
  setTimeout(() => wordInput.classList.remove("success"), 300);  
}  

submitWord.addEventListener("click", async () => {  
  const w = wordInput.value.trim().toLowerCase();  
  if (!w) {  
    feedbackEl.textContent = "Type a word";  
    showInputError();  
    return;  
  }  
  if (w[0].toUpperCase() !== currentLetter) {  
    feedbackEl.textContent = `Word must start with ${currentLetter}`;  
    showInputError();  
    return;  
  }  
  if (w.length < requiredLength) {  
    feedbackEl.textContent = `Word must be at least ${requiredLength} letters`;  
    showInputError();  
    return;  
  }  

  const valid = await verifyWord(w);  
  if (!valid) {  
    feedbackEl.textContent = "Not a valid word!";  
    showInputError();  
    return;  
  }  

  score += w.length * 10;  
  feedbackEl.textContent = `✅ +${w.length * 10} points`;  
  sounds.success.play();  
  showInputSuccess();  
  nextRound();  
  wordInput.value = "";  
});  

async function verifyWord(word) {  
  try {  
    const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);  
    return res.ok;  
  } catch {  
    return false;  
  }  
}  

async function checkAndMintBadge(weeklyScore, user) {  
  const badgeMilestones = [  
    { score: 1000, badge: "Wood I" },
    { score: 2000, badge: "Wood II" },
    { score: 3000, badge: "Wood III" },
    { score: 4500, badge: "Iron I" },
    { score: 6000, badge: "Iron II" },
    { score: 7500, badge: "Iron III" },
    { score: 10000, badge: "Bronze I" },
    { score: 12000, badge: "Bronze II" },
    { score: 14000, badge: "Bronze III" },
    { score: 17000, badge: "Silver I" },
    { score: 19000, badge: "Silver II" },
    { score: 21000, badge: "Silver III" },
    { score: 24000, badge: "Gold I" },
    { score: 27000, badge: "Gold II" },
    { score: 30000, badge: "Gold III" },
    { score: 32000, badge: "Platinum I" },
    { score: 36000, badge: "Platinum II" },
    { score: 40000, badge: "Platinum III" },
    { score: 44000, badge: "Diamond I" },
    { score: 52000, badge: "Diamond II" },
    { score: 60000, badge: "Diamond III" },
    { score: 70000, badge: "Master I" },
    { score: 80000, badge: "Master II" },
    { score: 90000, badge: "Master III" },
    { score: 100000, badge: "Grandmaster I" },
    { score: 130000, badge: "Grandmaster II" },
    { score: 150000, badge: "Grandmaster III" },  
  ];  
  const earned = badgeMilestones.filter((b) => weeklyScore >= b.score).pop();  
  if (!earned) return;  
  const res = await fetch(`${API_BASE}/api/mintBadge`, {  
    method: "POST",  
    headers: { "Content-Type": "application/json" },  
    body: JSON.stringify({  
      badge: earned.badge,  
      score: weeklyScore,  
      fid: user.fid,  
      wallet: user.wallet,  
      price_usd: 0.03,  
    }),  
  });  
  if (res.ok) sounds.badge.play();  
}  

updateUI();

});
})();


