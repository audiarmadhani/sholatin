import * as Notifications from 'expo-notifications';
import type { PrayerName } from '@/src/domain/types';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function ensureNotificationPermission(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function schedulePrayerReminders(
  items: { prayer: PrayerName; whenMs: number }[],
): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  const now = Date.now();
  for (const it of items) {
    if (it.whenMs <= now) continue;
    const when = new Date(it.whenMs);
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Sholatin',
        body: `Gentle reminder: ${it.prayer} window`,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: when,
      },
    });
  }
}
