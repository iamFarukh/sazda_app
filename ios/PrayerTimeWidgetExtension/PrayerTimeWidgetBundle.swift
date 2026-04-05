import SwiftUI
import WidgetKit

@main
struct PrayerTimeWidgetBundle: WidgetBundle {
  var body: some Widget {
    PrayerTimeWidget()
    DailyFlowWidget()
    PrayerDayWidget()
  }
}
