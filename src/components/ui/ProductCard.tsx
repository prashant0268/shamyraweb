import styled from 'styled-components';
import { ShoppingCart } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import Button from './Button';
import { ProductCardProps } from '../../types';

const Card = styled.div`
  background: white;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  transition: box-shadow 0.3s;

  &:hover {
    box-shadow: 0 10px 15px rgba(0, 0, 0, 0.1);
  }
`;

const ImageContainer = styled.div`
  aspect-ratio: 1;
  overflow: hidden;
`;

const ProductImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s;

  &:hover {
    transform: scale(1.05);
  }
`;

const CardContent = styled.div`
  padding: 1rem;
`;

const ProductName = styled.h3`
  font-size: 1.125rem;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 0.5rem;
`;

const ProductDescription = styled.p`
  font-size: 0.875rem;
  color: #6b7280;
  margin-bottom: 0.75rem;
`;

const CardFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const Price = styled.span`
  font-size: 1.25rem;
  font-weight: 700;
  color: #dc2626;
`;

const AddToCartButton = styled(Button)`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const ProductCard = ({ product }: ProductCardProps) => {
  const { addToCart } = useCart();

  const handleAddToCart = () => {
    addToCart(product);
  };

  return (
    <Card>
      <ImageContainer>
        <ProductImage src={product.image} alt={product.name} />
      </ImageContainer>
      <CardContent>
        <ProductName>{product.name}</ProductName>
        <ProductDescription>{product.description}</ProductDescription>
        <CardFooter>
          <Price>${product.price}</Price>
          <AddToCartButton onClick={handleAddToCart} variant="primary">
            <ShoppingCart size={18} />
            Add to Cart
          </AddToCartButton>
        </CardFooter>
      </CardContent>
    </Card>
  );
};

export default ProductCard;
