export function smtpTransportUrl(url: string, requireTls: boolean): string {
  if (!requireTls) return url;
  const withTls = new URL(url);
  withTls.searchParams.set("requireTLS", "true");
  return withTls.toString();
}
