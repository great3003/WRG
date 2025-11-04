import express from "express";
import { supabase } from "../supabaseClient.js";

const router = express.Router();

// 🧠 Update player score
router.post("/update", async (req, res) => {
  const { fid, username, display_name, pfp_url, points } = req.body;

  try {
    const { data: player, error: fetchError } = await supabase
      .from("players")
      .select("*")
      .eq("fid", fid)
      .single();

    if (fetchError && fetchError.code !== "PGRST116") throw fetchError;

    let updated;
    if (player) {
      const { data, error } = await supabase
        .from("players")
        .update({
          username,
          display_name,
          pfp_url,
          total_score: player.total_score + points,
          weekly_score: player.weekly_score + points,
          last_played: new Date(),
        })
        .eq("fid", fid)
        .select()
        .single();
      updated = data;
      if (error) throw error;
    } else {
      const { data, error } = await supabase
        .from("players")
        .insert([
          {
            fid,
            username,
            display_name,
            pfp_url,
            total_score: points,
            weekly_score: points,
          },
        ])
        .select()
        .single();
      updated = data;
      if (error) throw error;
    }

    res.json({ success: true, player: updated });
  } catch (err) {
    console.error("Update error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
