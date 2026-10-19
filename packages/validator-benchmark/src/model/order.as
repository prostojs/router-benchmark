/**
 * Complex Order type for benchmarking validation performance.
 */

export interface Address {
  @expect.minLength 1
  street: string

  @expect.minLength 1
  city: string

  @expect.pattern "^[A-Z]{2}$"
  state: string

  @expect.pattern "^\d{5}(-\d{4})?$"
  zip: string

  country?: string
}

export interface PaymentCard {
  @expect.pattern "^\d{13,19}$"
  number: string

  @expect.pattern "^\d{2}/\d{2}$"
  expiry: string

  @expect.pattern "^\d{3,4}$"
  cvv: string

  @expect.minLength 1
  holderName: string
}

export interface PaymentPaypal {
  @expect.pattern "^[^@]+@[^@]+\.[^@]+$"
  email: string
}

export type Payment = PaymentCard | PaymentPaypal

export interface OrderItem {
  @expect.minLength 1
  @expect.maxLength 64
  sku: string

  @expect.minLength 1
  @expect.maxLength 256
  name: string

  @expect.min 1
  @expect.max 10000
  @expect.int
  quantity: number

  @expect.min 0.01
  @expect.max 999999.99
  unitPrice: number

  discount?: number

  tags?: string[]

  metadata?: {
    color?: string
    size?: string
    weight?: number
    customFields?: {
      key: string
      value: string
    }[]
  }
}

export interface Customer {
  @expect.minLength 1
  @expect.maxLength 128
  firstName: string

  @expect.minLength 1
  @expect.maxLength 128
  lastName: string

  @expect.pattern "^[^@]+@[^@]+\.[^@]+$"
  email: string

  @expect.pattern "^\+?[1-9]\d{6,14}$"
  phone?: string

  shippingAddress: Address
  billingAddress?: Address
}

export interface Order {
  @expect.pattern "^ORD-\d{8,12}$"
  orderId: string

  customer: Customer

  @expect.minLength 1
  @expect.maxLength 100
  items: OrderItem[]

  payment: Payment

  @expect.min 0
  subtotal: number

  @expect.min 0
  tax: number

  @expect.min 0
  shipping: number

  @expect.min 0
  total: number

  notes?: string

  couponCodes?: string[]

  createdAt: string
  updatedAt?: string
}
