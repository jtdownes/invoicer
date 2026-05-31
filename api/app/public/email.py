"""
Email sending helpers using Resend.
If RESEND_API_KEY is not set, send() logs a warning and returns False — the
rest of the app continues working without email.
"""
import logging
from datetime import date as DateType

from ..config import APP_BASE_URL, RESEND_API_KEY, RESEND_FROM_EMAIL, RESEND_FROM_NAME

logger = logging.getLogger(__name__)


def _fmt_currency(value) -> str:
    try:
        return f"${float(value):,.2f}"
    except (TypeError, ValueError):
        return "$0.00"


def _valid_until(est: dict) -> str:
    """Return the human-readable valid-until date string."""
    from datetime import datetime, timedelta
    base_raw = est.get("estimate_date") or est.get("created_at")
    if base_raw is None:
        return "—"
    if isinstance(base_raw, str):
        try:
            base = datetime.fromisoformat(base_raw.replace("Z", "+00:00")).date()
        except ValueError:
            return "—"
    elif isinstance(base_raw, DateType):
        base = base_raw
    else:
        base = base_raw.date() if hasattr(base_raw, "date") else base_raw

    valid_until = base + timedelta(days=int(est.get("valid_days", 30)))
    return valid_until.strftime("%b %-d, %Y")


def build_estimate_email(est: dict, owner: dict, public_url: str) -> str:
    """Return the HTML for the estimate email."""
    business_name = owner.get("business_name") or f"{owner.get('first_name', '')} {owner.get('last_name', '')}".strip() or "Your Contractor"
    client_name   = est.get("client_name") or "there"
    title         = est.get("title") or ""
    total         = _fmt_currency(est.get("total"))
    valid_until   = _valid_until(est)
    est_number    = est.get("estimate_number", "")

    title_row = f'<div style="color:#a5b4fc;font-size:13px;margin-top:4px">{title}</div>' if title else ""

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Estimate {est_number} from {business_name}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f1f5f9">
  <tr>
    <td align="center" style="padding:40px 16px">
      <table width="520" cellpadding="0" cellspacing="0" role="presentation" style="max-width:520px;width:100%">
        <tr>
          <td style="background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden">
            <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
              <tr>
                <td style="background:#4f46e5;padding:24px 32px">
                  <div style="color:#ffffff;font-size:11px;font-weight:600;letter-spacing:2px;text-transform:uppercase;margin-bottom:6px">Estimate</div>
                  <div style="color:#ffffff;font-size:22px;font-weight:800">{est_number}</div>
                  {title_row}
                </td>
              </tr>
            </table>
            <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
              <tr>
                <td style="padding:32px">
                  <p style="margin:0 0 6px;font-size:16px;color:#111827;font-weight:600">Hi {client_name},</p>
                  <p style="margin:0 0 24px;font-size:14px;color:#6b7280;line-height:1.6">
                    <strong style="color:#374151">{business_name}</strong> has prepared an estimate for your review.
                    Click below to see the full details and approve when you&rsquo;re ready.
                  </p>
                  <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
                    style="background:#f8fafc;border-radius:12px;margin-bottom:24px">
                    <tr>
                      <td style="padding:16px 20px">
                        <table width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td style="font-size:12px;color:#6b7280;padding-bottom:6px">Estimate Total</td>
                            <td align="right" style="font-size:22px;font-weight:800;color:#4f46e5">{total}</td>
                          </tr>
                          <tr>
                            <td style="font-size:12px;color:#6b7280">Valid Until</td>
                            <td align="right" style="font-size:13px;color:#374151;font-weight:600">{valid_until}</td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                  <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                    <tr>
                      <td align="center">
                        <a href="{public_url}"
                          style="display:inline-block;background:#4f46e5;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:15px 36px;border-radius:10px">
                          View &amp; Approve Estimate &rarr;
                        </a>
                      </td>
                    </tr>
                  </table>
                  <p style="margin:20px 0 0;font-size:11px;color:#9ca3af;text-align:center;word-break:break-all">{public_url}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:20px;text-align:center">
            <p style="margin:0;font-size:12px;color:#9ca3af">
              Sent by <strong style="color:#6b7280">{business_name}</strong> &middot;
              <a href="{public_url}" style="color:#6b7280;text-decoration:underline">View estimate</a>
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>"""


def send_estimate_email(est: dict, owner: dict, public_url: str, to_email: str) -> bool:
    """
    Send the estimate email. Returns True on success, False on failure.
    Silently skips (returns False) if RESEND_API_KEY is not configured.
    """
    if not RESEND_API_KEY:
        logger.warning("RESEND_API_KEY not set — skipping email send for estimate %s", est.get("estimate_number"))
        return False

    try:
        import resend
        resend.api_key = RESEND_API_KEY

        business_name = (
            owner.get("business_name")
            or f"{owner.get('first_name', '')} {owner.get('last_name', '')}".strip()
            or RESEND_FROM_NAME
        )
        from_address = owner.get("business_email") or RESEND_FROM_EMAIL
        from_field   = f"{business_name} <{from_address}>"
        subject      = f"Your Estimate {est.get('estimate_number','')} from {business_name}"
        html         = build_estimate_email(est, owner, public_url)

        params: resend.Emails.SendParams = {
            "from":    from_field,
            "to":      [to_email],
            "subject": subject,
            "html":    html,
        }
        result = resend.Emails.send(params)
        logger.info("Email sent to %s, id=%s", to_email, result.get("id"))
        return True

    except Exception as exc:
        logger.error("Failed to send estimate email: %s", exc)
        return False


def send_approval_notification(est: dict, owner: dict, signer_name: str) -> bool:
    """Notify the business owner that their estimate was approved."""
    if not RESEND_API_KEY:
        return False

    owner_email = owner.get("business_email") or owner.get("email")
    if not owner_email:
        return False

    try:
        import resend
        resend.api_key = RESEND_API_KEY

        business_name = (
            owner.get("business_name")
            or f"{owner.get('first_name', '')} {owner.get('last_name', '')}".strip()
            or "Your Business"
        )
        client_name = est.get("client_name") or "Your client"
        est_number  = est.get("estimate_number", "")
        total       = _fmt_currency(est.get("total"))
        public_url  = f"{APP_BASE_URL}/e/{est.get('public_token','')}"

        html = f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f1f5f9;margin:0;padding:40px 16px">
<div style="max-width:480px;margin:0 auto;background:#fff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden">
  <div style="background:#10b981;padding:20px 28px">
    <div style="color:#fff;font-size:18px;font-weight:800">&#10003; Estimate Approved!</div>
  </div>
  <div style="padding:28px">
    <p style="margin:0 0 16px;font-size:15px;color:#111827">
      <strong>{client_name}</strong> approved estimate <strong>{est_number}</strong> for <strong style="color:#10b981">{total}</strong>.
    </p>
    <p style="margin:0 0 20px;font-size:13px;color:#6b7280">Signed as: <em>{signer_name}</em></p>
    <a href="{public_url}" style="display:inline-block;background:#4f46e5;color:#fff;font-size:14px;font-weight:600;text-decoration:none;padding:12px 24px;border-radius:8px">
      View Estimate &rarr;
    </a>
  </div>
</div>
</body></html>"""

        params: resend.Emails.SendParams = {
            "from":    f"{business_name} <{RESEND_FROM_EMAIL}>",
            "to":      [owner_email],
            "subject": f"✓ {client_name} approved {est_number} ({total})",
            "html":    html,
        }
        resend.Emails.send(params)
        return True

    except Exception as exc:
        logger.error("Failed to send approval notification: %s", exc)
        return False
