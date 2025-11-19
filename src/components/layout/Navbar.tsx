import { Link, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { ShoppingCart, User, LogOut, Flame } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';

const Nav = styled.nav`
  background: white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  z-index: 50;
`;

const NavContainer = styled.div`
  max-width: 80rem;
  margin: 0 auto;
  padding: 0 1rem;

  @media (min-width: 640px) {
    padding: 0 1.5rem;
  }

  @media (min-width: 1024px) {
    padding: 0 2rem;
  }
`;

const NavContent = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 4rem;
`;

const Logo = styled(Link)`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  text-decoration: none;
`;

const LogoIcon = styled(Flame)`
  color: #dc2626;
`;

const LogoText = styled.span`
  font-size: 1.5rem;
  font-weight: 700;
  color: #1f2937;
`;

const NavLinks = styled.div`
  display: flex;
  align-items: center;
  gap: 2rem;
`;

const NavLink = styled(Link)`
  color: #374151;
  text-decoration: none;
  transition: color 0.2s;

  &:hover {
    color: #dc2626;
  }
`;

const CartLink = styled(Link)`
  position: relative;
  display: block;
`;

const CartIcon = styled(ShoppingCart)`
  color: #374151;
  transition: color 0.2s;

  ${CartLink}:hover & {
    color: #dc2626;
  }
`;

const CartBadge = styled.span`
  position: absolute;
  top: -0.5rem;
  right: -0.5rem;
  background-color: #dc2626;
  color: white;
  font-size: 0.75rem;
  border-radius: 9999px;
  width: 1.25rem;
  height: 1.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const UserActions = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const IconLink = styled(Link)`
  color: #374151;
  transition: color 0.2s;

  &:hover {
    color: #dc2626;
  }
`;

const IconButton = styled.button`
  background: none;
  border: none;
  color: #374151;
  cursor: pointer;
  padding: 0;
  transition: color 0.2s;

  &:hover {
    color: #dc2626;
  }
`;

const Navbar = () => {
  const { getCartCount } = useCart();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <Nav>
      <NavContainer>
        <NavContent>
          <Logo to="/">
            <LogoIcon size={32} />
            <LogoText>Shamyra</LogoText>
          </Logo>

          <NavLinks>
            <NavLink to="/">Home</NavLink>
            <NavLink to="/products">Products</NavLink>

            <CartLink to="/cart">
              <CartIcon size={24} />
              {getCartCount() > 0 && (
                <CartBadge>{getCartCount()}</CartBadge>
              )}
            </CartLink>

            {user ? (
              <UserActions>
                <IconLink to="/profile">
                  <User size={24} />
                </IconLink>
                <IconButton onClick={handleLogout}>
                  <LogOut size={24} />
                </IconButton>
              </UserActions>
            ) : (
              <NavLink to="/login">Login</NavLink>
            )}
          </NavLinks>
        </NavContent>
      </NavContainer>
    </Nav>
  );
};

export default Navbar;
