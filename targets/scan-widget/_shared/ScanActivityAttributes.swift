import ActivityKit

/**
 * Lives in `_shared/` so `@bacons/apple-targets`' Xcode-16 synchronized-folder
 * linking compiles this exact file into both the main app target and the
 * `ScanWidget` extension target (which renders it on the Lock Screen / Dynamic
 * Island) — verified via the generated project's
 * PBXFileSystemSynchronizedBuildFileExceptionSet membership exceptions.
 *
 * KEEP IN SYNC with `modules/live-activity/ios/ScanActivityAttributes.swift`.
 * That second copy exists because the `LiveActivity` CocoaPod is a *separate*
 * Xcode project (Pods/Pods.xcodeproj) built the traditional (non-synchronized)
 * way — CocoaPods' `source_files` glob silently drops matches that resolve
 * outside the podspec's own directory tree, so a single cross-directory
 * reference from the pod back to this file doesn't work. ActivityKit doesn't
 * require literal object identity across the two compiled copies, only that
 * both are Swift source-compatible — this is the same "add to both targets"
 * pattern Apple's own Live Activity sample code uses, just achieved via two
 * synced files instead of one file with two target memberships (CocoaPods pods
 * can't participate in Xcode target-membership checkboxes at all).
 */
public struct ScanActivityAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        /// Mirrors `ScanPhase` from services/duplicates/types.ts: 'collecting' | 'hashing' | 'semantic' | 'grouping'.
        public var phase: String
        public var processed: Int
        public var total: Int
        public var groupsFound: Int

        public init(phase: String, processed: Int, total: Int, groupsFound: Int) {
            self.phase = phase
            self.processed = processed
            self.total = total
            self.groupsFound = groupsFound
        }
    }

    public init() {}
}
