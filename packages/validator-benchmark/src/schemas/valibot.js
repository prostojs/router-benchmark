import * as v from 'valibot'
import { P } from './patterns.js'

/**
 * valibot schemas equivalent to src/model/order.as (same mapping as the zod schemas).
 * - optional props -> `v.nullish()` (atscript optional accepts `undefined` and `null`);
 * - `v.number()` rejects NaN but accepts ±Infinity, so every number gets `v.finite()`;
 * - `A | B` -> `v.union([A, B])` (branches tried in order).
 *
 * @param {'strict' | 'strip' | 'passthrough'} mode  unknown-property policy
 */
export function buildValibotSchemas(mode) {
  const obj = mode === 'strict' ? v.strictObject : mode === 'passthrough' ? v.looseObject : v.object
  const str = (...checks) => (checks.length ? v.pipe(v.string(), ...checks) : v.string())
  const num = (...checks) => v.pipe(v.number(), v.finite(), ...checks)

  const Address = obj({
    street: str(v.minLength(1)),
    city: str(v.minLength(1)),
    state: str(v.regex(P.state)),
    zip: str(v.regex(P.zip)),
    country: v.nullish(str()),
  })

  const PaymentCard = obj({
    number: str(v.regex(P.cardNumber)),
    expiry: str(v.regex(P.expiry)),
    cvv: str(v.regex(P.cvv)),
    holderName: str(v.minLength(1)),
  })
  const PaymentPaypal = obj({ email: str(v.regex(P.email)) })
  const Payment = v.union([PaymentCard, PaymentPaypal])

  const OrderItem = obj({
    sku: str(v.minLength(1), v.maxLength(64)),
    name: str(v.minLength(1), v.maxLength(256)),
    quantity: num(v.integer(), v.minValue(1), v.maxValue(10000)),
    unitPrice: num(v.minValue(0.01), v.maxValue(999999.99)),
    discount: v.nullish(num()),
    tags: v.nullish(v.array(str())),
    metadata: v.nullish(
      obj({
        color: v.nullish(str()),
        size: v.nullish(str()),
        weight: v.nullish(num()),
        customFields: v.nullish(v.array(obj({ key: str(), value: str() }))),
      }),
    ),
  })

  const Customer = obj({
    firstName: str(v.minLength(1), v.maxLength(128)),
    lastName: str(v.minLength(1), v.maxLength(128)),
    email: str(v.regex(P.email)),
    phone: v.nullish(str(v.regex(P.phone))),
    shippingAddress: Address,
    billingAddress: v.nullish(Address),
  })

  const Order = obj({
    orderId: str(v.regex(P.orderId)),
    customer: Customer,
    items: v.pipe(v.array(OrderItem), v.minLength(1), v.maxLength(100)),
    payment: Payment,
    subtotal: num(v.minValue(0)),
    tax: num(v.minValue(0)),
    shipping: num(v.minValue(0)),
    total: num(v.minValue(0)),
    notes: v.nullish(str()),
    couponCodes: v.nullish(v.array(str())),
    createdAt: str(),
    updatedAt: v.nullish(str()),
  })

  return { order: Order, payment: Payment }
}
