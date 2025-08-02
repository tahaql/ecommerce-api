export interface AddToCartRequest {
  productId: string;
  quantity: number;
}

export interface UpdateCartItemRequest {
  quantity: number;
}

export interface CartItemResponse {
  id: string;
  quantity: number;
  userId: string;
  productId: string;
  product: {
    id: string;
    name: string;
    description: string;
    price: number;
    stock: number;
    images: string[];
    isActive: boolean;
    category: {
      id: string;
      name: string;
    };
  };
  subtotal: number;
}

export interface CartResponse {
  items: CartItemResponse[];
  totalItems: number;
  totalAmount: number;
  itemCount: number;
}