import * as yup from 'yup'
import { P } from './patterns.js'

/**
 * yup schemas equivalent to src/model/order.as.
 * - Leaves and string arrays are `.strict()`: yup otherwise coerces (`'1'` -> 1, `10000000` ->
 *   `'10000000'`), which the model does not. Objects (and arrays of objects) stay non-strict so
 *   `stripUnknown` can rebuild them.
 * - required -> `.defined()` (rejects missing / undefined; null is rejected because schemas
 *   are not nullable). `.required()` is not used: on strings it also rejects `''`.
 * - optional -> `.nullable()` (yup schemas are optional by default); objects also get
 *   `.default(undefined)`, otherwise yup builds a missing object from its fields' defaults.
 * - `number()` rejects NaN but accepts ±Infinity, so numbers get a `finite` test.
 * - strict mode -> `.exact()` on every object (rejects unknown keys without stripping them);
 *   strip -> the `stripUnknown: true` validate option; passthrough -> yup's default.
 * - yup has no union type: the payment is a `yup.lazy()` that picks the first branch the
 *   value satisfies (card, else PayPal) and validates against it, so a value matching
 *   neither branch reports the PayPal branch's errors (one violation at `payment`).
 *
 * @param {'strict' | 'strip' | 'passthrough'} mode  unknown-property policy
 * @param {object} validateOptions  the options the schema is validated with (the union's
 *   branch probe uses the same unknown-key handling)
 */
export function buildYupSchemas(mode, validateOptions) {
  const obj = (shape) => {
    const o = yup.object(shape).default(undefined)
    return mode === 'strict' ? o.exact() : o
  }
  const str = () => yup.string().strict()
  // a non-strict array casts its elements (1 -> '1') whatever the element schema says
  const strArr = () => yup.array(str().defined()).strict()
  const num = () =>
    yup
      .number()
      .strict()
      .test('finite', '${path} must be a finite number', (n) => n == null || Number.isFinite(n))

  const Address = obj({
    street: str().min(1).defined(),
    city: str().min(1).defined(),
    state: str().matches(P.state).defined(),
    zip: str().matches(P.zip).defined(),
    country: str().nullable(),
  })

  const PaymentCard = obj({
    number: str().matches(P.cardNumber).defined(),
    expiry: str().matches(P.expiry).defined(),
    cvv: str().matches(P.cvv).defined(),
    holderName: str().min(1).defined(),
  }).defined()
  const PaymentPaypal = obj({ email: str().matches(P.email).defined() }).defined()
  const probe = { ...validateOptions, abortEarly: true }
  const Payment = yup.lazy((value) => (PaymentCard.isValidSync(value, probe) ? PaymentCard : PaymentPaypal))

  const OrderItem = obj({
    sku: str().min(1).max(64).defined(),
    name: str().min(1).max(256).defined(),
    quantity: num().integer().min(1).max(10000).defined(),
    unitPrice: num().min(0.01).max(999999.99).defined(),
    discount: num().nullable(),
    tags: strArr().nullable(),
    metadata: obj({
      color: str().nullable(),
      size: str().nullable(),
      weight: num().nullable(),
      customFields: yup.array(obj({ key: str().defined(), value: str().defined() }).defined()).nullable(),
    }).nullable(),
  })

  const Customer = obj({
    firstName: str().min(1).max(128).defined(),
    lastName: str().min(1).max(128).defined(),
    email: str().matches(P.email).defined(),
    phone: str().matches(P.phone).nullable(),
    shippingAddress: Address.defined(),
    billingAddress: Address.nullable(),
  })

  const Order = obj({
    orderId: str().matches(P.orderId).defined(),
    customer: Customer.defined(),
    items: yup.array(OrderItem.defined()).min(1).max(100).defined(),
    payment: Payment,
    subtotal: num().min(0).defined(),
    tax: num().min(0).defined(),
    shipping: num().min(0).defined(),
    total: num().min(0).defined(),
    notes: str().nullable(),
    couponCodes: strArr().nullable(),
    createdAt: str().defined(),
    updatedAt: str().nullable(),
  }).defined()

  return { order: Order, payment: Payment }
}
