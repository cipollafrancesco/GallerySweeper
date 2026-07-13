require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))

Pod::Spec.new do |s|
  s.name           = 'LiveActivity'
  s.version        = package['version']
  s.summary        = package['description']
  s.description    = package['description']
  s.license        = package['license']
  s.author         = package['author']
  s.homepage       = 'https://github.com/expo/expo'
  s.platforms      = {
    # ActivityKit's Activity/ActivityAttributes APIs require iOS 16.1+.
    :ios => '16.1'
  }
  s.swift_version  = '5.9'
  s.source         = { git: 'https://github.com/expo/expo.git' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  # Swift/Objective-C compatibility
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }

  # ScanActivityAttributes.swift here is a synced duplicate of
  # targets/scan-widget/_shared/ScanActivityAttributes.swift — see that file's
  # header comment for why (CocoaPods' source_files glob can't reach outside
  # this pod's own directory into the widget target's synchronized folder).
  s.source_files = '**/*.{h,m,mm,swift}'
end
