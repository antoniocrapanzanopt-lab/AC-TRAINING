import { supabase } from '../lib/supabase';

async function postResult(data: Record<string, unknown>) {
  try {
    await fetch('/api/save-diagnosis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data, null, 2),
    });
  } catch (e) {
    console.error('[DEV DIAGNOSIS] Failed to post result:', e);
  }
}

export async function runDevDiagnosis(): Promise<void> {
  if (!import.meta.env.DEV) return;

  try {
    const { data: authData } = await supabase.auth.getSession();
    const session = authData?.session;
    const authUser = session?.user;

    const report: Record<string, unknown> = {
      timestamp: new Date().toISOString(),
      auth: {
        userId: authUser?.id,
        email: authUser?.email,
        role: session?.user?.role,
        aal: session?.user?.app_metadata?.aal,
        accessToken: session?.access_token,
      },
    };

    await postResult({ step: 'auth_ready', auth: report.auth });

    // Helper with timeout
    const withTimeout = async <T>(promiseLike: PromiseLike<T>, ms: number, label: string): Promise<T> => {
      return Promise.race([
        Promise.resolve(promiseLike),
        new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`Timeout ${ms}ms on ${label}`)), ms)),
      ]);
    };

    interface DiagnosticSession {
      id: string;
      athlete_id: string;
      workout_id: string;
      start_time: string;
      end_time: string | null;
      rpe: number | null;
      notes: string | null;
      week_number: number | null;
      day_name: string | null;
      status: string | null;
    }

    interface DiagnosticLog {
      id: string;
      session_id: string;
      exercise_id: string;
      set_number: number;
      reps_completed: number | null;
      weight_kg: number | null;
      notes: string | null;
    }

    let sessions: DiagnosticSession[] = [];
    let logs: DiagnosticLog[] = [];

    // 1. Fetch workout_sessions for Antonio Crapanzano
    const athleteId = '2f73ff0c-7340-4dd0-9844-3f3fbc6bd5cd';
    try {
      await postResult({ step: 'fetching_sessions_start' });
      const sessPromise = supabase
        .from('workout_sessions')
        .select('id, athlete_id, workout_id, start_time, end_time, rpe, notes, week_number, day_name, status')
        .eq('athlete_id', athleteId)
        .order('start_time', { ascending: false })
        .limit(20);
      
      const sessRes = await withTimeout(sessPromise, 30000, 'workout_sessions');
      sessions = (sessRes.data || []) as DiagnosticSession[];
      report.sessions = sessions;
      report.sessionsError = sessRes.error?.message || null;
      await postResult({ step: 'sessions_done', count: sessions.length, error: sessRes.error?.message, data: sessions });
    } catch (e: unknown) {
      report.sessionsException = String(e);
      await postResult({ step: 'sessions_exception', error: String(e) });
    }

    // 2. Fetch exercise_logs for the retrieved sessions
    const sessionIds = sessions.map((s) => s.id).filter(Boolean);
    try {
      await postResult({ step: 'fetching_logs_start', sessionIdsCount: sessionIds.length });
      if (sessionIds.length > 0) {
        const logsPromise = supabase
          .from('exercise_logs')
          .select('id, session_id, exercise_id, set_number, reps_completed, weight_kg, notes')
          .in('session_id', sessionIds);

        const logsRes = await withTimeout(logsPromise, 15000, 'exercise_logs');
        logs = (logsRes.data || []) as DiagnosticLog[];
        report.logs = logs;
        report.logsError = logsRes.error?.message || null;
        await postResult({
          step: 'logs_done',
          count: logs.length,
          error: logsRes.error?.message,
          data: logs,
        });
      } else {
        await postResult({ step: 'logs_done', count: 0, data: [] });
      }
    } catch (e: unknown) {
      report.logsException = String(e);
      await postResult({ step: 'logs_exception', error: String(e) });
    }

    // 3. Fetch workout_exercises for workout 39e9c00d-37d3-4bce-9994-3494a0bb3616
    try {
      const { data: exs, error: exErr } = await supabase
        .from('workout_exercises')
        .select('id, workout_id, name, day_name, week_number, sets, reps_target, target_weight')
        .eq('workout_id', '39e9c00d-37d3-4bce-9994-3494a0bb3616');

      await postResult({
        step: 'exercises_done',
        count: exs?.length || 0,
        error: exErr?.message,
        sample: exs?.slice(0, 5),
      });
    } catch (e: unknown) {
      await postResult({ step: 'exercises_exception', error: String(e) });
    }

    // 3. Fetch workout_exercises for any workout found
    const workoutIds = Array.from(new Set((sessions || []).map((s) => s.workout_id).filter(Boolean)));
    let exercises: unknown[] = [];
    if (workoutIds.length > 0) {
      const { data: exs, error: exErr } = await supabase
        .from('workout_exercises')
        .select('id, workout_id, name, day_name, week_number, sets, reps_target, target_weight, order_index')
        .in('workout_id', workoutIds);
      exercises = exs || [];
      report.exercisesError = exErr?.message || null;
    }
    report.workoutExercises = exercises;

    // 4. Per-session diagnosis
    const analysis = (sessions || []).map((s) => {
      const sessionLogs = (logs || []).filter((l) => l.session_id === s.id);
      const isCompleted = Boolean(s.end_time);
      const hasQuestionnaire = Boolean(s.notes || s.rpe);
      const isBuggy = isCompleted && hasQuestionnaire && sessionLogs.length === 0;

      return {
        sessionId: s.id,
        athleteId: s.athlete_id,
        workoutId: s.workout_id,
        weekNumber: s.week_number,
        dayName: s.day_name,
        startTime: s.start_time,
        endTime: s.end_time,
        rpe: s.rpe,
        notes: s.notes,
        status: s.status,
        logsCount: sessionLogs.length,
        logs: sessionLogs,
        isBuggy,
      };
    });

    report.analysis = analysis;
    report.buggySessions = analysis.filter((a) => a.isBuggy);

    // 5. Check orphaned logs
    const sessionIdsSet = new Set((sessions || []).map((s) => s.id));
    report.orphanedLogs = (logs || []).filter((l) => !sessionIdsSet.has(l.session_id));

    // 6. Check localStorage backup
    report.localCompletedSessionLogs = localStorage.getItem('builder_completed_session_logs');
    report.localSessionsBackup = localStorage.getItem('builder_local_sessions_backup');
    report.localLogsBackup = localStorage.getItem('builder_local_logs_backup');

    await postResult(report);
    console.log('[DEV DIAGNOSIS] Diagnostic report posted successfully!');
  } catch (err: unknown) {
    console.error('[DEV DIAGNOSIS] Exception:', err);
    await postResult({ error: String(err), timestamp: new Date().toISOString() });
  }
}
