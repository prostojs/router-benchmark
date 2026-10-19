import 'reflect-metadata'
import {
  ArrayMaxSize, ArrayMinSize, IsArray, IsInt, IsNumber, IsObject, IsOptional, IsString,
  Matches, Max, MaxLength, Min, MinLength, ValidateNested, validateSync,
} from 'class-validator'
import { Transform, Type, plainToInstance } from 'class-transformer'
import { P } from './patterns.js'

/**
 * Applies property decorators the way TypeScript's legacy (`experimentalDecorators` +
 * `emitDecoratorMetadata`) output does: `design:type` metadata, then the decorators bottom-up.
 * This file is plain JS, so `decorate(Cls, 'prop', String, A(), B())` stands for
 * `@A() @B() prop: string` in a TS class.
 */
function decorate(Cls, prop, designType, ...decorators) {
  Reflect.defineMetadata('design:type', designType, Cls.prototype, prop)
  for (const d of decorators.reverse()) d(Cls.prototype, prop)
}

/** A plain object (not null, not an array): the only input a class can be built from. */
export const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)

/**
 * class-validator + class-transformer classes equivalent to src/model/order.as. Built per mode
 * because the payment union needs the mode's validate options (see `toPayment`).
 * - required -> no `@IsOptional()`; a type decorator (`@IsString()`, `@IsNumber()`, `@IsObject()`
 *   …) rejects missing / undefined / null. optional -> `@IsOptional()` (skips undefined and null);
 * - `@IsNumber()` rejects NaN and ±Infinity by default; `@IsInt()` requires an integer;
 * - nested objects: `@IsObject() @ValidateNested() @Type(() => Cls)` (`@IsObject()` also rejects
 *   arrays, which `@ValidateNested()` would otherwise validate element by element);
 * - unknown keys: `whitelist` (strip) / `whitelist + forbidNonWhitelisted` (strict) validate
 *   options; passthrough is the default;
 * - class-validator has no union: the payment property gets a `@Transform()` that instantiates
 *   the first branch whose class validates (card, else PayPal), so a value matching neither
 *   reports the PayPal branch's errors (one violation at `payment`).
 *
 * @param {object} validateOptions  the options `validateSync` is called with
 */
export function buildClassValidatorModel(validateOptions) {
  class Address {}
  decorate(Address, 'street', String, IsString(), MinLength(1))
  decorate(Address, 'city', String, IsString(), MinLength(1))
  decorate(Address, 'state', String, IsString(), Matches(P.state))
  decorate(Address, 'zip', String, IsString(), Matches(P.zip))
  decorate(Address, 'country', String, IsOptional(), IsString())

  class PaymentCard {}
  decorate(PaymentCard, 'number', String, IsString(), Matches(P.cardNumber))
  decorate(PaymentCard, 'expiry', String, IsString(), Matches(P.expiry))
  decorate(PaymentCard, 'cvv', String, IsString(), Matches(P.cvv))
  decorate(PaymentCard, 'holderName', String, IsString(), MinLength(1))

  class PaymentPaypal {}
  decorate(PaymentPaypal, 'email', String, IsString(), Matches(P.email))

  /** First-match union: the card instance if it validates, else a PayPal instance. */
  const toPayment = (value) => {
    if (!isObj(value)) return value
    const card = plainToInstance(PaymentCard, value)
    return validateSync(card, validateOptions).length === 0 ? card : plainToInstance(PaymentPaypal, value)
  }

  class CustomField {}
  decorate(CustomField, 'key', String, IsString())
  decorate(CustomField, 'value', String, IsString())

  class ItemMetadata {}
  decorate(ItemMetadata, 'color', String, IsOptional(), IsString())
  decorate(ItemMetadata, 'size', String, IsOptional(), IsString())
  decorate(ItemMetadata, 'weight', Number, IsOptional(), IsNumber())
  decorate(ItemMetadata, 'customFields', Array, IsOptional(), IsArray(), ValidateNested({ each: true }), Type(() => CustomField))

  class OrderItem {}
  decorate(OrderItem, 'sku', String, IsString(), MinLength(1), MaxLength(64))
  decorate(OrderItem, 'name', String, IsString(), MinLength(1), MaxLength(256))
  decorate(OrderItem, 'quantity', Number, IsInt(), Min(1), Max(10000))
  decorate(OrderItem, 'unitPrice', Number, IsNumber(), Min(0.01), Max(999999.99))
  decorate(OrderItem, 'discount', Number, IsOptional(), IsNumber())
  decorate(OrderItem, 'tags', Array, IsOptional(), IsArray(), IsString({ each: true }))
  decorate(OrderItem, 'metadata', ItemMetadata, IsOptional(), IsObject(), ValidateNested(), Type(() => ItemMetadata))

  class Customer {}
  decorate(Customer, 'firstName', String, IsString(), MinLength(1), MaxLength(128))
  decorate(Customer, 'lastName', String, IsString(), MinLength(1), MaxLength(128))
  decorate(Customer, 'email', String, IsString(), Matches(P.email))
  decorate(Customer, 'phone', String, IsOptional(), IsString(), Matches(P.phone))
  decorate(Customer, 'shippingAddress', Address, IsObject(), ValidateNested(), Type(() => Address))
  decorate(Customer, 'billingAddress', Address, IsOptional(), IsObject(), ValidateNested(), Type(() => Address))

  class Order {}
  decorate(Order, 'orderId', String, IsString(), Matches(P.orderId))
  decorate(Order, 'customer', Customer, IsObject(), ValidateNested(), Type(() => Customer))
  decorate(Order, 'items', Array, IsArray(), ArrayMinSize(1), ArrayMaxSize(100), ValidateNested({ each: true }), Type(() => OrderItem))
  decorate(Order, 'payment', Object, IsObject(), ValidateNested(), Transform(({ obj, key }) => toPayment(obj[key])))
  decorate(Order, 'subtotal', Number, IsNumber(), Min(0))
  decorate(Order, 'tax', Number, IsNumber(), Min(0))
  decorate(Order, 'shipping', Number, IsNumber(), Min(0))
  decorate(Order, 'total', Number, IsNumber(), Min(0))
  decorate(Order, 'notes', String, IsOptional(), IsString())
  decorate(Order, 'couponCodes', Array, IsOptional(), IsArray(), IsString({ each: true }))
  decorate(Order, 'createdAt', String, IsString())
  decorate(Order, 'updatedAt', String, IsOptional(), IsString())

  return {
    /** plain input -> the instance that `validateSync` checks */
    order: (input) => plainToInstance(Order, input),
    payment: toPayment,
  }
}
