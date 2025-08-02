export const generateOrderNumber = (): string => {
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `ORD-${timestamp.slice(-6)}-${random}`;
};

export const calculateOrderTotal = (items: { quantity: number; price: number }[]): number => {
  return items.reduce((total, item) => total + (item.quantity * item.price), 0);
};

export const validateStockAvailability = async (
  prisma: any,
  cartItems: { productId: string; quantity: number }[]
): Promise<{ valid: boolean; message?: string }> => {
  for (const item of cartItems) {
    const product = await prisma.product.findUnique({
      where: { id: item.productId }
    });

    if (!product || !product.isActive) {
      return {
        valid: false,
        message: `Product not found or inactive: ${item.productId}`
      };
    }

    if (product.stock < item.quantity) {
      return {
        valid: false,
        message: `Insufficient stock for ${product.name}. Available: ${product.stock}, Requested: ${item.quantity}`
      };
    }
  }

  return { valid: true };
};