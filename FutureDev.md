Improve push notifications

However, this approach has a limitation - it only knows about the current notification being scheduled, not the total count of unactioned notifications.
For a more accurate solution, we need to use a background task or push notification service. Here's a more comprehensive approach:

1. Use a Notification Service Extension (iOS) or Firebase Cloud Messaging (Android) to update badge counts when notifications are delivered.
For iOS, you can implement a Notification Service Extension that calculates the correct badge count before the notification is displayed:
// iOS Notification Service Extension (requires additional setup)
override func didReceive(_ request: UNNotificationRequest, withContentHandler contentHandler: @escaping (UNNotificationContent) -> Void) {
    let userInfo = request.content.userInfo
    var bestAttemptContent = request.content.mutableCopy() as? UNMutableNotificationContent
    
    // Read notifications from UserDefaults (shared with main app)
    if let notificationsData = UserDefaults(suiteName: "group.com.yourapp")?.data(forKey: "notifications"),
       let notifications = try? JSONDecoder().decode([Notification].self, from: notificationsData) {
        
        // Count unactioned notifications
        let unactionedCount = notifications.filter { !$0.actioned && Date(timeIntervalSince1970: $0.date) <= Date() }.count
        
        // Set the badge count
        bestAttemptContent?.badge = NSNumber(value: unactionedCount)
    }
    
    contentHandler(bestAttemptContent ?? request.content)
}

3. For Android, you would use Firebase Cloud Messaging and a data message to trigger a local notification with the correct badge count.
This is a more advanced implementation that requires additional setup beyond the scope of a simple code change. It would involve:
1. Setting up app groups for iOS to share data between the main app and notification extension
2. Creating a notification service extension for iOS
3. Potentially setting up Firebase Cloud Messaging for Android

