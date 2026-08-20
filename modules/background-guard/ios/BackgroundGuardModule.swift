import ExpoModulesCore

/**
 * Thin wrapper around UIApplication's finite-length background task API
 * (`beginBackgroundTask(withName:expirationHandler:)`). Used to keep the
 * duplicate-scan pipeline's JS loop alive for the brief window (commonly
 * ~30s, never guaranteed) iOS grants after the app is backgrounded, so a
 * scan in progress can checkpoint cleanly instead of freezing mid-hash. This
 * is NOT real background execution — see `expo-background-task` for the
 * opportunistic long-running path used to resume an interrupted scan later.
 */
public class BackgroundGuardModule: Module {
  // Keyed by the same Int value as the UIBackgroundTaskIdentifier's rawValue,
  // so JS can round-trip a plain number without any UIKit type crossing the bridge.
  private var activeTasks: [Int: UIBackgroundTaskIdentifier] = [:]

  public func definition() -> ModuleDefinition {
    Name("BackgroundGuard")

    Events("onExpiration")

    // Begins a finite-length background task and returns its identifier, or 0
    // if the system refused the request (e.g. background time is already
    // exhausted). The standard "declare a var, assign it inside the call whose
    // own trailing closure captures it" idiom — the expiration handler only
    // ever fires after `beginBackgroundTask` has returned and `identifier` is set.
    Function("beginTask") { () -> Int in
      var identifier: UIBackgroundTaskIdentifier = .invalid
      identifier = UIApplication.shared.beginBackgroundTask(withName: "duplicates-scan-checkpoint") { [weak self] in
        // iOS is about to suspend/terminate the app. Notify JS so it can
        // persist a checkpoint, then end the task ourselves — failing to call
        // endBackgroundTask here gets the app force-terminated rather than
        // just suspended.
        guard let self else { return }
        let handle = identifier.rawValue
        self.sendEvent("onExpiration", ["id": handle])
        self.endTaskInternal(handle)
      }
      guard identifier != .invalid else { return 0 }
      activeTasks[identifier.rawValue] = identifier
      return identifier.rawValue
    }

    // Ends a previously-begun background task. Safe to call with an id that
    // was already ended (e.g. by the expiration handler) — it's a no-op.
    Function("endTask") { (id: Int) in
      self.endTaskInternal(id)
    }
  }

  private func endTaskInternal(_ id: Int) {
    guard let identifier = activeTasks[id] else { return }
    activeTasks.removeValue(forKey: id)
    UIApplication.shared.endBackgroundTask(identifier)
  }
}
