/**
 * Tab Alerts — wrapper đơn giản để mount NotificationsScreen trong tab bar.
 * Toàn bộ logic hiển thị và tương tác được thực hiện trong `notifications.tsx`.
 */
import NotificationsScreen from '../notifications';

export default function AlertsTab() {
  return <NotificationsScreen />;
}