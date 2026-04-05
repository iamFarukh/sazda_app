import SwiftUI
import WidgetKit

/// Medium widget: five daily salāh in a row (Daily Flow), with active highlight and Makruh banner.
struct DailyFlowWidgetEntryView: View {
  var entry: PrayerPayloadEntry

  private var p: PrayerWidgetPayload { entry.payload }
  private let cream = SazdaWidgetPalette.cream
  private let ink = SazdaWidgetPalette.ink
  private let muted = SazdaWidgetPalette.muted

  var body: some View {
    VStack(alignment: .leading, spacing: 0) {
      HStack(alignment: .firstTextBaseline) {
        Text("Daily Flow")
          .font(.headline)
          .fontWeight(.heavy)
          .foregroundColor(SazdaWidgetPalette.highlightGreen)
        Spacer(minLength: 4)
        Text(formattedWidgetHeaderDate(dateKey: p.dateKey, fallback: entry.date))
          .font(.caption)
          .fontWeight(.semibold)
          .foregroundColor(muted)
      }
      .padding(.bottom, 6)

      if p.mode == "makruh" {
        HStack(alignment: .top, spacing: 6) {
          Image(systemName: "exclamationmark.triangle.fill")
            .font(.caption2)
            .foregroundColor(SazdaWidgetPalette.makruhTint)
          Text(makruhLine)
            .font(.caption2)
            .fontWeight(.medium)
            .foregroundColor(SazdaWidgetPalette.makruhTint)
            .lineLimit(2)
            .minimumScaleFactor(0.85)
        }
        .padding(.vertical, 4)
        .padding(.horizontal, 8)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(SazdaWidgetPalette.makruhTint.opacity(0.12))
        .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
        .padding(.bottom, 6)
      }

      fivePrayerRow
    }
    .padding(10)
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    .sazdaWidgetFullBleedBackground(cream)
  }

  private var makruhLine: String {
    if let note = p.periodNote, !note.isEmpty { return note }
    return "Makruh time — optional prayer often avoided now."
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
        .font(.system(size: 11, weight: .semibold))
        .foregroundColor(iconFg)
      Text(item.name.uppercased())
        .font(.system(size: 8, weight: .heavy))
        .foregroundColor(fg)
        .lineLimit(1)
        .minimumScaleFactor(0.7)
      Text(item.time12)
        .font(.system(size: 7, weight: .semibold))
        .foregroundColor(isHighlight ? .white.opacity(0.9) : muted)
        .lineLimit(1)
        .minimumScaleFactor(0.65)
    }
    .padding(.vertical, 6)
    .padding(.horizontal, 2)
    .frame(maxWidth: .infinity, maxHeight: .infinity)
    .background(bg)
    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
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
