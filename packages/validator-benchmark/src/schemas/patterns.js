// The `@expect.pattern` regexes of src/model/order.as, shared by every non-atscript schema so
// all libraries test exactly the same patterns (no flags). JSON-Schema based libraries take
// the `.source` string.
export const P = {
  orderId: /^ORD-\d{8,12}$/,
  state: /^[A-Z]{2}$/,
  zip: /^\d{5}(-\d{4})?$/,
  cardNumber: /^\d{13,19}$/,
  expiry: /^\d{2}\/\d{2}$/,
  cvv: /^\d{3,4}$/,
  email: /^[^@]+@[^@]+\.[^@]+$/,
  phone: /^\+?[1-9]\d{6,14}$/,
}
