import ActivityKit
import ExpoModulesCore

/**
 * Bridges ActivityKit to JS for the duplicate-scan progress Live Activity.
 * `ScanActivityAttributes` is defined in `targets/scan-widget/_shared/` — the
 * single canonical source, pulled into this pod's compilation via this pod's
 * podspec (see LiveActivity.podspec) so this module and the `ScanWidget`
 * extension target both compile the identical type, which ActivityKit
 * requires on both sides of the activity.
 *
 * Uses the original iOS 16.1 request/update/end API surface (not the
 * `ActivityContent`-wrapped variant introduced in 16.2) to match this
 * module's `:ios => '16.1'` deployment target exactly.
 */
public class LiveActivityModule: Module {
    private var activities: [String: Activity<ScanActivityAttributes>] = [:]

    public func definition() -> ModuleDefinition {
        Name("LiveActivity")

        Function("areActivitiesEnabled") { () -> Bool in
            guard #available(iOS 16.1, *) else { return false }
            return ActivityAuthorizationInfo().areActivitiesEnabled
        }

        // Starts a new activity and returns its id, which JS must hold onto to
        // target subsequent update()/end() calls.
        AsyncFunction("start") { (phase: String, processed: Int, total: Int, groupsFound: Int) -> String in
            guard #available(iOS 16.1, *) else {
                throw LiveActivityUnavailableException()
            }
            guard ActivityAuthorizationInfo().areActivitiesEnabled else {
                throw LiveActivityUnavailableException()
            }
            let state = ScanActivityAttributes.ContentState(
                phase: phase, processed: processed, total: total, groupsFound: groupsFound
            )
            let activity = try Activity<ScanActivityAttributes>.request(
                attributes: ScanActivityAttributes(),
                contentState: state,
                pushType: nil
            )
            self.activities[activity.id] = activity
            return activity.id
        }

        // No-ops (rather than throwing) for an unknown/already-ended id, so a
        // caller racing a checkpoint against an `end()` doesn't need to catch.
        AsyncFunction("update") { (id: String, phase: String, processed: Int, total: Int, groupsFound: Int) in
            guard #available(iOS 16.1, *), let activity = self.activities[id] else { return }
            let state = ScanActivityAttributes.ContentState(
                phase: phase, processed: processed, total: total, groupsFound: groupsFound
            )
            await activity.update(using: state)
        }

        AsyncFunction("end") { (id: String, phase: String, processed: Int, total: Int, groupsFound: Int) in
            guard #available(iOS 16.1, *), let activity = self.activities[id] else { return }
            let state = ScanActivityAttributes.ContentState(
                phase: phase, processed: processed, total: total, groupsFound: groupsFound
            )
            await activity.end(using: state, dismissalPolicy: .default)
            self.activities.removeValue(forKey: id)
        }
    }
}

private class LiveActivityUnavailableException: Exception {
    override var reason: String {
        "Live Activities are unavailable (iOS < 16.1, disabled by the user, or restricted by Focus/Low Power Mode)."
    }
}
