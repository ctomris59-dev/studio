# StudioTasker product boundary — no member commerce

This document replaces the earlier member-commerce experiment.

## Decision

StudioTasker is a **studio-facing B2B operations product**. StudioTasker does not act as a payment platform, merchant intermediary, consumer booking product or member account system.

The prior experimental Stripe Connect/member checkout/member portal implementation has been removed from the application and database model by migration `011_studio_only.sql`.

## What an internal package means

A studio may define an internal class-package template:
- name;
- number of class credits;
- validity in days;
- optional description.

Staff may confirm that a member is entitled to that package. That creates/updates operational credits and validity inside StudioTasker.

**Confirmed does not mean StudioTasker verified a payment.**

The studio remains responsible for how, where and whether it collects money from its member. StudioTasker does not need or store the payment method.

## What StudioTasker bills

StudioTasker may charge the **studio** for use of the SaaS:
- $39.90/month;
- $418.80/year ($34.90/month equivalent when prepaid annually).

That B2B subscription can be handled by the configured StudioTasker billing provider. It is unrelated to member class-pack money.

## Explicitly out of scope

- Stripe Connect or equivalent member-payment orchestration
- member card checkout
- member wallet/payment history
- refunds/chargebacks
- public member self-registration
- member login/portal
- public booking marketplace
- automated member payment reminders
- settlement or payout handling

## Operational signals retained

StudioTasker Today may still flag:
- trial not converted;
- low credits / upcoming expiry;
- inactive member;
- package status requiring staff review;
- open class capacity;
- overdue follow-up.

These are studio workflow signals only.
