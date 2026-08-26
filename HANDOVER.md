# ShopPal-Variant — Feature Expansion Handover

> **Context:** A previous AI session added a large batch of new features to this repo.
> This document describes exactly what was done, what files were created/changed, and
> what still needs to be finished. Hand this to the next AI so it can pick up from here.

---

## 1. What this session did

The goal was to add **deep, chained user workflows** to the ShopPal e-commerce app:
browse → wishlist → move-to-cart → apply coupon → checkout with saved address/payment →
place order → tracking timeline → notifications → reorder → Q&A → recently viewed.

### Architecture recap (unchanged)
- `server/` — Node 20 + Express + TypeORM + Postgres (main API, port 3000)
- `client/` — React 18 + Vite + Tailwind + react-router 6 + axios (shopper SPA)
- `admin/` — React 18 admin SPA (not touched in this session)
- `support/` — Go support-ticket service
- `notifications/` — Go in-memory event sink

---

## 2. What was completed

### 2.1 Backend — new TypeORM entities

All new entity files were created and registered in `pg.data-source.ts`
(which was rewritten to import each class explicitly instead of using
`Object.values()` to avoid leaking TS enums).

| File | Table | Purpose |
|---|---|---|
| `server/src/shared/models/relationships/wishlist.relationship.ts` | `Wishlist` | `(user_id, product_id, added_at)` — mirrors Cart shape |
| `server/src/shared/models/entities/saved-address.entity.ts` | `SavedAddress` | Address book rows per user; `is_default` flag |
| `server/src/shared/models/entities/payment-method.entity.ts` | `PaymentMethod` | Tokenized card metadata — last 4 digits only, no PAN/CVV |
| `server/src/shared/models/entities/coupon.entity.ts` | `Coupon` | `percentage` or `flat` discount codes with usage limits / expiry |
| `server/src/shared/models/entities/order-tracking.entity.ts` | `OrderTracking` | Timeline events per order (`order_placed` → `delivered` \| `cancelled`) |
| `server/src/shared/models/entities/product-question.entity.ts` | `ProductQuestion` | User-submitted questions per product |
| `server/src/shared/models/entities/product-answer.entity.ts` | `ProductAnswer` | Answers to questions; `is_staff` flag |
| `server/src/shared/models/entities/recently-viewed.entity.ts` | `RecentlyViewed` | `(user_id, product_id, viewed_at)` upserted on every product visit |
| `server/src/shared/models/entities/user-notification.entity.ts` | `UserNotification` | Per-user in-app notification inbox |

Index files updated:
- `server/src/shared/models/entities/index.ts` — exports all new entities + enums
- `server/src/shared/models/relationships/index.ts` — added `Wishlist`
- `server/src/shared/db/pg.data-source.ts` — explicit entity list (no `Object.values()`)

`Order` entity (`server/src/shared/models/entities/order.entity.ts`) was extended with:
`coupon_code`, `discount_amount`, `subtotal`, `total`, `payment_method_id`

### 2.2 Backend — new API modules

Each module follows the exact same pattern as the existing carts/reviews/orders modules:
`router.ts` → `controller.ts` → `service.ts` → `repository.ts` + `validator.ts`

| Mount path | Directory | Key endpoints |
|---|---|---|
| `/wishlist` | `server/src/api/wishlist/` | `GET /:user_id`, `POST /:user_id`, `POST /:user_id/:product_id/move-to-cart` (deep chain: add to cart + remove from wishlist atomically), `DELETE /:user_id/:product_id`, `DELETE /:user_id` |
| `/address` | `server/src/api/addresses/` | `GET /:user_id`, `POST /:user_id`, `PATCH /:user_id/:address_id`, `POST /:user_id/:address_id/set-default`, `DELETE /:user_id/:address_id` |
| `/payment-method` | `server/src/api/payment-methods/` | `GET /:user_id`, `POST /:user_id`, `POST /:user_id/:id/set-default`, `DELETE /:user_id/:id` |
| `/coupon` | `server/src/api/coupons/` | `GET /` (active coupons), `POST /validate` (dry-run, no usage increment), `POST /apply` (increments usage — call at checkout submit), `POST /` (admin-only create) |
| `/tracking` | `server/src/api/order-tracking/` | `GET /:order_id` (any auth'd user), `POST /:order_id` (admin-only: push new event) |
| `/qna` | `server/src/api/qna/` | `GET /:product_id` (public), `POST /:product_id` (ask), `POST /answer/:question_id` (answer — also dispatches in-app notification to asker), `DELETE /:question_id` |
| `/recently-viewed` | `server/src/api/recently-viewed/` | `GET /:user_id`, `POST /:user_id` (upserts + trims to 30 per user) |
| `/notifications` | `server/src/api/notifications-inbox/` | `GET /:user_id` (returns items + `unread_count`), `POST /:user_id/read-all`, `POST /:user_id/:id/read`, `DELETE /:user_id/:id` |

### 2.3 Backend — extended existing modules

**`server/src/api/orders/`** — surgically extended (no breaking changes to existing routes):

- Added `GET /order/single/:order_id` — returns full order detail for the `/order/:id` page
- Added `POST /order/:order_id/reorder` — deep chain: copies all past order lines into the user's cart via `CartRepository.addProductToCart` (merges quantities)
- `createOrderForAuthenticatedUser` now:
  - prices the order server-side (no client-supplied total trusted)
  - applies coupon via `CouponService.apply` if `coupon_code` is provided
  - saves `subtotal`, `discount_amount`, `total` on the Order row
  - seeds `order_placed` + `payment_confirmed` tracking events
  - dispatches an `ORDER_PLACED` notification to the user's inbox
- `deleteOrder` (cancel) now:
  - appends a `cancelled` tracking event
  - dispatches an `ORDER_CANCELLED` inbox notification
- `updateOrder` now dispatches `ORDER_STATUS_CHANGED` inbox notification
- Validator updated: `coupon_code` and `payment_method_id` optional fields added to create schemas; `getSingleOrderSchema` and `reorderSchema` added
- Types file updated to add `coupon_code?` and `payment_method_id?` to create props

### 2.4 Backend — shared utilities

- **`server/src/shared/utils/notifier.ts`** — fire-and-forget `emitEvent()` helper that POSTs to the Go `notifications` service (`NOTIFICATIONS_URL` env var). Used by: Wishlist, Orders, QnA, Notifications inbox service. Modeled after the Go `support` service's notifier.
- **`server/src/shared/utils/helpers.ts`** — unchanged

### 2.5 Backend — DB schema + docker-compose

**`server/db/schema.sql`** — extended. The original DDL is preserved unchanged; all new DDL was appended as a new block using `CREATE TABLE IF NOT EXISTS` + `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` so it is safe to run against a fresh DB. Also includes:
- 3 new Postgres enum types (`Coupon_type_enum`, `OrderTracking_status_enum`, `UserNotification_type_enum`)
- Seed of 3 starter coupon codes: `WELCOME10`, `SAVE5`, `BIGSPENDER`

**`docker-compose.yml`** — `server` service now depends on `notifications` (so the URL is reachable) and has `NOTIFICATIONS_URL: "http://notifications:8082"` added to its env.

### 2.6 Backend — OpenAPI

**`server/openapi.yaml`** — 8 new tag entries and ~250 lines of path summaries appended. Not full schemas — just enough for Swagger UI to show all new endpoints when you browse `/docs`.

### 2.7 Backend — verification

`npx tsc --noEmit` in `server/` passes clean with zero errors.

---

### 2.8 Client — types

**`client/src/shared/types/entities.types.ts`** — fully replaced. Added:
`WishlistItem`, `SavedAddress`, `PaymentMethod`, `Coupon`, `ValidateCouponResult`,
`TrackingEventStatus`, `OrderTrackingEvent`, `OrderDetail`,
`ProductQuestion`, `ProductAnswer`, `RecentlyViewedItem`,
`NotificationType`, `UserNotification`.
`Order` extended with `coupon_code?`, `discount_amount?`, `subtotal?`, `total?`, `payment_method_id?`.

### 2.9 Client — services (new)

All new service files use the exact same `useCallback` + `AxiosInstance` hook pattern as the existing `cart.service.ts`:

| File | Hook | Purpose |
|---|---|---|
| `client/src/shared/services/wishlist.service.ts` | `useWishlistService` | getWishlist, addToWishlist, removeFromWishlist, clearWishlist, **moveToCart** |
| `client/src/shared/services/address.service.ts` | `useAddressService` | listAddresses, createAddress, updateAddress, deleteAddress, setDefaultAddress |
| `client/src/shared/services/payment-method.service.ts` | `usePaymentMethodService` | list, create, remove, setDefault |
| `client/src/shared/services/coupon.service.ts` | `useCouponService` | list, validate (dry-run), apply |
| `client/src/shared/services/tracking.service.ts` | `useTrackingService` | getTracking |
| `client/src/shared/services/qna.service.ts` | `useQnaService` | listForProduct, askQuestion, answerQuestion, deleteQuestion |
| `client/src/shared/services/recently-viewed.service.ts` | `useRecentlyViewedService` | list, record |
| `client/src/shared/services/notifications.service.ts` | `useNotificationsService` | list, markRead, markAllRead, remove |

**`client/src/shared/services/order.service.ts`** — extended (non-breaking):
- `getSingleOrder(orderId)` — fetches `/order/single/:id`
- `updateOrder(orderId, userId, update)` — PATCH
- `cancelOrder(orderId, userId)` — DELETE
- `reorder(orderId)` — POST `/:id/reorder`
- `addGuestOrder` and `addUserOrder` now accept optional `coupon_code` and `payment_method_id`

### 2.10 Client — API provider

**`client/src/shared/contexts/Api.provider.tsx`** — fully replaced. All 8 new service hooks are instantiated and exposed. The context type (`ApiProviderValue`) was updated to include: `wishlistApi`, `addressApi`, `paymentMethodApi`, `couponApi`, `trackingApi`, `qnaApi`, `recentlyViewedApi`, `notificationsApi`.

### 2.11 Client — new pages

| Route | File | What it does |
|---|---|---|
| `/wishlist` | `client/src/pages/wishlist/Wishlist.page.tsx` | Grid of saved items. **Move to cart** (deep chain — calls `/move-to-cart` endpoint). **Remove**. **Clear wishlist**. |
| `/notifications` | `client/src/pages/notifications/Notifications.page.tsx` | Full inbox. Unread badge. Filter unread. Mark single / mark all read. Delete notification. Relative timestamps. |
| `/account/addresses` | `client/src/pages/account/Addresses.page.tsx` | Address book: list saved addresses, add new, delete, set default. |
| `/account/payment-methods` | `client/src/pages/account/PaymentMethods.page.tsx` | Payment method manager: list cards (last-4 + brand only), add new, delete, set default. Never stores full PAN. |
| `/order/:id` | `client/src/pages/order/Order.page.tsx` | **Was a bare stub — now fully implemented.** Shows: tracking timeline (visual stepper), full event log, item list with line totals, coupon/discount breakdown, delivery address. Actions: **Reorder** (deep chain → fills cart), **Cancel order** (if still `purchased`). |

### 2.12 Client — new shared components

| File | Purpose |
|---|---|
| `client/src/shared/components/WishlistButton.tsx` | Heart button — hydrates state on mount, toggles wishlist membership. Added to `ProductDetails.tsx`. |
| `client/src/shared/components/RecentlyViewedStrip.tsx` | Horizontal scroll strip of recently viewed products. Added to `Home.page.tsx`. |
| `client/src/layouts/header/components/NotificationBell.tsx` | Bell icon in header with live unread badge (polls every 45s + on tab focus). Added to `Header.layout.tsx`. |

### 2.13 Client — modified existing files

| File | Change |
|---|---|
| `client/src/App.tsx` | Added routes: `/wishlist`, `/notifications`, `/account/addresses`, `/account/payment-methods`. All under `RequireAuth`. |
| `client/src/pages/home/Home.page.tsx` | Added `<RecentlyViewedStrip />` below the hero. |
| `client/src/pages/product/Product.page.tsx` | Added `<ProductQnA />` section. Added `recentlyViewedApi.record()` call on mount (fire-and-forget). |
| `client/src/pages/product/components/ProductDetails.tsx` | Added `<WishlistButton productId={product_id} />` next to the Add-to-Cart button. |
| `client/src/pages/checkout/Checkout.page.tsx` | Added coupon section in the sidebar, `grandTotal` display, coupon state wired to `useOrderHandlers`. |
| `client/src/pages/checkout/components/CouponSection.tsx` | New component — coupon code input with dry-run validation; shows saving amount. |
| `client/src/pages/checkout/hooks/useOrderHandling.tsx` | `couponCode` parameter added; forwarded to `addUserOrder` / `addGuestOrder`. |
| `client/src/layouts/header/Header.layout.tsx` | Added Wishlist nav link (logged-in only). Added `<NotificationBell />` in the aside. |
| `server/src/app.ts` | All 8 new routers mounted. |
| `server/src/api/orders/order.controller.ts` | Fully replaced — server-side pricing, coupon apply, tracking seeding, inbox notifications. |
| `server/src/api/orders/order.router.ts` | Added `GET /single/:id` and `POST /:id/reorder` routes. |
| `server/src/api/orders/order.validator.ts` | Added `getSingleOrderSchema`, `reorderSchema`, optional `coupon_code` + `payment_method_id` on create schemas. |
| `server/src/api/orders/order.service.ts` | Added `getSingleOrder`, `reorderToCart`, `seedInitialTracking`, `recordCancellation`. Imports `OrderTrackingService` + `CartRepository`. |
| `server/src/api/orders/order.repository.ts` | Added `getSingleOrder` and `getProductsForOrder` query methods. |
| `server/src/api/orders/order.types.ts` | Added `coupon_code?` and `payment_method_id?` to create order props. |

---

## 3. What is still TODO (remaining work for next AI)

All items below are well-scoped and require no new architectural decisions — just follow the patterns already established in this session.

### HIGH priority

#### 3.1 Client TS compilation check
Run `npm install && npx tsc --noEmit` inside `client/`. **Likely to have a handful of
import errors or type mismatches** (e.g. `OrderStatus` import in `order.service.ts` may
need the full enum import path; `useMessages` hook return type; `displayMessage` signature).
Fix any errors found — do not skip.

#### 3.2 Profile page — add new tabs
File: `client/src/pages/profile/Profile.page.tsx`

Currently has 3 tabs: Advanced Info, Order History, Edit Profile.
Add 2 more tabs:
- **Addresses** → renders `<AddressesPage />` inline (or re-export its content as a component)
- **Payment Methods** → renders `<PaymentMethodsPage />` inline

Pattern: just add buttons + conditionals like the existing 3 tabs. Import from
`@/pages/account/Addresses.page` and `@/pages/account/PaymentMethods.page`.

#### 3.3 Profile Order History — per-order action buttons
File: `client/src/pages/profile/components/order-history/OrderHistory.component.tsx`
(and siblings in that folder — read them first to understand the accordion structure)

Each order accordion should get:
- A **Track / View Details** link → `<Link to={/order/${order.order_id}}>Track</Link>`
- A **Reorder** button → calls `orderApi.reorder(order.order_id)` then navigates to `/cart`
- A **Cancel** button (only shown if `order.order_status === 'purchased'`) → calls
  `orderApi.cancelOrder(order.order_id, user.user_id)` then refreshes the list

These are the same calls as in `Order.page.tsx` — you can copy from there.

### MEDIUM priority

#### 3.4 HamburgerMenu — new links
File: `client/src/layouts/header/components/HamburgerMenu.component.tsx`

After the Profile link block, add (for logged-in users only):
```tsx
<li><Link to="/wishlist" onClick={...}>Wishlist</Link></li>
<li><Link to="/notifications" onClick={...}>Notifications</Link></li>
```

#### 3.5 Checkout — address book dropdown
File: `client/src/pages/checkout/hooks/useFormData.tsx` + `CheckoutForm.tsx`

When the user is logged in and has saved addresses, show a `<select>` dropdown above
the manual address fields labelled "Use a saved address". On selection, pre-fill
`formData.country/city/street`. Call `addressApi.listAddresses(userId)` in a `useEffect`.

Pattern: the existing `fillDetails` toggle already fetches profile data and pre-fills — do
the same for addresses.

#### 3.6 Checkout — payment method dropdown
Same approach as 3.5 but for payment methods. Show a dropdown of saved cards
(display: `{brand} •••• {last_four}`). On selection set `formData.cardNumber` to a fake
value like `**** **** **** ${last_four}` and store the real `payment_method_id` to pass
to the order.

---

## 4. File map — every new/modified file at a glance

```
server/
  src/
    app.ts                                          MODIFIED — 8 new router mounts
    shared/
      db/pg.data-source.ts                         MODIFIED — explicit entity list
      models/
        entities/index.ts                          MODIFIED — exports 8 new entities
        entities/saved-address.entity.ts           NEW
        entities/payment-method.entity.ts          NEW
        entities/coupon.entity.ts                  NEW
        entities/order-tracking.entity.ts          NEW
        entities/product-question.entity.ts        NEW
        entities/product-answer.entity.ts          NEW
        entities/recently-viewed.entity.ts         NEW
        entities/user-notification.entity.ts       NEW
        entities/order.entity.ts                   MODIFIED — coupon/discount/total cols
        relationships/index.ts                     MODIFIED — added Wishlist export
        relationships/wishlist.relationship.ts     NEW
      utils/notifier.ts                            NEW — fire-and-forget event emitter
    api/
      wishlist/                                    NEW (5 files)
      addresses/                                   NEW (5 files)
      payment-methods/                             NEW (5 files)
      coupons/                                     NEW (5 files)
      order-tracking/                              NEW (5 files)
      qna/                                         NEW (5 files)
      recently-viewed/                             NEW (5 files)
      notifications-inbox/                         NEW (5 files)
      orders/
        order.controller.ts                        MODIFIED — full rewrite with chains
        order.router.ts                            MODIFIED — 2 new routes
        order.service.ts                           MODIFIED — 4 new methods
        order.repository.ts                        MODIFIED — 2 new query methods
        order.types.ts                             MODIFIED — optional coupon/payment
        order.validator.ts                         MODIFIED — 2 new schemas + optional fields
  db/
    schema.sql                                     MODIFIED — new tables appended

docker-compose.yml                                 MODIFIED — server gets NOTIFICATIONS_URL

client/
  src/
    App.tsx                                        MODIFIED — 4 new routes
    shared/
      types/entities.types.ts                      MODIFIED — 8 new types
      contexts/Api.provider.tsx                    MODIFIED — 8 new services wired
      services/wishlist.service.ts                 NEW
      services/address.service.ts                  NEW
      services/payment-method.service.ts           NEW
      services/coupon.service.ts                   NEW
      services/tracking.service.ts                 NEW
      services/qna.service.ts                      NEW
      services/recently-viewed.service.ts          NEW
      services/notifications.service.ts            NEW
      services/order.service.ts                    MODIFIED — 4 new methods + coupon
      components/WishlistButton.tsx                NEW
      components/RecentlyViewedStrip.tsx           NEW
    layouts/header/
      Header.layout.tsx                            MODIFIED — wishlist link + bell
      components/NotificationBell.tsx              NEW
    pages/
      home/Home.page.tsx                           MODIFIED — RecentlyViewedStrip added
      product/Product.page.tsx                     MODIFIED — QnA + record view
      product/components/ProductDetails.tsx        MODIFIED — WishlistButton added
      product/components/ProductQnA.tsx            NEW
      order/Order.page.tsx                         MODIFIED — full implementation
      wishlist/Wishlist.page.tsx                   NEW
      notifications/Notifications.page.tsx         NEW
      account/Addresses.page.tsx                   NEW
      account/PaymentMethods.page.tsx              NEW
      checkout/Checkout.page.tsx                   MODIFIED — coupon section + grandTotal
      checkout/components/CouponSection.tsx        NEW
      checkout/hooks/useOrderHandling.tsx          MODIFIED — couponCode param
```

---

## 5. Key design decisions for next AI to be aware of

1. **Server-side pricing.** The order controller computes `subtotal`, `discount_amount`,
   and `total` from the DB using `In([...product_ids])` — never trusting the client total.
   Coupon is applied via `CouponService.apply()` which also increments `times_used`.

2. **Wishlist move-to-cart is a single server endpoint** (`POST /wishlist/:user_id/:product_id/move-to-cart`)
   that calls `CartRepository.addProductToCart` (existing upsert logic) and then
   `WishlistRepository.removeFromWishlist` in sequence. Atomic enough for this scale.

3. **Notifications are dual-path:** every inbox write (`NotificationService.createForUser`)
   also calls `emitEvent()` to fan out to the Go `notifications` microservice for platform
   observability. Both are fire-and-forget.

4. **`synchronize: false`** — TypeORM is not auto-syncing. All new tables live in
   `server/db/schema.sql` using `CREATE TABLE IF NOT EXISTS`. For a fresh stack (`docker-compose up`),
   Postgres bootstraps from that file. **For an existing volume**, you need to connect to
   the running Postgres container and run the new DDL manually, or delete the volume and
   restart.

5. **No migration tooling.** The project has no TypeORM migration runner. The ARCHITECTURE.md
   recipe is to regenerate `schema.sql` from a running container. The new DDL is already in
   `schema.sql` — so fresh boots are fine.

6. **Coupon `apply` vs `validate`.** `POST /coupon/validate` is a dry-run that does NOT
   increment `times_used`. `POST /coupon/apply` does. The checkout flow calls `validate`
   live (on blur/button click in `CouponSection`) but the server-side `createOrder` calls
   `apply` internally, so usage is only incremented once per real order.

7. **`RecentlyViewed` uses a raw SQL upsert** (`ON CONFLICT (user_id, product_id) DO UPDATE SET viewed_at = NOW()`)
   because TypeORM's query builder doesn't cleanly support composite-PK upserts.

8. **`ProductQnA` renders answers inline** in a single query (SQL `json_agg`) to avoid N+1.
   The query builder in `qna.repository.ts` joins `ProductAnswer` and `User` in one shot.

9. **`NotificationBell` polls every 45 seconds** and also re-fetches on `visibilitychange`.
   It only fetches `limit: 1, unread_only: true` and reads `unread_count` from the response.
