# StudioTasker — portable studio-only backend

**State:** development-stage, not production-approved.

## Architecture

StudioTasker uses a portable Next.js + PostgreSQL architecture designed to move to the user's own VPS/domain.

Core controls:
- versioned PostgreSQL migrations;
- restricted non-superuser runtime role;
- FORCE Row Level Security on tenant data;
- verified studio + staff role context on protected APIs;
- scrypt password hashes;
- random server-side sessions stored as token hashes;
- HttpOnly cookies;
- parameterized SQL;
- transactional booking/capacity/credit operations;
- audit/activity records;
- encrypted PostgreSQL backup utilities.

## Staff-only identity

StudioTasker accounts are for studio staff:
- owner;
- manager;
- receptionist;
- instructor.

Member accounts and member identities have been removed from the product.

Available account flows:
- studio owner registration (release-gated);
- email verification;
- login/logout;
- password reset.

## Studio operations APIs

Protected studio APIs cover:
- people / CRM;
- classes and recurring series;
- studio-managed bookings/waitlists;
- attendance;
- internal class packages;
- class-credit corrections;
- follow-up tasks;
- StudioTasker Today;
- CSV import;
- studio settings;
- data export/privacy view;
- StudioTasker SaaS subscription.

A package template is an operational entitlement definition, not an online product sold through StudioTasker.

## No member-payment infrastructure

Migration `011_studio_only.sql` removes the experimental:
- member identities;
- member roles;
- public booking/self-signup fields;
- member purchase table;
- connected payment-account table;
- member-payment webhook-event table.

StudioTasker does not process or verify studio-member payments.

## StudioTasker SaaS billing

The separate B2B subscription layer can gate a studio's use of StudioTasker. Signed provider webhooks and idempotency are tested locally. Commercial launch still requires provider approval and live acceptance testing.

## Hosting portability

The repository contains a Dockerfile for a standard Node server. PostgreSQL may initially run on the same private VPS if capacity/backups are appropriate, then move to a dedicated service later.

Production values should be supplied only as runtime secrets:
- `DATABASE_URL`
- `MIGRATION_DATABASE_URL`
- SMTP account credentials
- StudioTasker billing provider credentials
- backup passphrase/output configuration

Never store production secrets, database dumps or customer data in the code repository.

## Remaining launch work

- own domain + HTTPS;
- private VPS;
- production PostgreSQL;
- SMTP/domain verification;
- StudioTasker $39.90/$418.80 subscription provider setup;
- off-site backup and successful clean restore;
- monitoring/log policy;
- GDPR/terms/privacy/retention/erasure review;
- browser/mobile/accessibility acceptance testing;
- load testing on target VPS;
- pilot feedback;
- independent security review.
