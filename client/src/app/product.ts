// The shape of one product as the API sends it (matches the Product model in server.js)
export interface Product {
  _id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  priceUnit: string | null;
  priceNote: string | null;
  optionLabel: string | null;
  optionValues: string[];
  inStock: boolean;
}
