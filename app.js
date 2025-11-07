// app.js — WRG Full Frontend Logic (Connected to Backend)
(function () {
document.addEventListener("DOMContentLoaded", () => {
const startBtn = document.getElementById("start-btn");
const leaderboardBtn = document.getElementById("leaderboard-btn");
const overlay = document.getElementById("overlay");
const overlayClose = document.getElementById("overlay-close");
const overlayTitle = document.getElementById("overlay-title");
const overlayBody = document.getElementById("overlay-body");
const wordInput = document.getElementById("word-input");
const prompt = document.getElementById("prompt");
const timerEl = document.getElementById("timer");
const scoreEl = document.getElementById("score");
const requirementsEl = document.getElementById("requirements");
const startOverlay = document.getElementById("start-overlay");

const API_BASE = "https://wrg-backend.onrender.com";

const sounds = {
  success: new Audio("sounds/success.mp3"),
  fail: new Audio("sounds/fail.mp3"),
  badge: new Audio("sounds/badge.mp3"),
  tick: new Audio("sounds/tick.mp3"),
  gameover: new Audio("sounds/gameover.mp3"),
};

let score = 0;
let baseRoundTime = 40;
let timeLeft = 40;
let currentLetter = "A";
let requiredLength = 3;
let timerInterval = null;
let user = null;

// 🔒 Badge lock
let unclaimedBadge = null;

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
    const shareText = `I just scored ${score} points on WRG ⚡ Can you beat me?`;
    const shareUrl = `https://warpcast.com/~/compose?text=${encodeURIComponent(shareText)}`;
    window.open(shareUrl, "_blank");
  });

  saveScore();
}

function startNewGame() {
  if (unclaimedBadge) {
    showUnclaimedBadgePopup();
    return;
  }
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
  await checkAndMintBadge(score, user);
}

// 🏆 Leaderboard — Updated visual style (overlay)
leaderboardBtn.addEventListener("click", async () => {
  openOverlay("Leaderboard", "<p>Loading leaderboard...</p>");
  try {
    const res = await fetch(`${API_BASE}/api/leaderboard`);
    const data = await res.json();

    if (!Array.isArray(data)) throw new Error("No leaderboard data");

    const top100 = data.slice(0, 100);
    const youFID = user?.fid || localStorage.getItem("fid");
    const youPlayer = data.find((p) => p.fid === Number(youFID));
    const youRank = youPlayer ? data.findIndex((p) => p.fid === Number(youFID)) + 1 : null;

    let youBox = "";
    if (youPlayer) {
      youBox = `
        <div style="padding:10px;background:#d4f0ff;margin-bottom:10px;border-radius:8px;">
          <strong>Your Rank:</strong> #${youRank || "Unranked"}<br/>
          <strong>Your Score:</strong> ${youPlayer.weekly_score ?? 0}<br/>
          <strong>Your Badge:</strong> ${youPlayer.badge_name || "Wood I"}
        </div>`;
    }

    const list = top100.map((p, i) => {
      const badgeName = p.badge_name || "Wood I";
      const badgeBase = badgeName.split(" ")[0].toLowerCase();
      const badgeImg = `/assets/${badgeBase}.png`;
      return `
        <div class="lb-card">
          <span class="lb-rank">#${i + 1}</span>
          <img src="${p.pfp || "https://i.imgur.com/VH1KXQy.png"}" class="lb-pfp">
          <div class="lb-info">
            <h3>@${p.username}</h3>
            <p>${badgeName}</p>
          </div>
          <img src="${badgeImg}" class="lb-badge">
        </div>`;
    }).join("");

    overlayBody.innerHTML = `${youBox}<div class="leaderboard-wrapper">${list}</div>`;
  } catch (err) {
    overlayBody.innerHTML = `<p>Couldn't load leaderboard.</p>`;
  }
});

overlayClose.addEventListener("click", closeOverlayFn);

// 🔒 Badge system
async function checkAndMintBadge(weeklyScore, user) {
  const milestones = [
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

  const earned = milestones.filter((b) => weeklyScore >= b.score).pop();
  if (!earned) return;

  unclaimedBadge = earned.badge;
  localStorage.setItem("unclaimedBadge", earned.badge);
  showUnclaimedBadgePopup();
}

function showUnclaimedBadgePopup() {
  const badgeBase = unclaimedBadge.split(" ")[0].toLowerCase();
  const img = `/assets/${badgeBase}.png`;
  openOverlay(
    "🏅 Claim Your Badge",
    `
    <div style="text-align:center">
      <img src="${img}" style="width:100px;height:100px"><br>
      <h3>${unclaimedBadge}</h3>
      <p>You’ve earned a new badge! Claim it to continue playing.</p>
      <button id="claim-btn">Claim Badge</button>
    </div>
  `
  );
  const claimBtn = document.getElementById("claim-btn");
  claimBtn.addEventListener("click", async () => {
    const fid = user?.fid || localStorage.getItem("fid");
    const wallet = user?.wallet;
    await fetch(`${API_BASE}/api/mintBadge`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fid, wallet, badge: unclaimedBadge, price_usd: 0.03 }),
    });
    sounds.badge.play();
    localStorage.removeItem("unclaimedBadge");
    unclaimedBadge = null;
    closeOverlayFn();
    alert(`🎉 Badge claimed successfully!`);
  });
}

// 🔒 Auto popup if unclaimed
window.addEventListener("load", () => {
  const pending = localStorage.getItem("unclaimedBadge");
  if (pending) {
    unclaimedBadge = pending;
    showUnclaimedBadgePopup();
  }
});

updateUI();
});
})();
