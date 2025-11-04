import express from "express";
import { supabase } from "../supabaseClient.js";

const router = express.Router();

// 🏆 Check and assign badges
router.post("/check", async (req, res) => {
  const { fid } = req.body;

  try {
    const { data: player, error } = await supabase
      .from("players")
      .select("id, total_score")
      .eq("fid", fid)
      .single();

    if (error) throw error;
    if (!player) return res.status(404).json({ error: "Player not found" });

    const badgesToGive = [];
    if (player.total_score >= 100 && player.total_score < 500) badgesToGive.push("Bronze");
    if (player.total_score >= 500 && player.total_score < 1000) badgesToGive.push("Silver");
    if (player.total_score >= 1000) badgesToGive.push("Gold");

    for (const badgeName of badgesToGive) {
      await supabase.from("badges").upsert({
        player_id: player.id,
        name: badgeName,
      });
    }

    res.json({ success: true, badges: badgesToGive });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
