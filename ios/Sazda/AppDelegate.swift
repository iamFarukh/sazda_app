import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider
import BackgroundTasks

#if canImport(WidgetKit)
import WidgetKit
#endif

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    registerPrayerRefreshTask()

    let delegate = ReactNativeDelegate()
    let factory = RCTReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

    window = UIWindow(frame: UIScreen.main.bounds)

    factory.startReactNative(
      withModuleName: "Sazda",
      in: window,
      launchOptions: launchOptions
    )

    return true
  }

  // MARK: - Background Refresh (best effort)

  private let prayerRefreshTaskId = "org.sazda.prayerRefresh"

  private func registerPrayerRefreshTask() {
    BGTaskScheduler.shared.register(forTaskWithIdentifier: prayerRefreshTaskId, using: nil) { task in
      self.handlePrayerRefresh(task: task as! BGAppRefreshTask)
    }
    scheduleNextPrayerRefresh()
  }

  private func scheduleNextPrayerRefresh() {
    let req = BGAppRefreshTaskRequest(identifier: prayerRefreshTaskId)
    // Daily best-effort. The system may delay this.
    req.earliestBeginDate = Date(timeIntervalSinceNow: 60 * 60 * 22)
    do {
      try BGTaskScheduler.shared.submit(req)
    } catch {
      // Best effort; ignore.
    }
  }

  private func handlePrayerRefresh(task: BGAppRefreshTask) {
    scheduleNextPrayerRefresh()

    task.expirationHandler = {
      task.setTaskCompleted(success: false)
    }

    #if canImport(WidgetKit)
    if #available(iOS 14.0, *) {
      WidgetCenter.shared.reloadAllTimelines()
    }
    #endif

    task.setTaskCompleted(success: true)
  }
}

class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
  override func sourceURL(for bridge: RCTBridge) -> URL? {
    self.bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
#else
    Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}
