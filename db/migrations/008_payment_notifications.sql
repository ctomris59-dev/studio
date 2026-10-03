-- Member payment activation and exception notifications.
ALTER TABLE mail_outbox DROP CONSTRAINT mail_outbox_template_check;
ALTER TABLE mail_outbox ADD CONSTRAINT mail_outbox_template_check
 CHECK(template IN('verify_email','password_reset','member_invitation',
  'booking_confirmed','booking_cancelled','waitlist_promoted','renewal_alert',
  'package_payment_confirmed','package_payment_review'));
