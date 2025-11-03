// app.js — WRG Full Frontend Logic (Connected to Backend)
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

    // === change this to your Render URL ===
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

    // === TIMER ===
    function startTimer() {
      clearInterval(timerInterval);
      timeLeft = baseRoundTime;
      updateUI();
      timerInterval = setInterval(() => {
        timeLeft--;
        sounds.tick.play();
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

      // Save score
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

    // === BUTTONS ===
    startBtn.addEventListener("click", () => {
      startOverlay.style.display = "none";
      startNewGame();
    });

    homeBtn.addEventListener("click", () => {
      openOverlay("Home", `<p>Welcome back — ready to play?</p><button id="home-start">Start New Game</button>`);
      setTimeout(() => {
        const hs = document.getElementById("home-start");
        if (hs) hs.addEventListener("click", () => {
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
        const rows = data
          .map((p, i) => `<li>#${i + 1} @${p.username} — ${p.total_score}</li>`)
          .join("");
        overlayBody.innerHTML = `<ol>${rows}</ol>`;
      } catch (err) {
        overlayBody.innerHTML = `<p>Couldn't load leaderboard.</p>`;
      }
    });

    tasksBtn.addEventListener("click", () => {
      const tasks = Array.from({ length: 10 }, (_, i) => `<li>Task ${i + 1}: Add task</li>`).join("");
      openOverlay("Tasks", `<ul>${tasks}</ul>`);
    });

    howBtn.addEventListener("click", () => {
      openOverlay(
        "How to Play",
        `<p>Type words starting with the shown letter. Longer words = more points. Time shortens each round.</p>`
      );
    });

    youBtn.addEventListener("click", async () => {
      openOverlay("Your Profile", "<p>Loading profile...</p>");
      try {
        const fid = 2; // test fid
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

    submitWord.addEventListener("click", async () => {
      const w = wordInput.value.trim().toLowerCase();
      if (!w) return (feedbackEl.textContent = "Type a word");
      if (w[0].toUpperCase() !== currentLetter) return (feedbackEl.textContent = `Word must start with ${currentLetter}`);
      if (w.length < requiredLength) return (feedbackEl.textContent = `Word must be at least ${requiredLength} letters`);

      const valid = await verifyWord(w);
      if (!valid) {
        feedbackEl.textContent = "Not a valid word!";
        sounds.fail.play();
        return;
      }

      score += w.length * 10;
      feedbackEl.textContent = `✅ +${w.length * 10} points`;
      sounds.success.play();
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
        { score: 50, badge: "Bronze Wordsmith" },
        { score: 150, badge: "Silver Wordsmith" },
        { score: 300, badge: "Gold Wordsmith" },
        { score: 600, badge: "Platinum Wordsmith" },
        { score: 1000, badge: "Diamond Wordsmith" },
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
        }),
      });
      if (res.ok) sounds.badge.play();
    }

    updateUI();
  });
})();

