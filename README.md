# 10x Educator: server (Phases 1-2)
Zero dependencies, Node 18+. `npm test` runs every check offline (no accounts needed).

## Files
- `lib/engine.js` paper engine. Server only: never ship it to the browser.
- `lib/core.js` orders, payment verification, webhook, token access, answer-key gating.
- `lib/store.js` storage: memory for tests, Upstash Redis for production.
- `api/[route].js` Vercel adapter: `/api/create-order`, `verify`, `webhook`, `recover`, `paper`.

## Go-live checklist (do all of it in Razorpay TEST mode first)
1. Razorpay: finish KYC. Settings > Payment capture = Automatic. Copy Key ID and Secret.
2. Razorpay > Webhooks: URL `https://YOURDOMAIN/api/webhook`; events `payment.captured`, `order.paid`, `refund.processed`; choose a secret.
3. Upstash: create a free Redis database. Copy the REST URL and token.
4. Vercel: import this folder, add the variables from `.env.example`, deploy.
5. Use Razorpay's "send test webhook" and confirm it returns 200 (this also proves raw-body signature checking works on Vercel). Then pay in test mode and confirm `/api/paper` returns every answer key when the token is sent.
6. Only then swap to live keys.

## How the front-end uses it (Phase 3)
1. `POST /api/create-order {sku}` returns `{orderId, amount, keyId}`.
2. Open Razorpay Checkout with that `order_id`. On success, `POST /api/verify {orderId, paymentId, signature}` returns `{token, expiresAt}`.
3. Send `Authorization: Bearer <token>` to `GET /api/paper?subject=maths|science&seed=N`.
4. Lost token: `POST /api/recover {paymentId, contact}` (email or phone used to pay).

## Decisions you own (CATALOG in lib/core.js)
- Rs 99 = 7 days, Rs 199 = 30 days, both one-time (no auto-renew). Change days/prices there only.
- Vault and policy kits are switched off until the real files exist.
- If you register for GST, decide whether prices are GST-inclusive before going live.

## Not built yet
Auto-renew subscriptions, vault downloads, GST invoices, emails, an order dashboard, Class 9, Chemistry/Biology, circuit and mirror diagrams.

## Phase 3: the site (public/)
- `public/index.html` is the whole site; `public/legal.html` holds privacy, terms and refunds (a DRAFT for a lawyer or CA to review).
- Try it locally: `npm run dev`, open http://localhost:3000. It uses a fake Razorpay, so you can click through "Buy" without paying.
- Replace every `{{PLACEHOLDER}}` (name, GSTIN, address, email, WhatsApp, about, city). `npm run check` fails until none are left. Run it before every deploy.
- Decision for you: the 7-day refund window in legal.html.
- Not built yet: Hindi/bilingual papers, real PDF files (Print / save as PDF uses the browser), the school fee calculator (needs legal review first), Chemistry/Biology.

## Phase 4: AI-assisted question bank (the rule: no human approval, no publishing)
1. Set `REVIEWERS`, `GEMINI_API_KEY`, `GEMINI_MODEL`, `AI_DAILY_CALLS` (see `.env.example`). Each reviewer gets their own key, so every approval is signed with a name.
2. Open `/review.html`, sign in, and use "Generate": pick a subject id (e.g. `class10-chemistry`), class, chapter, marks and count. The AI writes questions, then a second AI call solves each one blind and compares. Items where it disagrees are flagged and cannot be approved without a tick that says the reviewer worked it out.
3. Reviewers edit, approve or reject. Only approved items can appear in papers.
4. A subject goes live automatically once it has 8 one-mark, 4 two-mark, 4 three-mark and 3 four-mark approved questions. It then appears in the site's subject list.
- Limits: the AI "second opinion" is not proof. Nothing here checks copyright or syllabus fit, so reviewers must. The Gemini adapter (`lib/llm.js`) follows Google's documented REST shape but has not been run live: make one test call before relying on it. Diagrams and Hindi are not part of AI items yet.
