// One choice inside a product, such as a grip size or a rental length
export interface ProductOption {
  value: string;
  price?: number;   // only set when this choice has its own price (e.g. grip installation)
  days?: number;    // only set for rentals
}

// The shape of one product as the API sends it (matches the Product model in server.js)
export interface Product {
  _id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  priceUnit: string | null;
  priceNote: string | null;
  pricing: string | null;       // "perDay" for rentals
  optionLabel: string | null;
  options: ProductOption[];
  hasTension: boolean;          // true if the customer types a string tension
  inStock: boolean;
}
