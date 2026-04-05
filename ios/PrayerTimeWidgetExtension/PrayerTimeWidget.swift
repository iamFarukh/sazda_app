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

    VStack(alignment: .leading, spacing: family == .systemSmall ? 4 : 6) {
      Text(p.title)
        .font(family == .systemSmall ? .headline : .title3)
        .fontWeight(.heavy)
        .foregroundColor(ink)
        .minimumScaleFactor(0.85)
        .lineLimit(2)

      VStack(alignment: .leading, spacing: 2) {
        Text(p.subtitle)
          .font(.caption)
          .fontWeight(.semibold)
          .foregroundColor(muted)
          .lineLimit(3)
        if p.mode == "makruh" {
          Text("Makruh period — see note in app if unsure.")
            .font(.caption2)
            .fontWeight(.medium)
            .foregroundColor(SazdaWidgetPalette.makruhTint)
            .lineLimit(2)
        }
      }

      Spacer(minLength: 0)

      HStack(spacing: 4) {
        Text("Next in")
          .font(.caption2)
          .foregroundColor(muted)
        Text(p.countdownLabelMin)
          .font(.subheadline)
          .fontWeight(.bold)
          .foregroundColor(SazdaWidgetPalette.accentGreen)
      }
    }
    .padding(family == .systemSmall ? 10 : 12)
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
