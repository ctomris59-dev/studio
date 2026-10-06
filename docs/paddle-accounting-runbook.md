# StudioTasker — Paddle payout and accounting runbook

**Purpose:** operational control for StudioTasker's own SaaS revenue. This is not a substitute for Turkish accounting/tax advice.

## Hard launch rule

Do not set `LAUNCH_TAX_REVIEW_CONFIRMED=true` until a qualified Turkish accountant/tax adviser has reviewed the actual operator status, Paddle contract/payout entity, bank account, invoice/e-document obligations, foreign-currency bookkeeping, VAT treatment and income-tax treatment.

Paddle being Merchant of Record covers the **buyer transaction sales-tax/VAT collection and remittance** handled by Paddle. It does not eliminate StudioTasker's own Turkish bookkeeping, income/corporate tax, e-document or other local obligations.

## Documents to retain for every accounting period

Download and archive, by payout currency and period:

1. Paddle monthly Statement.
2. Paddle Reverse Invoice(s).
3. Paddle Remittance Advice.
4. Paddle Transactions report for transaction-level reconciliation.
5. Bank statement showing the received Paddle payout and bank/SWIFT/FX charges.
6. Refund/dispute evidence for material adjustments.
7. Any locally required bookkeeping/e-document record instructed by the Turkish accountant.

Paddle states that it automatically creates a Reverse Invoice for seller payouts rather than requiring the supplier to send Paddle a normal invoice. Treat that as source documentation for the accountant; do not assume it replaces any separate Turkish statutory record unless the accountant confirms this for the actual operator.

## Monthly reconciliation

For each Paddle statement period:

- reconcile opening balance;
- gross buyer transactions;
- refunds and disputes;
- sales taxes withheld/remitted by Paddle;
- Paddle fees and adjustments;
- closing balance;
- payout amount;
- Reverse Invoice total(s);
- Remittance Advice;
- amount received at the bank;
- bank/SWIFT/FX differences.

Any unexplained difference stays open until reconciled. Do not book unexplained net cash as revenue without the supporting Paddle statement/reverse-invoice trail.

## Buyer invoices and refunds

Paddle is the Merchant of Record for StudioTasker subscription orders.

- Do not issue a competing StudioTasker sales invoice to a Paddle buyer for the same Paddle transaction.
- Do not send a direct refund outside Paddle for a Paddle transaction.
- Use Paddle's buyer billing documents, refund workflow and Customer Portal.
- StudioTasker may approve/request an appropriate refund through Paddle, but the buyer transaction remains with Paddle.

## Currency

Marketing prices are currently USD ($39.90 monthly / $406.80 annual, equivalent to $33.90/month and about 15% lower than paying monthly for twelve months). Paddle may display/collect localized amounts and taxes. The amount eventually paid to the StudioTasker operator may differ from gross buyer sales because of taxes handled by Paddle, Paddle fees, refunds/disputes, payout currency conversion and bank charges.

Use the accountant-approved exchange-rate/bookkeeping method consistently.

## Record retention and access

Accounting records must be retained for the statutory period applicable to the operator and kept accessible for audit. The exact Turkish retention period and e-document retention method must be confirmed by the accountant before live sales.

Keep Paddle Admin/Finance access limited. Enable strong account security and do not store Paddle API keys in the repository.

## Quarterly control

At least quarterly:

- confirm the legal operator identity still matches the Paddle account;
- confirm payout bank details;
- verify published StudioTasker prices against Paddle live price IDs;
- reconcile Paddle fees/refunds/disputes;
- review whether Turkish tax/e-document treatment has changed;
- verify legal pages still describe the actual hosting/email/payment setup;
- confirm `LAUNCH_TAX_REVIEW_CONFIRMED` remains truthful.

If the operator structure changes (individual → company, address, tax status, country, bank or Paddle entity relationship), set the launch review flags back to false until the new setup is reviewed.
