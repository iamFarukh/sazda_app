import SwiftUI
import WidgetKit

/// Large widget: readable list of today’s times, highlight, countdown, and Makruh note.
struct PrayerDayWidgetEntryView: View {
  var entry: PrayerPayloadEntry

  private var p: PrayerWidgetPayload { entry.payload }
  private let cream = SazdaWidgetPalette.cream
  private let ink = SazdaWidgetPalette.ink
  private let muted = SazdaWidgetPalette.muted

  var body: some View {
    let target = entry.date.addingTimeInterval(p.countdownToNextMs / 1000.0)
    VStack(alignment: .leading, spacing: 6) {
      HStack(alignment: .top) {
        VStack(alignment: .leading, spacing: 2) {
          Text("Today’s prayers")
            .font(.headline)
            .fontWeight(.heavy)
            .foregroundColor(SazdaWidgetPalette.highlightGreen)
            .lineLimit(1)
            .minimumScaleFactor(0.8)
          WidgetCalendarHeading(font: .caption, fontWeight: .regular, foreground: muted)
          if let city = p.city, !city.isEmpty {
            Text(city)
              .font(.caption2)
              .fontWeight(.semibold)
              .foregroundColor(muted.opacity(0.95))
              .lineLimit(1)
          }
        }
        Spacer(minLength: 4)
        VStack(alignment: .trailing, spacing: 2) {
          Text(
            p.nextName.isEmpty
              ? "Next in"
              : "Next: \(PrayerUiCopy.displayName(forCanonical: p.nextName))")
            .font(.caption2)
            .foregroundColor(muted)
            .lineLimit(1)
            .frame(maxWidth: .infinity, alignment: .trailing)
          // Live timer display (no widget reload required).
          Text(target, style: .timer)
            .font(.title3)
            .fontWeight(.bold)
            .foregroundColor(SazdaWidgetPalette.accentGreen)
            .multilineTextAlignment(.trailing)
            .frame(maxWidth: .infinity, alignment: .trailing)
        }
      }

      if p.mode == "makruh" {
        Text("⚠ \(PrayerUiCopy.widgetLine(p.title))")
          .font(.subheadline)
          .fontWeight(.bold)
          .foregroundColor(SazdaWidgetPalette.makruhTint)
          .padding(.top, 4)
      } else if !p.title.isEmpty {
        Text(PrayerUiCopy.widgetLine(p.title))
          .font(.subheadline)
          .fontWeight(.bold)
          .foregroundColor(ink)
          .padding(.top, 4)
      }

      if p.isStale, let stale = p.staleLabel, !stale.isEmpty {
        Text(stale)
          .font(.caption2)
          .fontWeight(.medium)
          .foregroundColor(muted.opacity(0.9))
          .lineLimit(1)
      }

      Spacer(minLength: 2)

      VStack(spacing: 0) {
        ForEach(Array(scheduleRows.enumerated()), id: \.element.name) { index, row in
          prayerRow(row)
          if index < scheduleRows.count - 1 {
            Divider().opacity(0.25)
          }
        }
      }
    }
    .padding(14)
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    .sazdaWidgetFullBleedBackground(cream)
  }

  private var scheduleRows: [PrayerScheduleItem] {
    let order = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"]
    var byName: [String: PrayerScheduleItem] = [:]
    for r in p.schedule { byName[r.name] = r }
    return order.compactMap { byName[$0] ?? PrayerScheduleItem(name: $0, time12: "—") }
  }

  private func prayerRow(_ row: PrayerScheduleItem) -> some View {
    let active = p.mode == "active" && p.highlight == row.name
    return HStack {
      Image.prayerIcon(for: row.name)
        .font(.body)
        .foregroundColor(active ? SazdaWidgetPalette.accentGreen : muted)
        .frame(width: 22)
      Text(PrayerUiCopy.displayName(forCanonical: row.name))
        .font(.subheadline)
        .fontWeight(active ? .bold : .medium)
        .foregroundColor(ink)
      Spacer()
      Text(row.time12)
        .font(.subheadline)
        .fontWeight(.semibold)
        .foregroundColor(active ? SazdaWidgetPalette.highlightGreen : ink)
      if active {
        Image(systemName: "checkmark.circle.fill")
          .font(.caption)
          .foregroundColor(SazdaWidgetPalette.accentGreen)
      }
    }
    .padding(.vertical, 6)
  }
}

struct PrayerDayWidget: Widget {
  let kind: String = "PrayerDayWidget"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: PrayerPayloadTimelineProvider()) { entry in
      PrayerDayWidgetEntryView(entry: entry)
    }
    .configurationDisplayName("Today’s list")
    .description("Full list of salāh times with highlight, countdown, and Makruh notes.")
    .supportedFamilies([.systemLarge])
  }
}
