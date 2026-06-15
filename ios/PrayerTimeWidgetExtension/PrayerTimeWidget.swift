import SwiftUI
import WidgetKit

struct PrayerTimeWidgetEntryView: View {
  @Environment(\.widgetFamily) var family
  var entry: PrayerPayloadEntry

  private var p: PrayerWidgetPayload { entry.payload }

  var body: some View {
    let ink = SazdaWidgetPalette.ink
    let muted = SazdaWidgetPalette.muted
    let cream = SazdaWidgetPalette.cream
    let target = entry.date.addingTimeInterval(p.countdownToNextMs / 1000.0)

    VStack(alignment: .leading, spacing: family == .systemSmall ? 4 : 6) {
      if p.mode == "makruh" {
        Text("⚠ \(PrayerUiCopy.widgetLine(p.title))")
          .font(family == .systemSmall ? .headline : .title3)
          .fontWeight(.heavy)
          .foregroundColor(SazdaWidgetPalette.makruhTint)
          .minimumScaleFactor(0.85)
          .lineLimit(2)
      } else {
        Text(PrayerUiCopy.widgetLine(p.title))
          .font(family == .systemSmall ? .headline : .title3)
          .fontWeight(.heavy)
          .foregroundColor(ink)
          .minimumScaleFactor(0.85)
          .lineLimit(2)
      }

      if let city = p.city, !city.isEmpty {
        Text(city)
          .font(.caption2)
          .fontWeight(.semibold)
          .foregroundColor(muted.opacity(0.95))
          .lineLimit(1)
      }

      if p.isStale, let stale = p.staleLabel, !stale.isEmpty {
        Text(stale)
          .font(.caption2)
          .fontWeight(.medium)
          .foregroundColor(muted.opacity(0.9))
          .lineLimit(1)
      }

      Spacer(minLength: 0)

      VStack(alignment: .leading, spacing: 0) {
        Text(
          p.mode == "between"
            ? "In"
            : (p.nextName.isEmpty
              ? "Next in"
              : "Next: \(PrayerUiCopy.displayName(forCanonical: p.nextName))"))
          .font(.caption)
          .foregroundColor(muted)
          .lineLimit(1)
        
        Text(target, style: .timer)
          .font(.title2)
          .fontWeight(.bold)
          .foregroundColor(SazdaWidgetPalette.accentGreen)
      }
    }
    .padding(family == .systemSmall ? 14 : 16)
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    .sazdaWidgetFullBleedBackground(cream)
  }
}

struct PrayerTimeWidget: Widget {
  let kind: String = "PrayerTimeWidget"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: PrayerPayloadTimelineProvider()) { entry in
      PrayerTimeWidgetEntryView(entry: entry)
    }
    .configurationDisplayName("Prayer glance")
    .description("Current window, next salah, and countdown. Includes Makruh awareness.")
    .supportedFamilies([.systemSmall, .systemMedium])
  }
}
