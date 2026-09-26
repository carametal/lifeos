// Only predefined codes are surfaced. Never return raw SDK messages or credentials.
const codes = new Set([
  "invalid_credentials", "email_not_confirmed", "email_provider_disabled",
  "signup_disabled", "user_banned", "over_request_rate_limit",
  "over_email_send_rate_limit", "unexpected_failure", "captcha_failed",
]);

export function describeLoginError(error: { code?: string; status?: number; name?: string }, development = false) {
  const code = error.code && codes.has(error.code) ? error.code :
    error.name === "AuthRetryableFetchError" ? "auth_connection_failed" :
    error.status === 401 || error.status === 403 ? "auth_access_rejected" : "auth_unknown_error";
  const status = Number.isInteger(error.status) && error.status! >= 0 && error.status! <= 599 ? error.status : undefined;
  const message = status === 429
    ? "試行回数が多いため、時間をおいてお試しください。"
    : code === "auth_connection_failed" || (status !== undefined && status >= 500)
      ? "認証サービスに接続できませんでした。時間をおいてお試しください。"
      : "ログインできませんでした。入力内容を確認し、時間をおいてお試しください。";
  return {
    message: development ? `${message}（確認コード：${code}${status === undefined ? "" : ` / ${status}`}）` : message,
    code,
    status,
  };
}
