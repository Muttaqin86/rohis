import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const claimJuz = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.rpc("claim_next_juz", {
      _user_id: context.userId,
    });
    if (error) throw new Error(error.message);
    return data as {
      id: string;
      round_id: string;
      juz_number: number;
      status: string;
      started_at: string | null;
      finished_at: string | null;
    };
  });

export const startReading = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { assignmentId: string }) => input)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("juz_assignments")
      .update({ status: "dibaca", started_at: new Date().toISOString() })
      .eq("id", data.assignmentId)
      .eq("user_id", context.userId)
      .neq("status", "selesai");
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const finishJuz = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { assignmentId: string }) => input)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("juz_assignments")
      .update({ status: "selesai", finished_at: new Date().toISOString() })
      .eq("id", data.assignmentId)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export type BoardEntry = {
  juz_number: number;
  status: string;
  nama: string | null;
  isMine: boolean;
};

export const getBoard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data: rounds, error: roundErr } = await supabase
      .from("khatam_rounds")
      .select("id, nomor_putaran, status")
      .order("nomor_putaran", { ascending: false })
      .limit(1);
    if (roundErr) throw new Error(roundErr.message);
    const round = rounds?.[0] ?? null;

    const { data: mine, error: mineErr } = await supabase
      .from("juz_assignments")
      .select("id, juz_number, status, round_id, started_at, finished_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (mineErr) throw new Error(mineErr.message);

    const active = (mine ?? []).find((a) => a.status !== "selesai") ?? null;
    const selesai = (mine ?? []).filter((a) => a.status === "selesai");

    let board: BoardEntry[] = [];
    if (round) {
      const { data: rows, error: rowsErr } = await supabase
        .from("juz_assignments")
        .select("juz_number, status, user_id")
        .eq("round_id", round.id);
      if (rowsErr) throw new Error(rowsErr.message);

      const ids = [...new Set((rows ?? []).map((r) => r.user_id))];
      let names: Record<string, string> = {};
      if (ids.length) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, nama")
          .in("id", ids);
        names = Object.fromEntries((profiles ?? []).map((p) => [p.id, p.nama]));
      }

      board = Array.from({ length: 30 }, (_, i) => {
        const row = (rows ?? []).find((r) => r.juz_number === i + 1);
        return {
          juz_number: i + 1,
          status: row?.status ?? "kosong",
          nama: row ? (names[row.user_id] ?? "Karyawan") : null,
          isMine: row?.user_id === userId,
        };
      });
    }

    const { count: totalSelesai } = await supabase
      .from("juz_assignments")
      .select("id", { count: "exact", head: true })
      .eq("status", "selesai");

    return {
      round: round ? { nomor: round.nomor_putaran, status: round.status } : null,
      active,
      riwayat: selesai.map((s) => ({ juz_number: s.juz_number, finished_at: s.finished_at })),
      board,
      totalSelesai: totalSelesai ?? 0,
    };
  });
