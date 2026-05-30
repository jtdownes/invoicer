# dc-invoice — Project Plan

## What It Is

A web-based invoicing SaaS for small business owners. Customers can pay directly on the invoice,
and money routes straight to the business owner's bank account via Stripe Connect — no PayPal
middleman, better payout rates, less friction.

Starting customers: brother (~$25/mo) and mom (~$25/mo). Goal is to grow to real paying users
via word of mouth and eventually a PWA/iOS presence.

---

## Revenue Model

| Tier | Price | Notes |
|---|---|---|
| Flat subscription | $25/month | Simple, predictable |
| Hybrid (future) | $10/month + 0.5% on payments | Scales with user volume |

Competitor comparison: brother currently pays $16/month for FreshBooks/similar **and** loses 1.5%
on every PayPal instant transfer. We beat both.

---

## Core Features

### Invoice Management
- Create invoices with reusable templates
- Auto-fill client data (name, address, email, payment terms)
- Line items, tax, discounts
- Invoice status: draft → sent → viewed → paid → overdue
- PDF generation (download + email attachment)

### Delivery & Tracking
- Send invoice via email
- Open/view tracking (pixel tracking — know the moment they open it)
- Reminder scheduling (send reminder if unpaid after X days)

### Payment Collection
- Hosted payment page on the invoice itself
- Accepted methods: credit/debit card, PayPal, Klarna, Affirm
- Stripe handles card + Klarna + Affirm in one integration
- PayPal as a separate SDK (unavoidable — customers expect it)

### Payouts (the differentiator)
- Stripe Connect Express — user connects their bank account once during onboarding
- Money routes directly to their bank, not a platform wallet
- Standard payout: free, 2 business days
- Instant payout: 1.0% fee (vs PayPal's 1.5% — already better)
- Stripe handles all KYC/identity verification — we are not a bank

### Client Management
- Client address book
- Invoice history per client
- Outstanding balance at a glance

---

## Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Frontend | React + Vite | Consistent with dc- ecosystem |
| Backend | FastAPI | Consistent with dc- ecosystem |
| Database | Postgres | Existing dc- cluster at 5440 |
| Auth | Clerk | Don't build auth for a paid product |
| Payments | Stripe Connect Express | Card + Klarna + Affirm + direct payouts |
| PayPal | PayPal JS SDK | Separate integration, customers expect it |
| Email | Postmark | Open tracking built-in, reliable delivery |
| PDF (server) | Puppeteer | Headless Chrome renders invoice HTML to PDF |
| PDF (preview) | react-pdf or iframe | In-browser preview before sending |
| Hosting | TrueNAS/Dockge (dev) → VPS/Railway (prod) | |

---

## Architecture: Multi-Tenant + Stripe Connect

Every user (business owner) is a **tenant**. Each tenant has:
- Their own clients, invoices, templates
- A connected Stripe account (Express) linked at onboarding
- Their own payout bank account (managed by Stripe, not us)

When a customer pays an invoice:
1. Stripe charges the customer
2. Stripe routes the funds to the tenant's connected account
3. Platform fee (if any) is taken as an application fee before routing
4. Payout hits tenant's bank on their chosen schedule

---

## Data Model (High Level)

```
users (tenants)
  id, email, name, business_name, stripe_account_id, plan, created_at

clients
  id, user_id, name, email, address, phone, notes

invoices
  id, user_id, client_id, invoice_number, status, due_date
  subtotal, tax, discount, total
  stripe_payment_intent_id, paid_at, sent_at, viewed_at

invoice_items
  id, invoice_id, description, quantity, unit_price, amount

templates
  id, user_id, name, logo_url, color, payment_terms, footer_notes

email_events
  id, invoice_id, event_type (sent/opened/clicked), occurred_at, ip_address
```

---

## Build Phases

### Phase 1 — MVP (4-6 weeks evenings)
Goal: brother and mom can use it end to end

- [ ] Auth (Clerk) + user onboarding
- [ ] Stripe Connect Express onboarding flow
- [ ] Client CRUD
- [ ] Invoice creation + line items
- [ ] PDF generation (Puppeteer)
- [ ] Email send via Postmark
- [ ] Open tracking (pixel)
- [ ] Stripe hosted payment page on invoice
- [ ] Webhook handler: mark invoice paid on Stripe event
- [ ] Basic dashboard: outstanding, paid, overdue totals

### Phase 2 — Polish (2-3 weeks)
Goal: something you'd show a stranger

- [ ] Invoice templates + branding (logo, colors)
- [ ] PayPal payment option
- [ ] Klarna / Affirm via Stripe
- [ ] Reminder emails (scheduled, configurable)
- [ ] Client portal (customer can view all their invoices at one URL)
- [ ] Instant payout option for tenants
- [ ] Subscription billing (Stripe Billing for your own users)

### Phase 3 — Growth
- [ ] PWA (installable on iPhone from Safari — no App Store needed yet)
- [ ] Mobile-optimized invoice view and creation
- [ ] Reporting: revenue over time, top clients, avg days to pay
- [ ] Recurring invoices
- [ ] Estimates / quotes that convert to invoices
- [ ] React Native app (revisit after PWA validates demand)

---

## Open Questions

1. **Domain** — what's the product name? (dc-invoice is just the stack name)
2. **Pricing page** — charge per user seat or flat per account?
3. **Free trial** — 14 days free, no card? Or freemium with invoice cap?
4. **PayPal payout** — do we support PayPal as a payout destination, or bank only?
5. **Tax handling** — flat tax rate per invoice, or automated sales tax (Stripe Tax)?

---

## Why This Beats What Brother Uses Now

| Feature | Current app | dc-invoice |
|---|---|---|
| Monthly cost | $16 | $25 (but saves money overall) |
| Payout method | PayPal → bank (1.5% instant fee) | Direct to bank (free or 1% instant) |
| View tracking | Yes | Yes |
| Card payments | Yes | Yes |
| Klarna/Affirm | Unknown | Yes (Stripe native) |
| Custom branding | Limited | Full control |
| You own your data | No | Yes |
