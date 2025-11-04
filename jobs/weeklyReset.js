
import fetch from "node-fetch";

export async function resetWeeklyScores() {
  try {
    const url = `${process.env.SUPABASE_URL}/rest/v1/rpc/reset_weekly_scores`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        apikey: process.env.SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
      },
    });

    if (!res.ok) throw new Error(`Supabase error: ${res.statusText}`);
    console.log("✅ Weekly scores reset successfully");
  } catch (err) {
    console.error("❌ Failed to reset weekly scores:", err.message);
  }
}
