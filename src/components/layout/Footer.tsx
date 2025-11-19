import styled from 'styled-components';
import { Flame } from 'lucide-react';

const FooterContainer = styled.footer`
  background-color: #1f2937;
  color: white;
  margin-top: auto;
`;

const FooterContent = styled.div`
  max-width: 80rem;
  margin: 0 auto;
  padding: 2rem 1rem;

  @media (min-width: 640px) {
    padding: 2rem 1.5rem;
  }

  @media (min-width: 1024px) {
    padding: 2rem 2rem;
  }
`;

const FooterGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 2rem;

  @media (min-width: 768px) {
    grid-template-columns: repeat(3, 1fr);
  }
`;

const FooterSection = styled.div`
  display: flex;
  flex-direction: column;
`;

const LogoSection = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
`;

const LogoText = styled.span`
  font-size: 1.25rem;
  font-weight: 700;
`;

const Description = styled.p`
  color: #9ca3af;
`;

const SectionTitle = styled.h3`
  font-size: 1.125rem;
  font-weight: 600;
  margin-bottom: 1rem;
`;

const LinkList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const LinkItem = styled.li`
  color: #9ca3af;
`;

const FooterLink = styled.a`
  color: #9ca3af;
  text-decoration: none;
  transition: color 0.2s;

  &:hover {
    color: white;
  }
`;

const ContactList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  color: #9ca3af;
`;

const Copyright = styled.div`
  border-top: 1px solid #374151;
  margin-top: 2rem;
  padding-top: 1.5rem;
  text-align: center;
  color: #9ca3af;
`;

const Footer = () => {
  return (
    <FooterContainer>
      <FooterContent>
        <FooterGrid>
          <FooterSection>
            <LogoSection>
              <Flame size={28} />
              <LogoText>Shamyra</LogoText>
            </LogoSection>
            <Description>
              Premium handcrafted candles for every occasion. Light up your space with our unique scents.
            </Description>
          </FooterSection>

          <FooterSection>
            <SectionTitle>Quick Links</SectionTitle>
            <LinkList>
              <LinkItem>
                <FooterLink href="/">Home</FooterLink>
              </LinkItem>
              <LinkItem>
                <FooterLink href="/products">Products</FooterLink>
              </LinkItem>
              <LinkItem>
                <FooterLink href="/cart">Cart</FooterLink>
              </LinkItem>
            </LinkList>
          </FooterSection>

          <FooterSection>
            <SectionTitle>Contact</SectionTitle>
            <ContactList>
              <li>Email: info@shamyra.com</li>
              <li>Phone: (555) 123-4567</li>
              <li>Address: 123 Candle Lane, City</li>
            </ContactList>
          </FooterSection>
        </FooterGrid>

        <Copyright>
          <p>&copy; {new Date().getFullYear()} Shamyra. All rights reserved.</p>
        </Copyright>
      </FooterContent>
    </FooterContainer>
  );
};

export default Footer;
