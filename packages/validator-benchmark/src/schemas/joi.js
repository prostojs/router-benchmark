import Joi from 'joi'
import { P } from './patterns.js'

/**
 * joi schemas equivalent to src/model/order.as. The unknown-key policy and error collection
 * are validate options (see engines/joi.js); the schemas are the same in every mode.
 * - required -> `.required()`; optional -> `.allow(null)` (joi keys are optional by default
 *   and accept `undefined`);
 * - `Joi.string()` rejects `''` by default, so strings without a minimum length get `.allow('')`;
 * - `Joi.number()` rejects NaN and ±Infinity by default; type conversion is turned off with
 *   the `convert: false` option (joi would otherwise accept `'1'` as a number);
 * - `Joi.number()` also rejects values beyond ±`Number.MAX_SAFE_INTEGER` (`number.unsafe`); the
 *   model doesn't, so numbers without a bound inside the safe range get `.unsafe()`;
 * - `A | B` -> `Joi.alternatives().try(A, B)` (first matching branch wins).
 */
export function buildJoiSchemas() {
  const str = () => Joi.string().allow('')
  const num = () => Joi.number().unsafe()
  const req = (s) => s.required()

  const Address = Joi.object({
    street: req(Joi.string().min(1)),
    city: req(Joi.string().min(1)),
    state: req(Joi.string().pattern(P.state)),
    zip: req(Joi.string().pattern(P.zip)),
    country: str().allow(null),
  })

  const PaymentCard = Joi.object({
    number: req(Joi.string().pattern(P.cardNumber)),
    expiry: req(Joi.string().pattern(P.expiry)),
    cvv: req(Joi.string().pattern(P.cvv)),
    holderName: req(Joi.string().min(1)),
  })
  const PaymentPaypal = Joi.object({ email: req(Joi.string().pattern(P.email)) })
  const Payment = Joi.alternatives().try(PaymentCard, PaymentPaypal)

  const OrderItem = Joi.object({
    sku: req(Joi.string().min(1).max(64)),
    name: req(Joi.string().min(1).max(256)),
    quantity: req(Joi.number().integer().min(1).max(10000)),
    unitPrice: req(Joi.number().min(0.01).max(999999.99)),
    discount: num().allow(null),
    tags: Joi.array().items(str()).allow(null),
    metadata: Joi.object({
      color: str().allow(null),
      size: str().allow(null),
      weight: num().allow(null),
      customFields: Joi.array()
        .items(Joi.object({ key: req(str()), value: req(str()) }))
        .allow(null),
    }).allow(null),
  })

  const Customer = Joi.object({
    firstName: req(Joi.string().min(1).max(128)),
    lastName: req(Joi.string().min(1).max(128)),
    email: req(Joi.string().pattern(P.email)),
    phone: Joi.string().pattern(P.phone).allow(null),
    shippingAddress: req(Address),
    billingAddress: Address.allow(null),
  })

  const Order = Joi.object({
    orderId: req(Joi.string().pattern(P.orderId)),
    customer: req(Customer),
    items: req(Joi.array().items(OrderItem).min(1).max(100)),
    payment: req(Payment),
    subtotal: req(num().min(0)),
    tax: req(num().min(0)),
    shipping: req(num().min(0)),
    total: req(num().min(0)),
    notes: str().allow(null),
    couponCodes: Joi.array().items(str()).allow(null),
    createdAt: req(str()),
    updatedAt: str().allow(null),
  })

  return { order: req(Order), payment: req(Payment) }
}
