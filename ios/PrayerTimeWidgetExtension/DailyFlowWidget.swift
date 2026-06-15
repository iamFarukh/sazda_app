import SwiftUI
import WidgetKit

/// Medium widget: five daily salāh in a row (Daily Flow), with active highlight and calm status guidance.
struct DailyFlowWidgetEntryView: View {
  var entry: PrayerPayloadEntry

  private var p: PrayerWidgetPayload { entry.payload }
  private let cream = SazdaWidgetPalette.cream
  private let ink = SazdaWidgetPalette.ink
  private let muted = SazdaWidgetPalette.muted

  var body: some View {
    VStack(alignment: .leading, spacing: 0) {
      HStack(alignment: .top) {
        VStack(alignment: .leading, spacing: 2) {
          // Replaced the static clock with a title because Text(Date(), style: .time) freezes in WidgetKit
          Text("Daily Flow")
            .font(.title3)
            .fontWeight(.heavy)
            .foregroundColor(SazdaWidgetPalette.highlightGreen)

          if p.isStale, let stale = p.staleLabel, !stale.isEmpty {
            Text(stale)
              .font(.caption2)
              .fontWeight(.medium)
              .foregroundColor(muted.opacity(0.9))
              .lineLimit(1)
          } else if !p.schedule.isEmpty, dailyFlowStatusKind != .empty {
            dailyFlowStatusInline
          }
        }
        Spacer(minLength: 4)
        VStack(alignment: .trailing, spacing: 1) {
          WidgetCalendarHeading(font: .caption, fontWeight: .semibold, foreground: muted)
          if let city = p.city, !city.isEmpty {
            Text(city)
              .font(.caption2)
              .fontWeight(.semibold)
              .foregroundColor(muted.opacity(0.95))
              .lineLimit(1)
          }
        }
      }
      .padding(.bottom, 6)

      Spacer(minLength: 2)

      fivePrayerRow
    }
    .padding(.horizontal, 12)
    .padding(.top, 11)
    .padding(.bottom, 10)
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    .sazdaWidgetFullBleedBackground(cream)
  }

  // MARK: - Status (inline under title; no boxed banner)

  private enum DailyFlowStatusKind {
    case empty
    case makruh
    case active
    case preNext
    case fallback
  }

  private var dailyFlowStatusKind: DailyFlowStatusKind {
    if p.schedule.isEmpty { return .empty }
    switch p.mode {
    case "makruh": return .makruh
    case "active": return .active
    case "between", "night": return .preNext
    default:
      if !p.title.isEmpty || !p.subtitle.isEmpty { return .fallback }
      return .empty
    }
  }

  /// Next salāh name for copy (timeline `nextName`, else parse "Next: Name" from title).
  private var resolvedNextPrayerName: String {
    let trimmed = p.nextName.trimmingCharacters(in: .whitespacesAndNewlines)
    if !trimmed.isEmpty { return trimmed }
    let t = p.title.trimmingCharacters(in: .whitespacesAndNewlines)
    if t.lowercased().hasPrefix("next:") {
      return String(t.dropFirst(5)).trimmingCharacters(in: .whitespacesAndNewlines)
    }
    return "Prayer"
  }

  private var resolvedActivePrayerName: String {
    if let h = p.highlight?.trimmingCharacters(in: .whitespacesAndNewlines), !h.isEmpty { return h }
    let t = p.title.trimmingCharacters(in: .whitespacesAndNewlines)
    if t.lowercased().hasPrefix("now:") {
      return String(t.dropFirst(4)).trimmingCharacters(in: .whitespacesAndNewlines)
    }
    return t.isEmpty ? "Prayer" : t
  }

  private var countdownPhrase: String {
    let c = p.countdownLabelMin.trimmingCharacters(in: .whitespacesAndNewlines)
    return c.isEmpty ? "—" : c
  }

  private var statusPrimaryText: String {
    switch dailyFlowStatusKind {
    case .makruh: return "MAKRUH"
    case .active: return "Now: \(PrayerUiCopy.displayName(forCanonical: resolvedActivePrayerName))"
    case .preNext: return "Next: \(PrayerUiCopy.displayName(forCanonical: resolvedNextPrayerName))"
    case .fallback: return p.title.isEmpty ? "Prayer" : PrayerUiCopy.widgetLine(p.title)
    case .empty: return ""
    }
  }

  private var targetDate: Date {
    entry.date.addingTimeInterval(p.countdownToNextMs / 1000.0)
  }

  @ViewBuilder
  private var statusSecondaryView: some View {
    switch dailyFlowStatusKind {
    case .makruh:
      (Text("Next: \(PrayerUiCopy.displayName(forCanonical: resolvedNextPrayerName)) in ")
        + Text(targetDate, style: .timer))
    case .active:
      (Text("Ends in ") + Text(targetDate, style: .timer))
    case .preNext:
      (Text("In ") + Text(targetDate, style: .timer))
    case .fallback:
      if !p.subtitle.isEmpty {
        Text(PrayerUiCopy.widgetLine(p.subtitle))
      } else {
        EmptyView()
      }
    case .empty:
      EmptyView()
    }
  }

  private var statusPrimaryInk: Color {
    switch dailyFlowStatusKind {
    case .makruh: return SazdaWidgetPalette.makruhLightRed
    case .active: return SazdaWidgetPalette.highlightGreen
    case .preNext, .fallback: return ink
    case .empty: return .clear
    }
  }

  private var statusSecondaryInk: Color {
    switch dailyFlowStatusKind {
    case .makruh, .preNext, .fallback: return muted
    case .active: return muted.opacity(0.95)
    case .empty: return .clear
    }
  }

  private var dailyFlowStatusInline: some View {
    VStack(alignment: .leading, spacing: 1) {
      Text(statusPrimaryText)
        .font(.system(size: 11, weight: .heavy))
        .foregroundColor(statusPrimaryInk)
        .lineLimit(1)
        .minimumScaleFactor(0.8)
      if dailyFlowStatusKind != .empty {
        statusSecondaryView
          .font(.system(size: 11, weight: .semibold))
          .foregroundColor(statusSecondaryInk)
          .lineLimit(1)
          .minimumScaleFactor(0.8)
      }
    }
    .frame(maxWidth: .infinity, alignment: .leading)
  }

  @ViewBuilder
  private var fivePrayerRow: some View {
    let items = normalizedFiveSchedule(from: p.schedule)
    HStack(spacing: 4) {
      ForEach(items, id: \.name) { item in
        dailyFlowCapsule(item: item)
      }
    }
    .frame(maxHeight: .infinity, alignment: .center)
    .padding(.bottom, 1)
  }

  private func normalizedFiveSchedule(from schedule: [PrayerScheduleItem]) -> [PrayerScheduleItem] {
    let order = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"]
    var byName: [String: PrayerScheduleItem] = [:]
    for row in schedule { byName[row.name] = row }
    return order.compactMap { byName[$0] ?? PrayerScheduleItem(name: $0, time12: "—") }
  }

  private func dailyFlowCapsule(item: PrayerScheduleItem) -> some View {
    let isHighlight = p.mode == "active" && p.highlight == item.name
    let fg: Color = isHighlight ? .white : ink
    let iconFg: Color = isHighlight ? .white.opacity(0.95) : muted
    let bg: Color = isHighlight ? SazdaWidgetPalette.highlightGreen : SazdaWidgetPalette.capsuleIdle

    return VStack(spacing: 3) {
      Image.prayerIcon(for: item.name)
        .font(.system(size: 13, weight: .semibold))
        .foregroundColor(iconFg)
      Text(PrayerUiCopy.displayName(forCanonical: item.name).uppercased())
        .font(.system(size: 10, weight: .heavy))
        .foregroundColor(fg)
        .lineLimit(1)
        .minimumScaleFactor(0.75)
      Text(item.time12)
        .font(.system(size: 9, weight: .semibold))
        .foregroundColor(isHighlight ? .white.opacity(0.92) : muted)
        .lineLimit(1)
        .minimumScaleFactor(0.72)
    }
    .padding(.vertical, 6)
    .padding(.horizontal, 2)
    .frame(maxWidth: .infinity, maxHeight: .infinity)
    .background(bg)
    .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
    .shadow(color: isHighlight ? SazdaWidgetPalette.highlightGreen.opacity(0.35) : .clear, radius: 4, y: 1)
  }
}

struct DailyFlowWidget: Widget {
  let kind: String = "DailyFlowWidget"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: PrayerPayloadTimelineProvider()) { entry in
      DailyFlowWidgetEntryView(entry: entry)
    }
    .configurationDisplayName("Daily Flow")
    .description("All five salāh times with the current window highlighted. Makruh periods shown when active.")
    .supportedFamilies([.systemMedium])
  }
}
