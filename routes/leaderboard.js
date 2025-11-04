
const API_BASE = "https://your-backend-url.onrender.com/api"; // ← change to your Render backend URL

// Helper: Format rank number with suffix (1st, 2nd, 3rd, etc.)
function rankSuffix(rank) {
  const j = rank % 10,
    k = rank % 100;
  if (j === 1 && k !== 11) return `${rank}st`;
  if (j === 2 && k !== 12) return `${rank}nd`;
  if (j === 3 && k !== 13) return `${rank}rd`;
  return `${rank}th`;
}
ll
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

// Display leaderboard
function displayLeaderboard(players) {
  const container = document.getElementById("leaderboard");
  container.innerHTML = "";

  if (!players.length) {
    container.innerHTML = "<p>No players yet 😔</p>";
    return;
  }

  players.forEach((player, index) => {
    const rank = index + 1;
    const rankLabel = rankSuffix(rank);
    const card = document.createElement("div");
    card.className = "player-card";

    card.innerHTML = `
      <div class="player-rank">${rankLabel}</div>
      <img src="${player.pfp || 'default-pfp.png'}" alt="${player.username}" class="player-pfp">
      <div class="player-info">
        <h3>@${player.username}</h3>
        <p>Weekly Score: <strong>${player.weekly_score ?? 0}</strong></p>
        <p>Total Score: ${player.total_score ?? 0}</p>
      </div>
    `;

    container.appendChild(card);
  });
}

// Fetch and show player’s personal rank
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

// Show “days left till reset” countdown
function showCountdown() {
  const now = new Date();
  const nextMonday = new Date();
  nextMonday.setUTCHours(0, 0, 0, 0);
  nextMonday.setUTCDate(now.getUTCDate() + ((8 - now.getUTCDay()) % 7 || 7));

  const diffDays = Math.ceil((nextMonday - now) / (1000 * 60 * 60 * 24));
  document.getElementById("reset-countdown").innerText =
    `⏳ ${diffDays} day${diffDays > 1 ? "s" : ""} left till leaderboard reset`;
}

// Initialize
window.addEventListener("DOMContentLoaded", () => {
  fetchLeaderboard();
  showCountdown();

  // If you have the logged-in user’s FID saved (example from your game logic)
  const fid = localStorage.getItem("fid");
  if (fid) fetchMyRank(fid);
});
