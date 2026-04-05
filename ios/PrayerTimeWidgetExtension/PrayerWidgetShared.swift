import SwiftUI
import WidgetKit

// MARK: - App Group (must match PrayerWidgetModule.swift)

enum SazdaWidgetAppGroup {
  static let id = "group.org.reactjs.native.example.Sazda"
  static let snapshotKey = "sazda_prayer_widget_snapshot_v1"
}

// MARK: - Theme

enum SazdaWidgetPalette {
  static let cream = Color(red: 0.99, green: 0.98, blue: 0.89)
  static let ink = Color(red: 0.10, green: 0.11, blue: 0.06)
  static let muted = Color(red: 0.25, green: 0.29, blue: 0.27)
  static let accentGreen = Color(red: 0.0, green: 0.21, blue: 0.15)
  static let highlightGreen = Color(red: 0.05, green: 0.28, blue: 0.18)
  static let capsuleIdle = Color(red: 0.94, green: 0.92, blue: 0.82)
  static let makruhTint = Color(red: 0.72, green: 0.35, blue: 0.12)
}

struct PrayerScheduleItem: Equatable {
  let name: String
  let time12: String
}

struct PrayerWidgetPayload: Equatable {
  let title: String
  let subtitle: String
  let countdownLabelMin: String
  let mode: String
  let makruhVariant: String?
  let periodNote: String?
  let highlight: String?
  let dateKey: String
  let schedule: [PrayerScheduleItem]
}

struct PrayerPayloadEntry: TimelineEntry {
  let date: Date
  let payload: PrayerWidgetPayload
}

func loadPrayerPayload() -> PrayerWidgetPayload {
  guard let defaults = UserDefaults(suiteName: SazdaWidgetAppGroup.id),
    let raw = defaults.string(forKey: SazdaWidgetAppGroup.snapshotKey),
    let data = raw.data(using: .utf8),
    let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
  else {
    return PrayerWidgetPayload(
      title: "Sazda",
      subtitle: "Open the app on Home",
      countdownLabelMin: "to load prayer widget",
      mode: "between",
      makruhVariant: nil,
      periodNote: nil,
      highlight: nil,
      dateKey: "",
      schedule: [])
  }

  var schedule: [PrayerScheduleItem] = []
  if let arr = json["schedule"] as? [[String: Any]] {
    for o in arr {
      if let n = o["name"] as? String, let t = o["time12"] as? String {
        schedule.append(PrayerScheduleItem(name: n, time12: t))
      }
    }
  }

  return PrayerWidgetPayload(
    title: json["title"] as? String ?? "Prayer",
    subtitle: json["subtitle"] as? String ?? "",
    countdownLabelMin: json["countdownLabelMin"] as? String ?? "—",
    mode: json["mode"] as? String ?? "between",
    makruhVariant: json["makruhVariant"] as? String,
    periodNote: json["periodNote"] as? String,
    highlight: json["highlight"] as? String,
    dateKey: json["dateKey"] as? String ?? "",
    schedule: schedule)
}

struct PrayerPayloadTimelineProvider: TimelineProvider {
  func placeholder(in context: Context) -> PrayerPayloadEntry {
    let demo = PrayerWidgetPayload(
      title: "Now: Dhuhr",
      subtitle: "Next: Asr in 2h 10m",
      countdownLabelMin: "2h 10m",
      mode: "active",
      makruhVariant: nil,
      periodNote: nil,
      highlight: "Dhuhr",
      dateKey: "14-10-2025",
      schedule: [
        PrayerScheduleItem(name: "Fajr", time12: "5:12 AM"),
        PrayerScheduleItem(name: "Dhuhr", time12: "12:30 PM"),
        PrayerScheduleItem(name: "Asr", time12: "3:45 PM"),
        PrayerScheduleItem(name: "Maghrib", time12: "6:10 PM"),
        PrayerScheduleItem(name: "Isha", time12: "7:40 PM"),
      ])
    return PrayerPayloadEntry(date: Date(), payload: demo)
  }

  func getSnapshot(in context: Context, completion: @escaping (PrayerPayloadEntry) -> Void) {
    completion(PrayerPayloadEntry(date: Date(), payload: loadPrayerPayload()))
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<PrayerPayloadEntry>) -> Void) {
    let entry = PrayerPayloadEntry(date: Date(), payload: loadPrayerPayload())
    let refresh = Calendar.current.date(byAdding: .minute, value: 15, to: Date()) ?? Date().addingTimeInterval(900)
    completion(Timeline(entries: [entry], policy: .after(refresh)))
  }
}

// MARK: - Layout helpers

func formattedWidgetHeaderDate(dateKey: String, fallback: Date) -> String {
  let parts = dateKey.split(separator: "-").map(String.init)
  guard parts.count == 3,
    let d = Int(parts[0]), let m = Int(parts[1]), let y = Int(parts[2])
  else {
    return fallback.formatted(.dateTime.weekday(.wide).day().month(.abbreviated))
  }
  let c = Calendar.current
  var dc = DateComponents()
  dc.day = d
  dc.month = m
  dc.year = y
  guard let date = c.date(from: dc) else {
    return fallback.formatted(.dateTime.weekday(.wide).day().month(.abbreviated))
  }
  return date.formatted(.dateTime.weekday(.wide).day().month(.abbreviated))
}

extension Image {
  static func prayerIcon(for name: String) -> Image {
    switch name {
    case "Fajr": return Image(systemName: "sun.horizon.fill")
    case "Dhuhr": return Image(systemName: "sun.max.fill")
    case "Asr": return Image(systemName: "sun.min.fill")
    case "Maghrib": return Image(systemName: "sunset.fill")
    case "Isha": return Image(systemName: "moon.stars.fill")
    default: return Image(systemName: "clock.fill")
    }
  }
}

extension View {
  /// Fills the widget to the system rounded rect (fixes the default light “ring” around content on iOS 17+).
  @ViewBuilder
  func sazdaWidgetFullBleedBackground(_ color: Color) -> some View {
    if #available(iOSApplicationExtension 17.0, *) {
      self.containerBackground(for: .widget) { color }
    } else {
      self.background(color)
    }
  }
}
