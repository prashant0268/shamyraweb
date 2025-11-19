import styled from 'styled-components';
import { ButtonProps } from '../../types';

const StyledButton = styled.button<{ $variant: 'primary' | 'secondary' | 'outline' }>`
  padding: 0.5rem 1.5rem;
  border-radius: 0.5rem;
  font-weight: 500;
  transition: all 0.2s;
  cursor: pointer;
  border: none;

  ${props => props.$variant === 'primary' && `
    background-color: #dc2626;
    color: white;

    &:hover:not(:disabled) {
      background-color: #b91c1c;
    }
  `}

  ${props => props.$variant === 'secondary' && `
    background-color: #e5e7eb;
    color: #1f2937;

    &:hover:not(:disabled) {
      background-color: #d1d5db;
    }
  `}

  ${props => props.$variant === 'outline' && `
    background-color: transparent;
    color: #dc2626;
    border: 2px solid #dc2626;

    &:hover:not(:disabled) {
      background-color: #fef2f2;
    }
  `}

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const Button = ({ children, variant = 'primary', ...props }: ButtonProps) => {
  return (
    <StyledButton $variant={variant} {...props}>
      {children}
    </StyledButton>
  );
};

export default Button;
