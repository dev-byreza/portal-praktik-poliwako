// Portal Modal Wrapper — renders children directly into document.body
// Guarantees modal is always centered in viewport, unaffected by parent scroll/transforms

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface ModalPortalProps {
  children: React.ReactNode;
}

export const ModalPortal: React.FC<ModalPortalProps> = ({ children }) => {
  const el = useRef(document.createElement('div'));

  useEffect(() => {
    const portalRoot = document.body;
    portalRoot.appendChild(el.current);
    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';

    return () => {
      portalRoot.removeChild(el.current);
      document.body.style.overflow = '';
    };
  }, []);

  return createPortal(children, el.current);
};
