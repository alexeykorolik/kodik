// Solving modes on the server (docs/adaptive/MODE_MODEL.md). The rules themselves come from the
// shared TypeScript source bundled into .runner/adaptive.mjs, so client and server cannot drift.
import { randomUUID } from "node:crypto";
import * as shared from "../../.runner/adaptive.mjs";

export const adaptive = shared;
const now = () => new Date().toISOString();

export function createModes({ db, own, teacher, fail, tx }) {
  const get = (sql, ...a) => db.prepare(sql).get(...a);
  const run = (sql, ...a) => db.prepare(sql).run(...a);

  /** Supported modes of a published version snapshot (object or JSON). */
  function supportedForSnapshot(snapshot) {
    const task = typeof snapshot === "string" ? JSON.parse(snapshot) : snapshot;
    return shared.supportedModes(shared.parseLearningConfig(task.learning_config ?? "{}"));
  }
  function versionOf(assignment) {
    const v = get("SELECT snapshot FROM task_versions WHERE id=? AND org_id=?", assignment.version_id, assignment.org_id);
    if (!v) fail(409, "У назначения нет опубликованной версии.");
    return JSON.parse(v.snapshot);
  }
  /** Explicit policy for a NEW assignment of this version, validated against what it supports. */
  function policyForNewAssignment(versionSnapshot, requested) {
    const supported = supportedForSnapshot(versionSnapshot);
    if (requested === undefined || requested === null) return JSON.stringify(shared.defaultPolicy(supported));
    const checked = shared.validatePolicy(requested, supported);
    if (checked.error) fail(400, checked.error.message);
    return JSON.stringify(checked.policy);
  }
  function stateOf(assignmentId, userId) {
    return get("SELECT * FROM assignment_mode_state WHERE assignment_id=? AND user_id=?", assignmentId, userId) || null;
  }
  /** Effective rules for one learner in one assignment. */
  function effectiveFor(assignment, userId, versionSnapshot = versionOf(assignment)) {
    const supported = supportedForSnapshot(versionSnapshot);
    const policy = shared.storedPolicy(assignment.mode_policy, supported);
    const state = stateOf(assignment.id, userId);
    const override = state?.override ? JSON.parse(state.override) : null;
    const eff = shared.effectivePolicy(policy, override, state ? { mode: state.mode, offered: state.offered_mode } : null, supported);
    return { supported, policy, override, eff, state };
  }
  /** Server table of combinations; throws a 409 with a plain explanation. */
  function assertMode(action, mode, assignment, userId, versionSnapshot) {
    const { supported, eff } = effectiveFor(assignment, userId, versionSnapshot);
    const decision = shared.checkMode(action, mode, eff, supported);
    if (!decision.ok) fail(decision.status, decision.message, { code: decision.code, modes: publicModes(supported, eff) });
    return { supported, eff };
  }
  const publicModes = (supported, eff) => ({
    supported, allowed: eff.allowed, start: eff.start, switching: eff.switching, current: eff.current, offered: eff.offered,
  });
  function event(orgId, assignmentId, userId, actorId, kind, fromMode, toMode, reason = "", details = {}) {
    run("INSERT INTO mode_events VALUES(?,?,?,?,?,?,?,?,?,?,?)", randomUUID(), orgId, assignmentId, userId, actorId, kind, fromMode ?? null, toMode ?? null, String(reason).slice(0, 500), JSON.stringify(details), now());
  }
  function writeState(assignment, userId, actorId, patch) {
    const current = stateOf(assignment.id, userId);
    const next = { mode: current?.mode ?? null, offered_mode: current?.offered_mode ?? null, override: current?.override ?? null, ...patch };
    if (current) run("UPDATE assignment_mode_state SET mode=?,offered_mode=?,override=?,revision=revision+1,updated_at=?,updated_by=? WHERE assignment_id=? AND user_id=?", next.mode, next.offered_mode, next.override, now(), actorId, assignment.id, userId);
    else run("INSERT INTO assignment_mode_state(assignment_id,user_id,org_id,mode,offered_mode,override,revision,updated_at,updated_by) VALUES(?,?,?,?,?,?,1,?,?)", assignment.id, userId, assignment.org_id, next.mode, next.offered_mode, next.override, now(), actorId);
  }
  /** Learner must belong to the assignment's group (and the teacher's school). */
  function learnerOf(assignment, userId, u) {
    const learner = own("users", userId, u);
    if (learner.role !== "student") fail(400, "Режим настраивается ученику.");
    if (!get("SELECT 1 FROM group_members WHERE group_id=? AND user_id=?", assignment.group_id, learner.id)) fail(404, "Ученик не состоит в группе этого назначения.");
    return learner;
  }
  const reasonText = (r) => { if (r !== undefined && (typeof r !== "string" || r.length > 500)) fail(400, "Причина — до 500 символов."); return r || ""; };

  async function handle(path, method, b, u) {
    let m;
    // Learner: switch own mode (free switching, or accepting the teacher's offer).
    if ((m = /^\/api\/assignments\/([^/]+)\/mode$/.exec(path)) && method === "POST") {
      if (u.role !== "student") fail(403, "Режим выбирает ученик.");
      const assignment = own("assignments", m[1], u);
      if (assignment.archived || !get("SELECT 1 FROM group_members WHERE group_id=? AND user_id=?", assignment.group_id, u.id)) fail(404, "Назначение не найдено.");
      const { supported, eff, state } = effectiveFor(assignment, u.id);
      if (!shared.isMode(b.mode)) fail(400, "Укажите режим.");
      if (b.decline === true) {
        if (eff.offered !== b.mode) fail(409, "Предложение уже неактуально.");
        tx(() => { writeState(assignment, u.id, u.id, { offered_mode: null }); event(u.org_id, assignment.id, u.id, u.id, "offer_declined", eff.current, b.mode); });
        return { modes: publicModes(supported, effectiveFor(assignment, u.id).eff) };
      }
      if (b.mode === eff.current) return { modes: publicModes(supported, eff) };
      if (!shared.canSelfSwitch(eff, b.mode)) fail(409, eff.allowed.includes(b.mode) ? "Переход в этот режим открывает учитель." : "Учитель не открыл этот режим.", { code: "mode_switch_required", modes: publicModes(supported, eff) });
      const accepted = eff.offered === b.mode;
      tx(() => { writeState(assignment, u.id, u.id, { mode: b.mode, offered_mode: null }); event(u.org_id, assignment.id, u.id, u.id, accepted ? "offer_accepted" : "switched", eff.current, b.mode); });
      void state;
      return { modes: publicModes(supported, effectiveFor(assignment, u.id).eff) };
    }
    // Teacher: group policy of an assignment.
    if ((m = /^\/api\/assignments\/([^/]+)\/mode-policy$/.exec(path)) && method === "PUT") {
      teacher(u);
      const assignment = own("assignments", m[1], u);
      if (assignment.archived) fail(409, "Назначение снято.");
      const supported = supportedForSnapshot(versionOf(assignment));
      const checked = shared.validatePolicy({ allowed: b.allowed, start: b.start, switching: b.switching }, supported);
      if (checked.error) fail(400, checked.error.message);
      const before = shared.storedPolicy(assignment.mode_policy, supported);
      tx(() => {
        db.prepare("UPDATE assignments SET mode_policy=? WHERE id=?").run(JSON.stringify(checked.policy), assignment.id);
        event(u.org_id, assignment.id, null, u.id, "policy_changed", null, null, reasonText(b.reason), { before, after: checked.policy });
      });
      return { policy: checked.policy };
    }
    // Teacher: one learner — override, offer, or set the mode (applied when the learner next opens the task).
    if ((m = /^\/api\/assignments\/([^/]+)\/students\/([^/]+)\/mode$/.exec(path)) && method === "PUT") {
      teacher(u);
      const assignment = own("assignments", m[1], u);
      if (assignment.archived) fail(409, "Назначение снято.");
      const learner = learnerOf(assignment, m[2], u);
      const reason = reasonText(b.reason);
      const { supported, eff } = effectiveFor(assignment, learner.id);
      const actions = ["override", "offer", "set", "clear_override"].filter((k) => b[k] !== undefined);
      if (actions.length !== 1) fail(400, "Укажите одно действие: override, offer, set или clear_override.");
      tx(() => {
        if (b.override !== undefined) {
          const checked = shared.validatePolicy(b.override, supported, true);
          if (checked.error) fail(400, checked.error.message);
          const merged = { ...(effectiveFor(assignment, learner.id).override || {}), ...checked.policy };
          const allowed = merged.allowed ?? eff.allowed;
          if (merged.start && !allowed.includes(merged.start)) fail(400, "Стартовый режим должен быть среди разрешённых.");
          writeState(assignment, learner.id, u.id, { override: JSON.stringify(merged) });
          event(u.org_id, assignment.id, learner.id, u.id, "override_changed", null, null, reason, { override: merged });
        } else if (b.clear_override === true) {
          writeState(assignment, learner.id, u.id, { override: null });
          event(u.org_id, assignment.id, learner.id, u.id, "override_changed", null, null, reason, { override: null });
        } else if (b.offer !== undefined) {
          if (!shared.isMode(b.offer) || !eff.allowed.includes(b.offer)) fail(400, "Предложить можно только разрешённый режим.");
          if (b.offer === eff.current) fail(409, "Ученик уже в этом режиме.");
          writeState(assignment, learner.id, u.id, { offered_mode: b.offer });
          event(u.org_id, assignment.id, learner.id, u.id, "offered", eff.current, b.offer, reason);
        } else {
          if (!shared.isMode(b.set) || !eff.allowed.includes(b.set)) fail(400, "Перевести можно только в разрешённый режим.");
          writeState(assignment, learner.id, u.id, { mode: b.set, offered_mode: null });
          event(u.org_id, assignment.id, learner.id, u.id, "teacher_set", eff.current, b.set, reason);
        }
      });
      return { modes: publicModes(supported, effectiveFor(assignment, learner.id).eff) };
    }
    // Teacher: per-learner overview of one assignment (current mode, last results, events).
    if ((m = /^\/api\/assignments\/([^/]+)\/modes$/.exec(path)) && method === "GET") {
      teacher(u);
      const assignment = own("assignments", m[1], u);
      const version = versionOf(assignment);
      const supported = supportedForSnapshot(version);
      const learners = db.prepare("SELECT u.id,u.name FROM group_members gm JOIN users u ON u.id=gm.user_id WHERE gm.group_id=? AND u.org_id=? AND u.role='student' ORDER BY u.name").all(assignment.group_id, u.org_id);
      return {
        policy: shared.storedPolicy(assignment.mode_policy, supported), supported,
        learners: learners.map((l) => {
          const { eff, override } = effectiveFor(assignment, l.id, version);
          const last = db.prepare("SELECT mode,status,created_at FROM attempts WHERE assignment_id=? AND user_id=? ORDER BY created_at DESC LIMIT 3").all(assignment.id, l.id);
          return { id: l.id, name: l.name, modes: publicModes(supported, eff), override, last };
        }),
        events: db.prepare("SELECT kind,user_id,actor_id,from_mode,to_mode,reason,created_at FROM mode_events WHERE org_id=? AND assignment_id=? ORDER BY created_at DESC LIMIT 100").all(u.org_id, assignment.id),
      };
    }
    return undefined;
  }
  return { handle, supportedForSnapshot, policyForNewAssignment, effectiveFor, assertMode, publicModes, versionOf };
}
