const API_BASE = "https://wrg-backend.onrender.com"; // ← change this

// Helper: rank suffix (1st, 2nd, 3rd, etc.)
function rankSuffix(rank) {
  const j = rank % 10, k = rank % 100;
  if (j === 1 && k !== 11) return `${rank}st`;
  if (j === 2 && k !== 12) return `${rank}nd`;
  if (j === 3 && k !== 13) return `${rank}rd`;
  return `${rank}th`;
}

// Fetch leaderboard from backend
async function fetchLeaderboard() {
  try {
    const res = await fetch(`${API_BASE}/leaderboard`);
    if (!res.ok) throw new Error("Failed to load leaderboard");
    const players = await res.json();
    displayLeaderboard(players);
  } catch (err) {
    console.error("Leaderboard load error:", err);
    document.getElementById("leaderboard").innerHTML =
      `<p class="error">⚠️ Failed to load leaderboard.</p>`;
  }
}

// Display leaderboard (new WRG design)
function displayLeaderboard(players) {
  const container = document.getElementById("leaderboard");
  container.innerHTML = "";

  if (!players.length) {
    container.innerHTML = "<p>No players yet 😔</p>";
    return;
  }

  players.slice(0, 100).forEach((player, index) => {
    const rank = index + 1;
    const card = document.createElement("div");
    card.className = "player";

    // Top 3 highlight classes
    if (index === 0) card.classList.add("top-1");
    else if (index === 1) card.classList.add("top-2");
    else if (index === 2) card.classList.add("top-3");

    // Determine badge name & image (lowercase file)
    const badgeName = player.badge_name || "Wood I";
    const badgeImg = `/assets/${badgeName.toLowerCase().replace(/\s+/g, '')}.png`;

    card.innerHTML = `
      <div class="player-left">
        <span class="player-rank">${rank}.</span>
        <img src="${player.pfp || '/assets/default.png'}" class="player-img" alt="${player.username}">
        <span class="player-name">@${player.username || "Unknown"}</span>
      </div>
      <div class="divider"></div>
      <div class="player-right">
        <span class="badge-text">${badgeName}</span>
        <img src="${badgeImg}" class="badge-icon" alt="${badgeName}">
      </div>
    `;

    container.appendChild(card);
  });
}

// Fetch and show personal rank (optional)
async function fetchMyRank(fid) {
  try {
    const res = await fetch(`${API_BASE}/player/${fid}`);
    if (!res.ok) throw new Error("Failed to load player rank");
    const player = await res.json();

    const rankText = document.getElementById("my-rank");
    rankText.innerHTML = `
      <img src="${player.pfp}" class="me-pfp">
      <div>
        <h4>You: @${player.username}</h4>
        <p>Weekly Rank: ${player.rank ? rankSuffix(player.rank) : "Unranked"}</p>
        <p>Weekly Score: ${player.weekly_score ?? 0}</p>
      </div>
    `;
  } catch (err) {
    console.error("Player rank load error:", err);
  }
}

// Weekly reset countdown
function showCountdown() {
  const now = new Date();
  const nextMonday = new Date();
  nextMonday.setUTCHours(0, 0, 0, 0);
  nextMonday.setUTCDate(now.getUTCDate() + ((8 - now.getUTCDay()) % 7 || 7));

  const diffDays = Math.ceil((nextMonday - now) / (1000 * 60 * 60 * 24));
  document.getElementById("reset-countdown").innerText =
    `⏳ ${diffDays} day${diffDays > 1 ? "s" : ""} till reset`;
}

// Initialize
window.addEventListener("DOMContentLoaded", () => {
  fetchLeaderboard();
  showCountdown();

  const fid = localStorage.getItem("fid");
  if (fid) fetchMyRank(fid);
});
