import { type } from 'arktype'
import { P } from './patterns.js'

const MAX = Number.MAX_VALUE

/**
 * ArkType 2 types equivalent to src/model/order.as.
 * - optional -> `'key?': T | null | undefined` (ArkType's optional keys reject an explicit
 *   `undefined` unless it is part of the value type);
 * - `number` rejects NaN but accepts ±Infinity: required numbers without an upper bound get
 *   `.atMost(Number.MAX_VALUE)` (and `.atLeast(-Number.MAX_VALUE)` without a lower one), which
 *   is exactly "finite" and stays a native range constraint;
 * - optional numbers (`number | null | undefined`) use `.narrow(Number.isFinite)` instead:
 *   ArkType 2.2.8 drops the NaN check of the `number` branch when it discriminates a union by
 *   `typeof` (`type('number | null')(NaN)` passes), and range constraints don't catch NaN
 *   (every comparison with NaN is false), so only a narrow rejects it;
 * - `A | B` -> `A.or(B)`. ArkType unions are unordered (it picks the branch itself); with no
 *   morphs on either branch the accept/reject result is the same as the model's first-match
 *   union, and the output is the input either way;
 * - unknown keys: `'+': 'reject'` (strict) / `'ignore'` (passthrough, the default) on every
 *   object. Strip (`'+': 'delete'`) can't be built: ArkType refuses a union of two objects
 *   that both delete undeclared keys ("an unordered union of a type including a morph and a
 *   type with overlapping input is indeterminate"), so the strip mode is not run.
 *
 * @param {'strict' | 'passthrough'} mode  unknown-property policy
 */
export function buildArktypeSchemas(mode) {
  if (mode === 'strip') throw new Error('arktype: strip mode is not supported (see schemas/arktype.js)')
  const undeclared = mode === 'strict' ? 'reject' : 'ignore'
  const obj = (def) => type({ '+': undeclared, ...def })
  const pat = (re) => type.string.matching(re)
  const optFinite = type.number.narrow((n) => Number.isFinite(n))
  const nonNeg = type.number.atLeast(0).atMost(MAX)
  const opt = (t) => type(t).or('null').or('undefined')

  const Address = obj({
    street: 'string >= 1',
    city: 'string >= 1',
    state: pat(P.state),
    zip: pat(P.zip),
    'country?': opt('string'),
  })

  const PaymentCard = obj({
    number: pat(P.cardNumber),
    expiry: pat(P.expiry),
    cvv: pat(P.cvv),
    holderName: 'string >= 1',
  })
  const PaymentPaypal = obj({ email: pat(P.email) })
  const Payment = PaymentCard.or(PaymentPaypal)

  const Metadata = obj({
    'color?': opt('string'),
    'size?': opt('string'),
    'weight?': opt(optFinite),
    'customFields?': opt(obj({ key: 'string', value: 'string' }).array()),
  })

  const OrderItem = obj({
    sku: '1 <= string <= 64',
    name: '1 <= string <= 256',
    quantity: '1 <= number.integer <= 10000',
    unitPrice: '0.01 <= number <= 999999.99',
    'discount?': opt(optFinite),
    'tags?': opt('string[]'),
    'metadata?': opt(Metadata),
  })

  const Customer = obj({
    firstName: '1 <= string <= 128',
    lastName: '1 <= string <= 128',
    email: pat(P.email),
    'phone?': opt(pat(P.phone)),
    shippingAddress: Address,
    'billingAddress?': opt(Address),
  })

  const Order = obj({
    orderId: pat(P.orderId),
    customer: Customer,
    items: OrderItem.array().atLeastLength(1).atMostLength(100),
    payment: Payment,
    subtotal: nonNeg,
    tax: nonNeg,
    shipping: nonNeg,
    total: nonNeg,
    'notes?': opt('string'),
    'couponCodes?': opt('string[]'),
    createdAt: 'string',
    'updatedAt?': opt('string'),
  })

  return { order: Order, payment: Payment }
}
