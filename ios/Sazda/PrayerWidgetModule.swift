import Foundation

#if canImport(WidgetKit)
import WidgetKit
#endif

@objc(PrayerWidgetModule)
class PrayerWidgetModule: NSObject {

  @objc static func requiresMainQueueSetup() -> Bool {
    true
  }

  /// Same App Group as `PrayerTimeWidgetExtension` (Xcode target) — required for home screen widgets to read data.
  private let appGroupId = "group.org.reactjs.native.example.Sazda"
  private let snapshotKey = "sazda_prayer_widget_snapshot_v1"

  @objc func setSnapshot(_ json: String) {
    guard let defaults = UserDefaults(suiteName: appGroupId) else {
      UserDefaults.standard.set(json, forKey: snapshotKey)
      return
    }
    defaults.set(json, forKey: snapshotKey)
    defaults.set(Date().timeIntervalSince1970, forKey: "sazda_prayer_widget_updated_at")
    #if canImport(WidgetKit)
    if #available(iOS 14.0, *) {
      WidgetCenter.shared.reloadAllTimelines()
    }
    #endif
  }
}
