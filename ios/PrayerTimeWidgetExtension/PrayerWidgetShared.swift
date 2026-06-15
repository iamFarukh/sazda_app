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
  /// Softer strip for Daily Flow (non-alarming Makruh guidance).
  static let makruhSoftFill = Color(red: 0.99, green: 0.96, blue: 0.90)
  static let makruhSoftInk = Color(red: 0.40, green: 0.30, blue: 0.20)
  /// Pastel light red for Daily Flow Makruh label (readable, not alarming).
  static let makruhLightRed = Color(red: 0.78, green: 0.38, blue: 0.40)
  static let prayerWindowSoftFill = Color(red: 0.92, green: 0.98, blue: 0.94)
  static let statusNeutralFill = Color(red: 0.95, green: 0.94, blue: 0.90)
}

// MARK: - User-visible copy (JSON keys stay `Dhuhr`)

enum PrayerUiCopy {
  static func displayName(forCanonical name: String) -> String {
    switch name {
    case "Dhuhr", "Dhuhar": return "Zohar"
    default: return name
    }
  }

  /// Canonical spellings in full phrases from the RN snapshot (e.g. "Now: Dhuhr", "Next: Dhuhr in …").
  static func widgetLine(_ line: String) -> String {
    line
      .replacingOccurrences(of: "Dhuhar", with: "Zohar")
      .replacingOccurrences(of: "Dhuhr", with: "Zohar")
  }
}

struct PrayerScheduleItem: Equatable {
  let name: String
  let time12: String
}

struct PrayerTimelineItem: Equatable {
  let atMs: Double
  let mode: String
  let makruhVariant: String?
  let title: String
  let subtitle: String
  let highlight: String?
  let nextName: String
  /// Milliseconds from entry.date to the next target (end of current prayer, or next prayer while waiting).
  let countdownToNextMs: Double
  let countdownLabelMin: String
  let periodNote: String?
}

struct PrayerWidgetPayload: Equatable {
  let title: String
  let subtitle: String
  /// Milliseconds until the next target for this state; enables live timer rendering in WidgetKit.
  let countdownToNextMs: Double
  let countdownLabelMin: String
  /// Next salāh after the current slot (from timeline); used for widget copy.
  let nextName: String
  let city: String?
  let isStale: Bool
  let staleLabel: String?
  let mode: String
  let makruhVariant: String?
  let periodNote: String?
  let highlight: String?
  let dateKey: String
  let schedule: [PrayerScheduleItem]
  let timeline: [PrayerTimelineItem]
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
      countdownToNextMs: 0,
      countdownLabelMin: "to load prayer widget",
      nextName: "",
      city: nil,
      isStale: false,
      staleLabel: nil,
      mode: "between",
      makruhVariant: nil,
      periodNote: nil,
      highlight: nil,
      dateKey: "",
      schedule: [],
      timeline: [])
  }

  var schedule: [PrayerScheduleItem] = []
  if let arr = json["schedule"] as? [[String: Any]] {
    for o in arr {
      if let n = o["name"] as? String, let t = o["time12"] as? String {
        schedule.append(PrayerScheduleItem(name: n, time12: t))
      }
    }
  }

  var timeline: [PrayerTimelineItem] = []
  if let arr = json["timeline"] as? [[String: Any]] {
    for o in arr {
      let atMs = o["atMs"] as? Double ?? 0
      if atMs <= 0 { continue }
      let mode = o["mode"] as? String ?? "between"
      let title = o["title"] as? String ?? "Prayer"
      let subtitle = o["subtitle"] as? String ?? ""
      let nextName = o["nextName"] as? String ?? "Fajr"
      let cdMs = o["countdownToNextMs"] as? Double ?? 0
      let cd = o["countdownLabelMin"] as? String ?? "—"
      let highlight = o["highlight"] as? String
      let mk = o["makruhVariant"] as? String
      let pn = o["periodNote"] as? String
      timeline.append(PrayerTimelineItem(
        atMs: atMs,
        mode: mode,
        makruhVariant: mk,
        title: title,
        subtitle: subtitle,
        highlight: highlight,
        nextName: nextName,
        countdownToNextMs: cdMs,
        countdownLabelMin: cd,
        periodNote: pn
      ))
    }
  }

  let city = json["city"] as? String
  let isStale = json["isStale"] as? Bool ?? false
  let staleLabel = json["staleLabel"] as? String

  let nextNameTop = json["nextName"] as? String ?? ""
  let cdMsTop = json["countdownToNextMs"] as? Double ?? 0

  return PrayerWidgetPayload(
    title: json["title"] as? String ?? "Prayer",
    subtitle: json["subtitle"] as? String ?? "",
    countdownToNextMs: cdMsTop,
    countdownLabelMin: json["countdownLabelMin"] as? String ?? "—",
    nextName: nextNameTop,
    city: city,
    isStale: isStale,
    staleLabel: staleLabel,
    mode: json["mode"] as? String ?? "between",
    makruhVariant: json["makruhVariant"] as? String,
    periodNote: json["periodNote"] as? String,
    highlight: json["highlight"] as? String,
    dateKey: json["dateKey"] as? String ?? "",
    schedule: schedule,
    timeline: timeline)
}

struct PrayerPayloadTimelineProvider: TimelineProvider {
  func placeholder(in context: Context) -> PrayerPayloadEntry {
    let demo = PrayerWidgetPayload(
      title: "Now: Zohar",
      subtitle: "Next: Asr in 2h 10m",
      countdownToNextMs: 2 * 60 * 60 * 1000 + 10 * 60 * 1000,
      countdownLabelMin: "2h 10m",
      nextName: "Asr",
      city: "Karachi",
      isStale: false,
      staleLabel: nil,
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
      ],
      timeline: [])
    return PrayerPayloadEntry(date: Date(), payload: demo)
  }

  func getSnapshot(in context: Context, completion: @escaping (PrayerPayloadEntry) -> Void) {
    completion(PrayerPayloadEntry(date: Date(), payload: loadPrayerPayload()))
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<PrayerPayloadEntry>) -> Void) {
    let base = loadPrayerPayload()
    if !base.timeline.isEmpty {
      var entries: [PrayerPayloadEntry] = []
      for t in base.timeline {
        let when = Date(timeIntervalSince1970: t.atMs / 1000.0)
        let p = PrayerWidgetPayload(
          title: t.title,
          subtitle: t.subtitle,
          countdownToNextMs: t.countdownToNextMs,
          countdownLabelMin: t.countdownLabelMin,
          nextName: t.nextName,
          city: base.city,
          isStale: base.isStale,
          staleLabel: base.staleLabel,
          mode: t.mode,
          makruhVariant: t.makruhVariant,
          periodNote: t.periodNote ?? base.periodNote,
          highlight: t.highlight,
          dateKey: base.dateKey,
          schedule: base.schedule,
          timeline: base.timeline
        )
        entries.append(PrayerPayloadEntry(date: when, payload: p))
      }
      // Always include a near-future refresh as a safety net.
      entries.sort { $0.date < $1.date }
      completion(Timeline(entries: entries, policy: .atEnd))
      return
    }

    // Fallback (legacy): refresh every 15 minutes.
    let entry = PrayerPayloadEntry(date: Date(), payload: base)
    let refresh = Calendar.current.date(byAdding: .minute, value: 15, to: Date()) ?? Date().addingTimeInterval(900)
    completion(Timeline(entries: [entry], policy: .after(refresh)))
  }
}

// MARK: - Layout helpers

/// Local weekday + calendar day that advances at **local midnight** without requiring a new
/// snapshot from the app (`dateKey` in shared data stays stale until the app opens).
struct WidgetCalendarHeading: View {
  @Environment(\.calendar) private var calendar

  var font: Font = .caption
  var fontWeight: Font.Weight = .regular
  var foreground: Color = SazdaWidgetPalette.muted

  var body: some View {
    let startOfToday = calendar.startOfDay(for: Date())
    TimelineView(.periodic(from: startOfToday, by: 86_400)) { context in
      Text(context.date.formatted(.dateTime.weekday(.wide).day().month(.abbreviated)))
        .font(font)
        .fontWeight(fontWeight)
        .foregroundColor(foreground)
        .lineLimit(1)
        .minimumScaleFactor(0.82)
    }
  }
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
