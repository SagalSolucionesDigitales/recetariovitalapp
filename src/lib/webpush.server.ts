// Server-only Web Push setup shared by the daily reminder cron and the
// "notificación de prueba" button, so both send with the same VAPID keys and
// delivery options.

// Sin urgencia alta, Android en Doze puede retener el aviso (FCM lo "acepta"
// pero no lo entrega al instante). TTL: 12 h para que un equipo apagado o en
// reposo lo reciba al volver.
export const PUSH_OPTIONS = { TTL: 60 * 60 * 12, urgency: "high" as const };

// Returns null when the VAPID keys are missing from the env.
export async function getWebPush() {
  const vapidPublic = process.env.VAPID_PUBLIC_KEY?.trim();
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY?.trim();
  const vapidSubject = (process.env.VAPID_SUBJECT || "mailto:hola@recetariovital.app").trim();
  if (!vapidPublic || !vapidPrivate) return null;
  const webpush = (await import("web-push")).default;
  webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);
  return webpush;
}
