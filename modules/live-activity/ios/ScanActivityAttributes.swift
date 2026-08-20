import ActivityKit

/**
 * KEEP IN SYNC with `targets/scan-widget/_shared/ScanActivityAttributes.swift`.
 * This is a duplicate, not a shared reference: the `LiveActivity` CocoaPod
 * (this file) compiles into its own separate Xcode project (Pods/Pods.xcodeproj)
 * the traditional way, while the widget target uses Xcode 16's synchronized
 * folders — CocoaPods' `source_files` glob silently drops matches outside the
 * podspec's own directory, so a single cross-directory reference doesn't work.
 * ActivityKit doesn't require literal object identity, only that both compiled
 * copies are Swift source-compatible (same pattern as Apple's own Live Activity
 * sample code, which duplicates the attributes file across targets).
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
