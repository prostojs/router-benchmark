import { P } from './patterns.js'

/**
 * Plain JSON Schema (draft-07 compatible) equivalent to src/model/order.as, used by ajv.
 * - required -> listed in `required` (a key whose value is `undefined` counts as missing);
 *   optional -> left out of `required`, with `nullable: true` (accepts `null` as well);
 * - `type: 'number'` / `'integer'` reject NaN and ±Infinity in ajv;
 * - `pattern` gets the identical regex source;
 * - `A | B` -> `anyOf: [A, B]`;
 * - unknown-key policy: strict and strip close every object with `additionalProperties: false`
 *   (strip additionally runs ajv with `removeAdditional: true`); passthrough leaves objects open.
 *
 * @param {'strict' | 'strip' | 'passthrough'} mode  unknown-property policy
 */
export function buildJsonSchemas(mode) {
  const closed = mode !== 'passthrough'
  const nullable = (s) => ({ ...s, nullable: true })
  const obj = (properties, optional = []) => ({
    type: 'object',
    properties,
    required: Object.keys(properties).filter((k) => !optional.includes(k)),
    ...(closed ? { additionalProperties: false } : {}),
  })
  const str = (extra = {}) => ({ type: 'string', ...extra })
  const num = (extra = {}) => ({ type: 'number', ...extra })
  const pat = (re) => str({ pattern: re.source })
  const arr = (items, extra = {}) => ({ type: 'array', items, ...extra })

  const Address = obj(
    { street: str({ minLength: 1 }), city: str({ minLength: 1 }), state: pat(P.state), zip: pat(P.zip), country: nullable(str()) },
    ['country'],
  )
  const PaymentCard = obj({
    number: pat(P.cardNumber),
    expiry: pat(P.expiry),
    cvv: pat(P.cvv),
    holderName: str({ minLength: 1 }),
  })
  const PaymentPaypal = obj({ email: pat(P.email) })
  const Payment = { anyOf: [PaymentCard, PaymentPaypal] }

  const OrderItem = obj(
    {
      sku: str({ minLength: 1, maxLength: 64 }),
      name: str({ minLength: 1, maxLength: 256 }),
      quantity: { type: 'integer', minimum: 1, maximum: 10000 },
      unitPrice: num({ minimum: 0.01, maximum: 999999.99 }),
      discount: nullable(num()),
      tags: nullable(arr(str())),
      metadata: nullable(
        obj(
          {
            color: nullable(str()),
            size: nullable(str()),
            weight: nullable(num()),
            customFields: nullable(arr(obj({ key: str(), value: str() }))),
          },
          ['color', 'size', 'weight', 'customFields'],
        ),
      ),
    },
    ['discount', 'tags', 'metadata'],
  )

  const Customer = obj(
    {
      firstName: str({ minLength: 1, maxLength: 128 }),
      lastName: str({ minLength: 1, maxLength: 128 }),
      email: pat(P.email),
      phone: nullable(pat(P.phone)),
      shippingAddress: Address,
      billingAddress: nullable(Address),
    },
    ['phone', 'billingAddress'],
  )

  const Order = obj(
    {
      orderId: pat(P.orderId),
      customer: Customer,
      items: arr(OrderItem, { minItems: 1, maxItems: 100 }),
      payment: Payment,
      subtotal: num({ minimum: 0 }),
      tax: num({ minimum: 0 }),
      shipping: num({ minimum: 0 }),
      total: num({ minimum: 0 }),
      notes: nullable(str()),
      couponCodes: nullable(arr(str())),
      createdAt: str(),
      updatedAt: nullable(str()),
    },
    ['notes', 'couponCodes', 'updatedAt'],
  )

  return { order: Order, payment: Payment }
}
