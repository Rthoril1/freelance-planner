import { useNotificationStore, AppNotification } from '@/store/useNotificationStore';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { useEffect, useState } from 'react';

export function ToastContainer() {
  const notifications = useNotificationStore((state) => state.notifications);
  const activeToasts = notifications.filter(n => n.isToast);

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-3 w-full max-w-sm pointer-events-none">
      {activeToasts.map((n) => (
        <Toast key={n.id} notification={n} />
      ))}
    </div>
  );
}

function Toast({ notification }: { notification: AppNotification }) {
  const removeNotification = useNotificationStore((state) => state.removeNotification);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const icons = {
    success: <CheckCircle className="h-5 w-5 text-emerald-500" />,
    error: <AlertCircle className="h-5 w-5 text-destructive" />,
    info: <Info className="h-5 w-5 text-primary" />,
    warning: <AlertTriangle className="h-5 w-5 text-amber-500" />,
  };

  const bgColors = {
    success: 'bg-emerald-500/10 border-emerald-500/20',
    error: 'bg-destructive/10 border-destructive/20',
    info: 'bg-primary/10 border-primary/20',
    warning: 'bg-amber-500/10 border-amber-500/20',
  };

  return (
    <div
      className={`
        pointer-events-auto flex items-center justify-between gap-4 p-4 rounded-2xl border backdrop-blur-xl shadow-2xl transition-all duration-500
        ${bgColors[notification.type]}
        ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
      `}
    >
      <div className="flex items-center gap-3">
        {icons[notification.type]}
        <p className="text-sm font-bold text-foreground">{notification.message}</p>
      </div>
      <button
        onClick={() => setIsVisible(false)}
        onTransitionEnd={() => !isVisible && removeNotification(notification.id)}
        className="p-1 hover:bg-foreground/5 rounded-lg transition-colors opacity-50 hover:opacity-100"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
