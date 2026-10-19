import Type from 'typebox'
import { P } from './patterns.js'

/**
 * TypeBox 1.x types equivalent to src/model/order.as (TypeBox types are JSON Schema).
 * - optional -> `Type.Optional(Type.Union([T, Type.Null()]))`: TypeBox accepts an explicit
 *   `undefined` on an optional key, and the union adds `null`;
 * - `Type.Number()` / `Type.Integer()` reject NaN and ±Infinity;
 * - `pattern` gets the identical regex source;
 * - `A | B` -> `Type.Union([A, B])`;
 * - strict closes every object with `additionalProperties: false`; strip and passthrough leave
 *   objects open (strip removes unknown keys with `Clean()` after a successful check).
 *
 * @param {'strict' | 'strip' | 'passthrough'} mode  unknown-property policy
 */
export function buildTypeboxSchemas(mode) {
  const objOpts = mode === 'strict' ? { additionalProperties: false } : {}
  const obj = (props) => Type.Object(props, objOpts)
  const opt = (t) => Type.Optional(Type.Union([t, Type.Null()]))
  const pat = (re) => Type.String({ pattern: re.source })

  const Address = obj({
    street: Type.String({ minLength: 1 }),
    city: Type.String({ minLength: 1 }),
    state: pat(P.state),
    zip: pat(P.zip),
    country: opt(Type.String()),
  })

  const PaymentCard = obj({
    number: pat(P.cardNumber),
    expiry: pat(P.expiry),
    cvv: pat(P.cvv),
    holderName: Type.String({ minLength: 1 }),
  })
  const PaymentPaypal = obj({ email: pat(P.email) })
  const Payment = Type.Union([PaymentCard, PaymentPaypal])

  const OrderItem = obj({
    sku: Type.String({ minLength: 1, maxLength: 64 }),
    name: Type.String({ minLength: 1, maxLength: 256 }),
    quantity: Type.Integer({ minimum: 1, maximum: 10000 }),
    unitPrice: Type.Number({ minimum: 0.01, maximum: 999999.99 }),
    discount: opt(Type.Number()),
    tags: opt(Type.Array(Type.String())),
    metadata: opt(
      obj({
        color: opt(Type.String()),
        size: opt(Type.String()),
        weight: opt(Type.Number()),
        customFields: opt(Type.Array(obj({ key: Type.String(), value: Type.String() }))),
      }),
    ),
  })

  const Customer = obj({
    firstName: Type.String({ minLength: 1, maxLength: 128 }),
    lastName: Type.String({ minLength: 1, maxLength: 128 }),
    email: pat(P.email),
    phone: opt(pat(P.phone)),
    shippingAddress: Address,
    billingAddress: opt(Address),
  })

  const Order = obj({
    orderId: pat(P.orderId),
    customer: Customer,
    items: Type.Array(OrderItem, { minItems: 1, maxItems: 100 }),
    payment: Payment,
    subtotal: Type.Number({ minimum: 0 }),
    tax: Type.Number({ minimum: 0 }),
    shipping: Type.Number({ minimum: 0 }),
    total: Type.Number({ minimum: 0 }),
    notes: opt(Type.String()),
    couponCodes: opt(Type.Array(Type.String())),
    createdAt: Type.String(),
    updatedAt: opt(Type.String()),
  })

  return { order: Order, payment: Payment }
}
