import ActivityKit
import SwiftUI
import WidgetKit

/**
 * The `ScanWidget` extension's single entry point. GallerySweeper only ships a
 * Live Activity here (no home-screen timeline widget), so the bundle contains
 * just the one `Widget`.
 */
@main
struct ScanWidgetBundle: WidgetBundle {
    var body: some Widget {
        ScanLiveActivityWidget()
    }
}

struct ScanLiveActivityWidget: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: ScanActivityAttributes.self) { context in
            ScanLockScreenView(state: context.state)
                .activityBackgroundTint(Color.black)
                .activitySystemActionForegroundColor(Color.white)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    Image(systemName: "photo.on.rectangle.angled")
                        .foregroundStyle(.white)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Text(progressFractionText(context.state))
                        .font(.caption)
                        .foregroundStyle(.white)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    ScanProgressBar(state: context.state)
                }
            } compactLeading: {
                Image(systemName: "photo.on.rectangle.angled")
            } compactTrailing: {
                Text(progressPercentText(context.state))
                    .font(.caption2)
            } minimal: {
                Image(systemName: "photo.on.rectangle.angled")
            }
        }
    }
}

private func fractionComplete(_ state: ScanActivityAttributes.ContentState) -> Double {
    guard state.total > 0 else { return 0 }
    return min(1, Double(state.processed) / Double(state.total))
}

private func progressPercentText(_ state: ScanActivityAttributes.ContentState) -> String {
    "\(Int(fractionComplete(state) * 100))%"
}

private func progressFractionText(_ state: ScanActivityAttributes.ContentState) -> String {
    "\(state.processed)/\(max(state.total, state.processed))"
}

private func phaseLabel(_ phase: String) -> String {
    switch phase {
    case "collecting": return "Collecting photos…"
    case "hashing": return "Scanning for duplicates…"
    case "semantic": return "Checking similar shots…"
    case "grouping": return "Finishing up…"
    default: return "Scanning…"
    }
}

private struct ScanProgressBar: View {
    let state: ScanActivityAttributes.ContentState

    var body: some View {
        ProgressView(value: fractionComplete(state))
            .tint(.white)
    }
}

private struct ScanLockScreenView: View {
    let state: ScanActivityAttributes.ContentState

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: "photo.on.rectangle.angled")
                Text(phaseLabel(state.phase))
                    .font(.headline)
                Spacer()
                Text(progressPercentText(state))
                    .font(.subheadline.monospacedDigit())
            }
            ScanProgressBar(state: state)
            if state.groupsFound > 0 {
                Text("\(state.groupsFound) duplicate \(state.groupsFound == 1 ? "group" : "groups") found")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .padding()
        .foregroundStyle(.white)
    }
}
