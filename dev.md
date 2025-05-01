Below is a sample Product Requirements Document (PRD) for the "Tribe Reminders" app based on the information you provided. You can share this with Cursor or reference it directly during development to ensure all critical features and specifications are clear.

---

# **Tribe Reminders**  
**Product Requirements Document**

## 1. **Overview**

**Product Name:** Tribe Reminders  
**Primary Goal:** Help users remember to reach out and stay connected with important people (their "tribe") by scheduling periodic reminders and tracking interactions.

Tribe Reminders allows users to:
1. Create and manage a list of contacts ("My Tribe").
2. Assign reminder frequencies to each contact.
3. Receive push notifications at a random time within a specified window.
4. Log interactions and notes about each contact.

## 2. **Scope**

**In-Scope Features**  
- **Contact Management:** Users can add, view, edit, and remove contacts from their "tribe."  
- **Reminder Scheduling:** Users assign a frequency, and the system randomly generates a date/time for the next reminder within the user's available "time window."  
- **Notifications & Logging:** The app displays recent notifications and collects notes on whether a user dismisses or follows through with contacting someone.  
- **Settings:** Dark mode, push notifications on/off, and configurable reminder time window.  
- **Accessibility:** The app must conform to WCAG 2.0 AA accessibility standards.  

**Out-of-Scope (for initial release)**  
- Complex social or communication integrations (e.g., direct messaging within the app).  
- Advanced analytics.  
- Web-based or desktop versions.  

## 3. **User Personas & Use Cases**

### 3.1. User Personas
1. **Busy Professional ("Alice")**  
   - Wants to maintain personal relationships despite a packed schedule.  
   - Needs quick, random reminders to call friends/family during her free time.  

2. **Stay-at-Home Parent ("Bob")**  
   - Has flexible availability but can easily forget to reach out to extended family and friends due to daily chores.  
   - Needs push notifications at a manageable frequency.

3. **Elderly User ("Carol")**  
   - May rely heavily on app notifications to maintain social connections.  
   - Needs highly accessible interface (easy to read, easy to navigate).

### 3.2. User Stories & Flows

1. **Add New Contact**  
   - *As a user*, I want to add a new contact, assign a reminder frequency, and specify how frequently I want to connect with them.  
   - *Success Criteria:* A new contact appears in "My Tribe," and a `nextReminder` is generated.

2. **Receive Reminder**  
   - *As a user*, I want to be randomly reminded within my preferred time window to contact someone in my tribe, so I don't forget.  
   - *Success Criteria:* A push notification arrives, showing the contact name and last note/action.

3. **Log Interaction**  
   - *As a user*, I want to record whether I contacted or dismissed a reminder and add optional notes.  
   - *Success Criteria:* The action and associated note are stored in the contact's history.

4. **View Contact History**  
   - *As a user*, I want to see the most recent interactions for each contact, to remind myself when and why I last reached out.  
   - *Success Criteria:* The screen shows up to 5 most recent notifications, dates, actions, and notes.

5. **Change Settings**  
   - *As a user*, I want to adjust whether push notifications are enabled, set my notification time window, and choose between light and dark mode.  
   - *Success Criteria:* The selected settings are saved and reflect in the app's behavior.

6. **Remove Contact**  
   - *As a user*, I should be able to remove a contact from my tribe if I no longer want reminders for them.  
   - *Success Criteria:* Contact is removed, and subsequent reminders for that contact stop.

## 4. **Functional Requirements**

### 4.1. Contact Management
1. **New Member Flow**  
   - Users can tap "New Member" from the "My Tribe" screen.  
   - Form includes: `Name`, `Frequency` (drop-down), and "Save."  
   - Frequencies:
     - 5 minutes (testing)
     - 1-3 days
     - 3-7 days
     - 7-14 days
     - 14-28 days
     - Every Monday
     - Every Tuesday
     - Every Wednesday
     - Every Thursday
     - Every Friday
     - Every Saturday
     - Every Sunday  

2. **Edit Contact**  
   - Tapping an existing contact shows "Contact Detail" screen:
     - Contact Name
     - Assigned Frequency
     - Last notified date
     - Next reminder date
     - Contact history (last 5 interactions)
   - "Edit" button allows changing the contact's name or frequency.

3. **Delete Contact**  
   - Ability to remove the contact entirely from the app.  
   - Confirmation prompt to ensure the user wants to delete it.

4. **Contact Storage**  
   - Stored locally in AsyncStorage under key: `contacts`.

### 4.2. Home Screen
1. **Notifications List**  
   - Shows all triggered reminders stored in local storage (AsyncStorage under `notifications`).  
   - Paginated by 5 notifications per page.  
   - Each list item shows:
     - Contact name
     - Notification date and time
     - Where you last received a notification for that contact (if applicable)
     - Last action (Contacted or Dismissed)
     - Last note
   - "Dismiss" and "Contacted" buttons for new reminders, each opening a free text field for notes.

2. **Push Notifications**  
   - If user has push turned on, they receive a native notification that leads them back to the app's Home Screen.  
   - iOS devices: prompt for push notification permissions, or direct to native Settings.

3. **Settings Cog**  
   - On the Home Screen, a cog icon leads to "Settings":
     - Toggle dark mode (uses Facebook's color scheme in both modes).
     - Toggle push notifications (redirect to native device settings on iOS).
     - Set notification time window (`startTime` / `endTime`).

### 4.3. Reminder System
1. **Reminder Frequencies**  
   - Random intervals:
     - r0: 5 minutes (for testing)  
     - r1: 1-3 days  
     - r2: 3-7 days  
     - r3: 7-14 days  
     - r4: 14-28 days  
   - Weekday-based intervals:
     - Weekly: Reminder every [day of week]
     - Fortnightly: Reminder every other [day of week]
     - Monthly: Reminder every four weeks on [day of week]

2. **Next Reminder Calculation**  
   - For random intervals:
     - Randomly selects a date within the frequency interval
     - Randomly selects a time within user's notification window
   - For weekday-based intervals:
     - Determines the next occurrence of the specified weekday
     - Adds appropriate interval (7, 14, or 28 days)
     - Randomly selects a time within user's notification window

3. **Automatic Check** (`checkForReminders`)  
   - Runs every minute and on app start.  
   - Compares current date/time with each contact's `nextReminder`.  
   - When a contact is due:
     - Generate notification object.  
     - Save to AsyncStorage under `notifications`.  
     - Update the contact's `history` (with the new "due date").

4. **Notification History**  
   - Each history entry (stored under `history_${contactId}`) includes:
     - `date`: ISO date of the notification.
     - `action`: "Contacted" or "Dismissed."
     - `notes`: Free text note from the user's input (optional).

### 4.4. Accessibility Requirements
1. **WCAG 2.0 AA Compliance**  
   - Adequate color contrast for text and UI elements.  
   - Proper labeling for interactive elements, alt text for icons (where relevant).  
   - Font sizes and spacing that accommodate accessibility guidelines.  

## 5. **Technical Requirements**

1. **Tech Stack**  
   - **React Native** for cross-platform mobile development.  
   - **AsyncStorage** for local data persistence.  
   - **Notifications** leveraging platform-specific push notification services (FCM for Android, APNs for iOS).

2. **Storage Structure** (AsyncStorage)
   ```
   {
     'contacts': Contact[],
     'notifications': Notification[],
     'history_${contactId}': HistoryEntry[],
     'notificationStartTime': string, // HH:mm
     'notificationEndTime': string // HH:mm
   }
   ```
   - **Contact** model:
     ```
     {
       id: number,
       name: string,
       frequency: string,    // e.g., r0-r4, Monday, Tuesday, etc.
       lastContacted?: string, // ISO date
       nextReminder?: string,  // ISO date
       history?: HistoryEntry[]
     }
     ```
   - **Notification** model:
     ```
     {
       id: number,
       contactId: number,
       dateCreated: string, // ISO date of when notification was generated
       reminderDate: string, // ISO date/time of the actual reminder
       ...
     }
     ```
   - **HistoryEntry** model:
     ```
     {
       date: string,    // ISO date
       action: string,  // 'Contacted' | 'Dismissed'
       notes?: string
     }
     ```

3. **Core Functions**
   - **checkForReminders()**  
     - Invoked on app start and every minute.  
     - Checks if any `nextReminder` is <= current time.  
     - If yes, generate a new Notification, store it, and update contact's history.

   - **generateNotification(contact)**  
     - Creates a notification object based on the due contact.  
     - Saves it to AsyncStorage.

   - **calculateNextReminder(contact, frequency)**  
     - Randomly selects a time within the user's `notificationStartTime`–`notificationEndTime`.  
     - For range frequencies, picks a random day offset (e.g., 1-3, 3-7, etc.).  
     - For day-of-week frequencies, picks the next occurrence of that day.  

   - **handleNotificationAction(notificationId, action, notes)**  
     - Updates the relevant contact's history and sets a new `nextReminder`.

   - **handleModalSubmit()**  
     - Processes user's free text notes after contact or dismiss actions.  
     - Persists to both notifications list and contact's history.

## 6. **Non-Functional Requirements**

1. **Performance**  
   - The reminder check runs every minute; it must be lightweight to avoid draining battery.  
   - Pagination on the "Home" and "My Tribe" screens ensures efficient rendering of large lists.

2. **Security**  
   - Minimal user PII; only store names and app usage.  
   - Data is stored locally; no sensitive data transmissions over the network.

3. **Usability**  
   - Straightforward navigation with bottom tab bar.  
   - Consistent design across both iOS and Android.  
   - Clear calls to action (buttons labeled "Dismiss," "Contacted," etc.).

4. **Reliability & Availability**  
   - The app must gracefully handle offline scenarios.  
   - Data should persist even if user closes/reopens app.

5. **Maintainability**  
   - Organized code structure, especially in "notification" and "HomeScreen" modules.  
   - Clear separation between data handling (AsyncStorage) and UI components.

## 7. **Risks & Constraints**

1. **Push Notification Permissions**  
   - Users may ignore or decline permissions, limiting the app's functionality.  
   - Must handle fallback of local scheduling or in-app notifications.

2. **Randomization of Times**  
   - Users could find random notifications inconvenient if triggered repeatedly.  
   - Provide clear instructions on how to adjust frequency and time windows.

3. **Accessibility Implementation**  
   - Ensuring compliance with WCAG 2.0 AA might require additional time for design audits and testing.

4. **Local Storage Limits**  
   - iOS and Android have size limits for AsyncStorage. Large contact lists or long histories may impact performance.

---

## 8. **Milestones & Acceptance Criteria**

1. **MVP Release**  
   - **Contact Management** fully functional (Add/Edit/Delete).  
   - **Random Reminders** triggered (Frequencies, time window).  
   - **Push Notifications** for iOS/Android.  
   - **Basic Notification & Action Handling** (Dismiss, Contacted, note-taking).  
   - **WCAG 2.0 AA** interface checks.

2. **Post-MVP Enhancements**  
   - **Advanced Custom Frequencies** (e.g., user-chosen date/time intervals).  
   - **Analytics & Summaries** (weekly or monthly usage reports).  
   - **User Sharing or Cross-Device Sync** (if expanded to back-end).

---

## 9. **Appendix / References**
1. **WCAG 2.0 AA** guidelines: [W3C WCAG Documentation](https://www.w3.org/WAI/standards-guidelines/wcag/) (Refer to official doc, if needed.)  
2. **React Native AsyncStorage**: Official documentation on usage and capacity.  
3. **React Native Push Notifications**: (FCM for Android and APNs for iOS).  

---

**End of Document**  

This PRD should give you (and Cursor) a clear blueprint for how to build and maintain the **Tribe Reminders** app. It covers feature requirements, user flows, data models, and technical considerations for the initial MVP. Feel free to adapt or expand any sections to meet your specific team, design, or technical needs.

## Features

### Contact Management

### Reminder Frequency Options

#### Random Intervals
- Every 5 minutes (Testing)
- 1-3 days
- 3-7 days
- 7-14 days
- 14-28 days

#### Specific Day Reminders
Users can set reminders for specific days of the week with different intervals:
- Weekly (every Monday, Tuesday, etc.)
- Fortnightly (every other Monday, Tuesday, etc.)
- Monthly (once a month on a specific day)

### Notification Management

#### Pausing Notifications
- Users can pause notifications for individual contacts
- A yellow "Pause" button is available on the contact details screen
- When paused, the button turns green and changes to "Resume"
- Pause/Resume actions are recorded in the contact's history
- A confirmation modal is shown before pausing notifications

#### Contact Removal
- When a contact is removed:
  - All pending notifications for that contact are cancelled
  - Contact data is removed from storage
  - Contact history is cleared
  - User is returned to the main screen

#### Badge Notifications
- The app icon displays a badge with the number of unread notifications.
- The badge count updates whenever the app is focused or notifications are cleared.
- Users are visually alerted to pending notifications that need action.

## Push Notification System

### Overview

The app uses a scheduled notification system to remind users to contact people in their tribe. This document explains how notifications are generated, scheduled, and managed.

### Notification Lifecycle

### 1. Notification Creation

When a contact is created or a notification is actioned, a new notification is generated:

```typescript
// Create a new notification
const newNotification = {
  id: Date.now() + Math.floor(Math.random() * 10000), // Unique ID
  name: contact.name,
  date: nextReminderDate.toISOString(), // Future date when notification becomes due
  frequency: contact.frequency,
  lastContacted: contact.lastContacted || null,
  actioned: false,
  paused: false
};

// Store in AsyncStorage
const notificationsJson = await AsyncStorage.getItem('notifications');
const existingNotifications = notificationsJson ? JSON.parse(notificationsJson) : [];
const updatedNotifications = [...existingNotifications, newNotification];
await AsyncStorage.setItem('notifications', JSON.stringify(updatedNotifications));

// Schedule the push notification
PushNotification.localNotificationSchedule({
  channelId: 'tribe-reminders',
  title: 'Time to Connect! 👋',
  message: `It's time to reach out to ${contact.name}`,
  date: nextReminderDate,
  allowWhileIdle: true,
  importance: 'high',
  priority: 'high',
  userInfo: { 
    contactId: contact.id,
    notificationId: newNotification.id
  }
});
```

### 2. Storage in AsyncStorage

All notifications are stored in AsyncStorage under the 'notifications' key. The storage process should:

1. Read existing notifications
2. Check for duplicates
3. Append the new notification
4. Save back to AsyncStorage
5. Schedule the push notification
6. Emit an event to refresh the UI

```typescript
// Get existing notifications
const notificationsJson = await AsyncStorage.getItem('notifications');
const existingNotifications = notificationsJson ? JSON.parse(notificationsJson) : [];

// Check for duplicates
const isDuplicate = existingNotifications.some(n => n.id === newNotification.id);
if (!isDuplicate) {
  const updatedNotifications = [...existingNotifications, newNotification];
  await AsyncStorage.setItem('notifications', JSON.stringify(updatedNotifications));
}

// Schedule push notification
PushNotification.localNotificationSchedule({...});

// Emit event to refresh UI
DeviceEventEmitter.emit('forceRefreshNotifications', {});
```

### 3. UI Display Filtering

When displaying notifications on the home screen, we filter to show only:
- Unactioned notifications (`actioned === false`)
- Due notifications (date <= current time)

```typescript
// Filter for UI display only
const now = new Date();
const dueNotifications = allNotifications.filter(n => 
  n.actioned === false && 
  new Date(n.date) <= now
);
setNotifications(dueNotifications);
```

### 4. Actioning a Notification

When a user actions a notification:
1. The notification is marked as actioned in storage
2. A new notification is created with a future date
3. Both are saved to AsyncStorage
4. Only due notifications are shown in the UI

```typescript
// Mark notification as actioned
latestNotifications = latestNotifications.map(n => 
  n.id === id ? { ...n, actioned: true } : n
);

// Create new notification with future date
const nextReminderDate = await calculateNextReminder(notification.frequency);
const newNotification = {
  id: Date.now() + Math.floor(Math.random() * 10000),
  name: notification.name,
  date: nextReminderDate.toISOString(),
  frequency: notification.frequency,
  lastContacted: contact.lastContacted || null,
  actioned: false,
  paused: false
};

// Save both notifications
await AsyncStorage.setItem('notifications', JSON.stringify([...latestNotifications, newNotification]));
```

### 5. Important Implementation Note

The system maintains a separation between:
- What's stored (ALL notifications, including future ones)
- What's displayed (only unactioned, due notifications)

This ensures future notifications remain in storage until they become due.

### Editing a Contact

When a contact is edited:

1. The existing scheduled notification is cancelled:
   ```typescript
   PushNotification.cancelLocalNotification(String(contact.id));
   ```

2. A new next reminder date is calculated based on the updated frequency:
   ```typescript
   const nextReminder = await calculateNextReminder(editedFrequency);
   ```

3. The contact is updated in storage with the new frequency and next reminder date.

4. A new notification is scheduled for the updated next reminder date:
   ```typescript
   await scheduleLocalNotification(updatedContact);
   ```

### Deleting a Contact

When a contact is deleted:

1. The contact is removed from AsyncStorage
2. Any scheduled notifications are cancelled:
   ```typescript
   PushNotification.cancelLocalNotification(String(contact.id));
   ```
3. Any stored notifications for this contact are removed from AsyncStorage
4. The badge count is updated

### HomeScreen Display

The HomeScreen only displays notifications that:
1. Have not been actioned (`actioned === false`)
2. Have a scheduled date in the past or present (`new Date(notification.date) <= now`)

This ensures users only see reminders that are currently due.

### Clear All Functionality

The "Clear All" button processes each notification individually:
1. Marks each as actioned
2. Updates contact history with "Dismissed" action
3. Schedules the next reminder for each contact
4. Updates the badge count

### iOS Foreground Notifications

On iOS, when a notification arrives while the app is in the foreground:
1. An alert is shown with the notification content
2. The user can tap "View" to navigate to the HomeScreen
3. The notifications list is refreshed to show the new notification

### Notification Settings

Users can manage notification permissions through the device's native settings:
```typescript
const openNotificationSettings = () => {
  if (Platform.OS === 'ios') {
    Linking.openURL('app-settings:');
  } else if (Platform.OS === 'android') {
    Linking.openSettings();
  }
};
```

## Badge Notification System

### Badge Count Management

Badge counts reflect due/overdue notifications that haven't been actioned:

```typescript
// Badge count calculation
const now = new Date();
const dueNotifications = notifications.filter((n: StoredNotification) => 
  n.actioned === false && 
  new Date(n.date) <= now
);
const badgeCount = dueNotifications.length;

// Update badge on both platforms
if (Platform.OS === 'ios') {
  PushNotificationIOS.setApplicationIconBadgeNumber(badgeCount);
}
PushNotification.setApplicationIconBadgeNumber(badgeCount);
```

### Badge Update Triggers

The badge count is updated in multiple places to ensure accuracy:

1. **App Launch**: When the app starts, badge count is reset
2. **App Foreground**: When app comes to foreground from background
3. **Screen Focus**: When HomeScreen receives focus
4. **Notification Actions**: After any notification is actioned
5. **Clear All**: After clearing all notifications

```typescript
// App.tsx - App launch and foreground updates
useEffect(() => {
  // Reset badge count when app starts
  resetBadgeCount();
  
  // Also reset badge count when app comes to foreground
  const subscription = AppState.addEventListener('change', nextAppState => {
    if (nextAppState === 'active') {
      resetBadgeCount();
    }
  });
  
  return () => subscription.remove();
}, []);

// HomeScreen.tsx - Screen focus update
useEffect(() => {
  const unsubscribe = navigation.addListener('focus', () => {
    loadNotifications();
    resetBadgeCount();
  });
  return unsubscribe;
}, [navigation]);
```

## Notification Actions

### Clear All Notifications

When a user clears all notifications:

1. **Mark as Actioned**: All current notifications are marked as actioned
2. **Create New Notifications**: For each cleared notification, a new future notification is created
3. **Schedule Push Notifications**: System notifications are scheduled for each new reminder
4. **Update Contact History**: Each contact's history is updated with a "Dismissed" action
5. **Update Badge Count**: The badge count is reset to reflect the new state

```typescript
// Process each notification when clearing all
for (const notification of dueNotifications) {
  // Find matching contact
  const contact = contacts.find((c: Contact) => c.name === notification.name);
  
  // Calculate next reminder
  const nextReminderDate = await calculateNextReminder(notification.frequency);
  
  // Create new notification
  const newNotification = {
    id: Date.now() + Math.floor(Math.random() * 10000),
    name: notification.name,
    date: nextReminderDate.toISOString(),
    frequency: notification.frequency,
    lastContacted: contact.lastContacted || null,
    actioned: false,
    paused: false
  };
  
  // Schedule the push notification
  PushNotification.localNotificationSchedule({
    channelId: 'tribe-reminders',
    title: 'Time to Connect! 👋',
    message: `It's time to reach out to ${notification.name}`,
    date: nextReminderDate,
    allowWhileIdle: true,
    importance: 'high',
    priority: 'high',
  });
  
  // Update contact history
  const historyJson = await AsyncStorage.getItem(`history_${contact.id}`);
  const history = historyJson ? JSON.parse(historyJson) : [];
  history.unshift({
    date: new Date().toISOString(),
    action: 'Dismissed',
    notes: 'Cleared via Clear All'
  });
  await AsyncStorage.setItem(`history_${contact.id}`, JSON.stringify(history));
}
```