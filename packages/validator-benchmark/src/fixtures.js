// Test inputs. Every factory returns a fresh object graph (no shared references).

export function makeValidOrder() {
  return {
    orderId: 'ORD-10000000',
    customer: {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      phone: '+12025551234',
      shippingAddress: { street: '123 Main St', city: 'Springfield', state: 'IL', zip: '62701' },
      billingAddress: {
        street: '456 Oak Ave',
        city: 'Chicago',
        state: 'IL',
        zip: '60601-1234',
        country: 'US',
      },
    },
    items: [
      {
        sku: 'WIDGET-001',
        name: 'Premium Widget',
        quantity: 3,
        unitPrice: 29.99,
        discount: 5.0,
        tags: ['sale', 'popular', 'new'],
        metadata: {
          color: 'blue',
          size: 'large',
          weight: 1.5,
          customFields: [
            { key: 'material', value: 'aluminum' },
            { key: 'origin', value: 'USA' },
          ],
        },
      },
      { sku: 'GADGET-042', name: 'Super Gadget XL', quantity: 1, unitPrice: 149.99, tags: ['electronics'] },
      { sku: 'BOLT-100', name: 'Stainless Steel Bolt M8x20', quantity: 500, unitPrice: 0.15 },
    ],
    payment: { number: '4111111111111111', expiry: '12/26', cvv: '123', holderName: 'John Doe' },
    subtotal: 314.96,
    tax: 25.2,
    shipping: 9.99,
    total: 350.15,
    notes: 'Please leave at front door',
    couponCodes: ['SAVE10', 'FREESHIP'],
    createdAt: '2024-03-15T10:30:00Z',
    updatedAt: '2024-03-15T11:00:00Z',
  }
}

/**
 * Fails many constraints at once: one per field in 14 fields (several nested) plus the
 * payment union (no branch matches).
 */
export function makeInvalidOrder() {
  return {
    orderId: 'INVALID-0',
    customer: {
      firstName: '',
      lastName: 'D'.repeat(200),
      email: 'not-an-email',
      phone: '123',
      shippingAddress: { street: '', city: '', state: 'Illinois', zip: 'abcde' },
    },
    items: [],
    payment: { number: '123', expiry: '1226', cvv: '12', holderName: '' },
    subtotal: -10,
    tax: -1,
    shipping: -5,
    total: -16,
    createdAt: '2024-03-15T10:30:00Z',
  }
}

/** Valid order whose payment matches the second union branch. */
export function makePaypalOrder() {
  return { ...makeValidOrder(), payment: { email: 'pay@example.com' } }
}

/** Valid order with 50 line items. */
export function makeLargeOrder() {
  return {
    ...makeValidOrder(),
    items: Array.from({ length: 50 }, (_, i) => ({
      sku: `SKU-${String(i).padStart(4, '0')}`,
      name: `Product ${i}`,
      quantity: (i % 100) + 1,
      unitPrice: 10 + (i % 90),
      tags: ['tag1', 'tag2'],
      metadata: { color: 'red', size: 'M', customFields: [{ key: 'batch', value: `B${i}` }] },
    })),
  }
}

/**
 * Valid order plus one undeclared property on each of 6 objects at different depths,
 * including the payment (inside the union). One unknown key per object; in strict mode the
 * payment's unknown key makes the union fail.
 */
export function makeUnknownPropsOrder() {
  const o = makeValidOrder()
  o.trackingRef = 'TRK-1'
  o.customer.loyaltyTier = 'gold'
  o.customer.shippingAddress.geo = { lat: 39.78, lng: -89.65 }
  o.items[0].warehouse = 'W-7'
  o.items[0].metadata.customFields[0].note = 'internal'
  o.payment.brand = 'visa'
  return o
}

export const makeCardPayment = () => ({
  number: '4111111111111111',
  expiry: '12/26',
  cvv: '123',
  holderName: 'John Doe',
})
export const makePaypalPayment = () => ({ email: 'pay@example.com' })
export const makeInvalidPayment = () => ({ token: 'abc123' })
