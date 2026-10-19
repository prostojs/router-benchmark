import * as z from 'zod'
import { P } from './patterns.js'

/**
 * Zod 4 schemas equivalent to src/model/order.as.
 *
 * Mapping notes (see README "Semantic equivalence"):
 * - atscript optional props (`prop?: T`) accept both `undefined` and `null`, so they map
 *   to `.nullish()` (not `.optional()`).
 * - `@expect.pattern` -> `.regex()` with the identical pattern (no z.email(): its
 *   built-in regex is stricter than the model's pattern).
 * - `@expect.int` -> `.int()`; `@expect.min/max` -> `.min()/.max()` (inclusive on both sides);
 *   `@expect.minLength/maxLength` -> `.min()/.max()` on strings and arrays.
 * - Non-finite numbers (NaN, ±Infinity) are rejected by both libraries by default.
 * - `A | B` -> `z.union([A, B])`: both try branches in declared order, first match wins.
 *
 * @param {'strict' | 'strip' | 'passthrough'} mode  unknown-property policy
 */
export function buildZodSchemas(mode) {
  const obj = mode === 'strict' ? z.strictObject : mode === 'passthrough' ? z.looseObject : z.object

  const ZAddress = obj({
    street: z.string().min(1),
    city: z.string().min(1),
    state: z.string().regex(P.state),
    zip: z.string().regex(P.zip),
    country: z.string().nullish(),
  })

  const ZPaymentCard = obj({
    number: z.string().regex(P.cardNumber),
    expiry: z.string().regex(P.expiry),
    cvv: z.string().regex(P.cvv),
    holderName: z.string().min(1),
  })

  const ZPaymentPaypal = obj({
    email: z.string().regex(P.email),
  })

  const ZPayment = z.union([ZPaymentCard, ZPaymentPaypal])

  const ZOrderItem = obj({
    sku: z.string().min(1).max(64),
    name: z.string().min(1).max(256),
    quantity: z.number().int().min(1).max(10000),
    unitPrice: z.number().min(0.01).max(999999.99),
    discount: z.number().nullish(),
    tags: z.array(z.string()).nullish(),
    metadata: obj({
      color: z.string().nullish(),
      size: z.string().nullish(),
      weight: z.number().nullish(),
      customFields: z.array(obj({ key: z.string(), value: z.string() })).nullish(),
    }).nullish(),
  })

  const ZCustomer = obj({
    firstName: z.string().min(1).max(128),
    lastName: z.string().min(1).max(128),
    email: z.string().regex(P.email),
    phone: z
      .string()
      .regex(P.phone)
      .nullish(),
    shippingAddress: ZAddress,
    billingAddress: ZAddress.nullish(),
  })

  const ZOrder = obj({
    orderId: z.string().regex(P.orderId),
    customer: ZCustomer,
    items: z.array(ZOrderItem).min(1).max(100),
    payment: ZPayment,
    subtotal: z.number().min(0),
    tax: z.number().min(0),
    shipping: z.number().min(0),
    total: z.number().min(0),
    notes: z.string().nullish(),
    couponCodes: z.array(z.string()).nullish(),
    createdAt: z.string(),
    updatedAt: z.string().nullish(),
  })

  return { order: ZOrder, payment: ZPayment }
}
