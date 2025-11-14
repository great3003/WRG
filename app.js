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

    const API_BASE = "https://wrg-backend.onrender.com"; // make sure this is correct

    const sounds = {
      success: new Audio("sounds/success.mp3"),
      fail: new Audio("sounds/fail.mp3"),
      badge: new Audio("sounds/badge.mp3"),
      tick: new Audio("sounds/tick.mp3"),
      gameover: new Audio("sounds/gameover.mp3"),
    };

    // Game state
    let score = 0;
    let baseRoundTime = 40;
    let timeLeft = 40;
    let currentLetter = "A";
    let requiredLength = 3;
    let timerInterval = null;
    let user = null;
    let gameActive = false;

    // Badge lock (if you earn badge but haven't claimed)
    let unclaimedBadge = localStorage.getItem("unclaimedBadge") || null;

    // Badge milestones (exact list you asked for)
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

    // small helper for random letter
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

    // General overlay helper; options.hideClose true hides close button
    function openOverlay(title, html, options = {}) {
      overlayTitle.textContent = title;
      overlayBody.innerHTML = html;
      overlay.style.display = "flex";
      overlay.setAttribute("aria-hidden", "false");

      // hide/ show close button depending on overlay type
      const closeBtn = document.getElementById("overlay-close");
      if (closeBtn) {
        closeBtn.style.display = options.hideClose ? "none" : "block";
      }

      // whenever an overlay opens we stop the game (so user has to restart afterwards)
      if (gameActive) {
        // ensure we don't recursively call endGame which opens overlay again
        clearInterval(timerInterval);
        gameActive = false;
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
          finishGame();
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

    function finishGame() {
      // Called when timer hits 0 or the user opens overlays; shows the Game Over UI
      if (!gameActive) {
        // if gameActive is already false, still show game over overlay (needed when overlay opens mid-game)
        openGameOverOverlay();
        return;
      }
      gameActive = false;
      clearInterval(timerInterval);
      openGameOverOverlay();
    }

    function openGameOverOverlay() {
      sounds.gameover.play();
      openOverlay(
        "Game Over",
        `
        <p>Your final score: <strong>${score}</strong></p>
        <div style="display:flex;gap:10px;justify-content:center;margin-top:10px;">
          <button id="restart-btn">Start New Game</button>
          <button id="share-btn">Share Score</button>
        </div>
      `,
        { hideClose: true }
      );

      // attach listeners after overlay renders
      setTimeout(() => {
        const restartBtn = document.getElementById("restart-btn");
        const shareBtn = document.getElementById("share-btn");

        if (restartBtn) {
          restartBtn.addEventListener("click", () => {
            closeOverlayFn();
            startNewGame();
          });
        }

        if (shareBtn) {
          shareBtn.addEventListener("click", () => {
            const shareText = `I just scored ${score} points on WRG ⚡ Can you beat me? https://farcaster.xyz/miniapps/D2ZcNcKqxucI/wrg`;
            const shareUrl = `https://warpcast.com/~/compose?text=${encodeURIComponent(shareText)}`;
            window.open(shareUrl, "_blank");
          });
        }
      }, 0);

      saveScore();
    }

    function startNewGame() {
      // block start if there's an unclaimed badge
      const pending = localStorage.getItem("unclaimedBadge");
      if (pending) {
        unclaimedBadge = pending;
        showUnclaimedBadgePopup();
        return;
      }

      score = 0;
      baseRoundTime = 40;
      requiredLength = 3;
      currentLetter = randomLetter();
      updateUI();
      gameActive = true;
      startTimer();
      wordInput.focus();
    }

    // verify user (from your backend)
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

    // ---------- Leaderboard (new style) ----------
    leaderboardBtn.addEventListener("click", async () => {
      openOverlay("Leaderboard", `<p>Loading leaderboard...</p>`, {});
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
            <div style="padding:10px;background:#dff3ff;margin-bottom:10px;border-radius:8px;">
              <strong>Your Rank:</strong> #${youRank || "Unranked"}<br/>
              <strong>Your Score:</strong> ${youPlayer.weekly_score ?? 0}<br/>
              <strong>Your Badge:</strong> ${youPlayer.badge_name || "Wood I"}
            </div>`;
        }

        // Build the top 100 list with the desired layout
        const list = top100
          .map((p, i) => {
            const rank = i + 1;
            const badgeName = p.badge_name || "Wood I";
            const badgeBase = badgeName.split(" ")[0].toLowerCase(); // wood, iron, bronze...
            const badgeImg = `/assets/${badgeBase}.png`; // all tiers share base image
            const pfp = p.pfp || "https://i.imgur.com/VH1KXQy.png";
            return `
              <div class="lb-card" style="display:flex;align-items:center;gap:12px;padding:8px;border-radius:8px;margin-bottom:6px;background:linear-gradient(90deg,#fff,#f6f9ff);">
                <div style="width:42px;text-align:center;font-weight:700;">${rank}</div>
                <img src="${pfp}" alt="${p.username}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;">
                <div style="flex:1;">
                  <div style="font-weight:700">@${p.username}</div>
                  <div style="font-size:12px;color:#666;">${badgeName}</div>
                </div>
                <img src="${badgeImg}" alt="${badgeName}" style="width:48px;height:48px;">
              </div>
            `;
          })
          .join("");

        overlayBody.innerHTML = `${youBox}<div>${list}</div>`;
      } catch (err) {
        overlayBody.innerHTML = `<p>Couldn't load leaderboard.</p>`;
      }
    });

    // Tasks overlay
    tasksBtn.addEventListener("click", () => {
      openOverlay("Tasks", `<ul>${Array.from({ length: 5 }, (_, i) => `<li>Task ${i + 1}: Coming soon...</li>`).join("")}</ul>`);
    });

    // How to play overlay
    howBtn.addEventListener("click", () => {
      openOverlay("How to Play", `<p>Type words starting with the shown letter.<br>Longer words = more points.<br>Each round shortens your time!<br>Reward pool coming soon!!</p>`);
    });

    // Profile (me) overlay: show player's stats (current)
    youBtn.addEventListener("click", async () => {
      openOverlay("Your Profile", "<p>Loading profile...</p>", {});
      try {
        const fid = localStorage.getItem("fid") || 1428061;
        const data = await verifyUser(fid);
        const weeklyScore = score;
        overlayBody.innerHTML = `
          <div class="you-profile" style="display:flex;gap:12px;align-items:center;">
            <img src="${data.pfp}" alt="${data.username}" style="width:64px;height:64px;border-radius:50%;">
            <div>
              <h3>@${data.username}</h3>
              <p><strong>Weekly Score:</strong> ${weeklyScore}</p>
              <p><strong>Total Score:</strong> ${data.total_score ?? 0}</p>
              <p><strong>Current Badge:</strong> ${data.badge_name || "Wood I"}</p>
            </div>
          </div>
        `;
        // If they earned a badge this session, show claim popup automatically (non-blocking here)
        await maybeTriggerBadgeCheck(weeklyScore, data);
      } catch {
        overlayBody.innerHTML = `<p>Couldn't load profile.</p>`;
      }
    });

    // overlay close
    overlayClose.addEventListener("click", closeOverlayFn);

    // submit (button)
    submitWord.addEventListener("click", async () => {
      if (!gameActive) return;
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

      score += w.length * 10; // each letter = 10 points
      feedbackEl.textContent = `✅ +${w.length * 10} points`;
      sounds.success.play();
      showInputSuccess();
      nextRound();
      wordInput.value = "";
    });

    // Enter key triggers submit
    wordInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        submitWord.click();
      }
    });

    function showInputError() {
      wordInput.classList.add("error");
      sounds.fail.play();
      setTimeout(() => wordInput.classList.remove("error"), 300);
    }

    function showInputSuccess() {
      wordInput.classList.add("success");
      setTimeout(() => wordInput.classList.remove("success"), 300);
    }

    async function verifyWord(word) {
      try {
        const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
        return res.ok;
      } catch {
        return false;
      }
    }

    // Called after a save or profile open to see if a badge is earned
    async function maybeTriggerBadgeCheck(weeklyScore, userObj) {
      const earned = badgeMilestones.filter((b) => weeklyScore >= b.score).pop();
      if (!earned) return;

      // store pending unclaimed badge locally and show popup
      unclaimedBadge = earned.badge;
      localStorage.setItem("unclaimedBadge", unclaimedBadge);
      showUnclaimedBadgePopup(userObj);
    }

    // Show claim popup and attempt Farcaster SDK transaction when user clicks claim
    function showUnclaimedBadgePopup(userObj) {
      const badgeBase = (unclaimedBadge || "Wood I").split(" ")[0].toLowerCase();
      const img = `/assets/${badgeBase}.png`;
      openOverlay(
        "🏅 Claim Your Badge",
        `
        <div style="text-align:center">
          <img src="${img}" style="width:120px;height:120px;border-radius:12px"><br>
          <h3>${unclaimedBadge}</h3>
          <p>You’ve earned a new badge! Claim it to continue playing.</p>
          <div style="display:flex;gap:10px;justify-content:center;margin-top:12px;">
            <button id="claim-btn">Claim (0.00001 ETH)</button>
            <button id="skip-claim-btn">Skip (keep badge unclaimed)</button>
          </div>
        </div>
      `,
        { hideClose: true }
      );

      // attach listeners
      setTimeout(() => {
        const claimBtn = document.getElementById("claim-btn");
        const skipBtn = document.getElementById("skip-claim-btn");

        if (claimBtn) {
          claimBtn.addEventListener("click", async () => {
            try {
              // ask backend to create tx payload for this claim
              // backend should return { to, value, data } where value is hex/decimal wei string
              const fid = userObj?.fid || localStorage.getItem("fid");
              const res = await fetch(`${API_BASE}/api/createBadgeTx`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  fid,
                  badge: unclaimedBadge,
                  price_eth: "0.00001" // friendly value, backend converts to wei
                }),
              });
              if (!res.ok) throw new Error("Failed to create transaction");
              const txPayload = await res.json(); // expected: { to, value, data }

              // try to send transaction via Farcaster SDK (several possible method names — we try common ones)
              await sendTxViaFarcasterSdk(txPayload);

              // if success, mark claimed on backend
              await fetch(`${API_BASE}/api/confirmBadgeClaim`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ fid, badge: unclaimedBadge }),
              });

              // play sound, clear pending, close overlay and let player continue
              sounds.badge.play();
              localStorage.removeItem("unclaimedBadge");
              unclaimedBadge = null;
              closeOverlayFn();
              alert("🎉 Badge claimed successfully!");
            } catch (err) {
              console.error("Claim failed:", err);
              alert("Claim failed: " + (err.message || err));
            }
          });
        }

        if (skipBtn) {
          skipBtn.addEventListener("click", () => {
            // leave it unclaimed; keep blocking start until claimed (you said it should block)
            // but we allow them to close overlay once — here we keep overlay open and remind
            alert("Badge not claimed. You will be prompted again next time.");
            closeOverlayFn();
          });
        }
      }, 0);
    }

    // Best-effort: try a few likely Farcaster SDK methods to send tx
    async function sendTxViaFarcasterSdk(tx) {
      // tx should be { to, value, data } ; value can be decimal string of wei
      // Try sdk.wallet.requestTransaction -> sdk.actions.requestTransaction -> Farcaster.wallet.sendTransaction
      if (window.sdk && window.sdk.wallet && typeof window.sdk.wallet.requestTransaction === "function") {
        return window.sdk.wallet.requestTransaction(tx);
      }
      if (window.sdk && window.sdk.actions && typeof window.sdk.actions.requestTransaction === "function") {
        return window.sdk.actions.requestTransaction(tx);
      }
      if (window.Farcaster && window.Farcaster.wallet && typeof window.Farcaster.wallet.sendTransaction === "function") {
        return window.Farcaster.wallet.sendTransaction(tx);
      }
      // If none available, fallback: open a confirmation UI that tells user to add the miniapp / use Farcaster
      throw new Error("Farcaster SDK transaction API not available in this environment.");
    }

    // On page load, if there's an unclaimed badge stored, show popup
    window.addEventListener("load", () => {
      const pending = localStorage.getItem("unclaimedBadge");
      if (pending) {
        unclaimedBadge = pending;
        // try to fetch current user info for claim; if not available just show popup
        const fid = localStorage.getItem("fid");
        if (fid) {
          verifyUser(fid)
            .then((u) => showUnclaimedBadgePopup(u))
            .catch(() => showUnclaimedBadgePopup(null));
        } else {
          showUnclaimedBadgePopup(null);
        }
      }

      // also check miniapp install and prompt if not installed (auto prompt)
      setTimeout(() => {
        try {
          if (window.sdk && window.sdk.actions && typeof window.sdk.actions.getInstallStatus === "function") {
            window.sdk.actions.getInstallStatus().then((s) => {
              if (!s?.installed) {
                // show a small overlay that asks user to add miniapp repeatedly (user asked to auto-prompt)
                openOverlay(
                  "Add WRG to Farcaster",
                  `<p>For best experience add WRG to your Farcaster home.</p><button id="add-miniapp-inline">Add WRG</button>`,
                  {}
                );
   