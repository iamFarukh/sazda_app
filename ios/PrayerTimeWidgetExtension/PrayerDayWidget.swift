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
    VStack(alignment: .leading, spacing: 8) {
      HStack {
        VStack(alignment: .leading, spacing: 2) {
          Text("Today’s prayers")
            .font(.title3)
            .fontWeight(.heavy)
            .foregroundColor(SazdaWidgetPalette.highlightGreen)
          Text(formattedWidgetHeaderDate(dateKey: p.dateKey, fallback: entry.date))
            .font(.caption)
            .foregroundColor(muted)
        }
        Spacer()
        VStack(alignment: .trailing, spacing: 2) {
          Text("Next in")
            .font(.caption2)
            .foregroundColor(muted)
          Text(p.countdownLabelMin)
            .font(.title3)
            .fontWeight(.bold)
            .foregroundColor(SazdaWidgetPalette.accentGreen)
        }
      }

      Text(p.title)
        .font(.subheadline)
        .fontWeight(.bold)
        .foregroundColor(ink)
      Text(p.subtitle)
        .font(.caption)
        .foregroundColor(muted)
        .lineLimit(2)

      if p.mode == "makruh" {
        Label {
          Text(p.periodNote ?? "Makruh period — optional salah often avoided.")
            .font(.caption2)
            .foregroundColor(SazdaWidgetPalette.makruhTint)
        } icon: {
          Image(systemName: "exclamationmark.triangle.fill")
        }
        .labelStyle(.titleAndIcon)
        .font(.caption2)
        .padding(8)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(SazdaWidgetPalette.makruhTint.opacity(0.12))
        .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
      }

      VStack(spacing: 0) {
        ForEach(Array(scheduleRows.enumerated()), id: \.element.name) { index, row in
          prayerRow(row)
          if index < scheduleRows.count - 1 {
            Divider().opacity(0.25)
          }
        }
      }
      .padding(.top, 4)
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
      Text(row.name)
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
