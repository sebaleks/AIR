import type { IngestContextEventInput } from "../context/types.ts";

export type UserResponse = "yes" | "no" | "timeout";

export const RUNNING_LATE_CUE = "Running 5 min late. Text Alex?";
export const TEXTED_CONFIRMATION_CUE = "Texted Alex.";
export const PREAPPROVAL_GRANT_CUE = "Don't ask again for Alex?";

/**
 * Flow 3 — Consentful Action seed event.
 * Detects the user is running ~5 min late to a calendar event with Alex.
 * Salience tuned to land in the 0.70–0.90 (ask_permission) band per
 * docs/policy-rules.md §3.
 */
export function runningLateEvent(nowIso: string): IngestContextEventInput {
  return {
    kind: "calendar_event_upcoming",
    source: "calendar",
    timestamp: nowIso,
    payload: {
      event: "3pm sync with Alex",
      attendees: ["Alex"],
      minutes_to_event: -5,
      // Salience signals tuned for ask_permission band.
      minutes_to_departure: 5,
      user_value: 0.90,
      annoyance_cost: 0.10,
      reversibility: 0.4,
    },
    confidence: 0.95,
    privacy_risk: 0.15,
  };
}

/**
 * Synthetic event representing the user's confirmation. This carries
 * preapproved=true and saturated salience so the policy pipeline routes
 * it to execute_preapproved.
 */
export function userConfirmedSendEvent(nowIso: string): IngestContextEventInput {
  return {
    kind: "user_confirmed_action",
    source: "user_input",
    timestamp: nowIso,
    payload: {
      action_template: "send_message_running_late",
      recipients: ["Alex"],
      preapproved: true,
      // Saturated signals → composite total reaches 0.90 (execute band).
      minutes_to_departure: 0,
      user_value: 1,
      annoyance_cost: 0,
      reversibility: 1,
    },
    confidence: 1,
    privacy_risk: 0,
  };
}

/**
 * Allowlist of action templates that may ever be silently executed
 * via execute_preapproved. Anything not on this list always requires
 * an ask_permission gate. See docs/flow-consentful-action.md §3.
 */
export const ACTION_TEMPLATE_ALLOWLIST = [
  "send_message_running_late",
  "send_message_on_my_way",
  "set_reminder_for_event",
  "open_route_to_destination",
  "enable_focus_mode",
] as const;

export type ActionTemplate = (typeof ACTION_TEMPLATE_ALLOWLIST)[number];
