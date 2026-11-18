// What the browser sends when placing an order. Notice there are NO prices here:
// the server looks up every price in the database itself.
export interface NewOrderItem {
  name: string;
  options: string;
  quantity: number;
  type?: 'lesson';
  coach?: string;
  date?: string;
  time?: string;
}

export interface NewOrder {
  customerName: string;
  email: string;
  fulfillment: 'pickup' | 'court' | 'none';
  courtNumber: string;
  items: NewOrderItem[];
}

// What the server sends back after saving an order
export interface OrderResult {
  orderNumber: string;
  subtotal: number;
  tax: number;
  total: number;
}

// An order as saved in MongoDB (used by the order lookup page)
export interface SavedOrder {
  orderNumber: string;
  customerName: string;
  email: string;
  fulfillment: 'pickup' | 'court' | 'none';
  courtNumber: string;
  items: { name: string; price: number; quantity: number; options: string; type?: string; coach?: string; date?: string; time?: string }[];
  subtotal: number;
  tax: number;
  total: number;
  createdAt: string;
}
