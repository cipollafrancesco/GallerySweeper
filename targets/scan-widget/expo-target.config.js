/** @type {import('@bacons/apple-targets/app.plugin').Config} */
module.exports = {
    type: 'widget',
    name: 'ScanWidget',
    displayName: 'Duplicate Scan',
    // ActivityKit backs the Live Activity itself; WidgetKit/SwiftUI render it.
    frameworks: ['SwiftUI', 'WidgetKit', 'ActivityKit'],
    // ActivityKit's Activity/ActivityConfiguration APIs require iOS 16.1+.
    deploymentTarget: '16.1',
    bundleIdentifier: '.ScanWidget',
};
