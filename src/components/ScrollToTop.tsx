import { useEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

export default function ScrollToTop() {
  const { pathname } = useLocation();
  const navType = useNavigationType();
  const scrollPositions = useRef<Record<string, number>>({});

  useEffect(() => {
    const main = document.querySelector('main');
    
    // Save current scroll position before unmounting/changing route
    const handleScroll = () => {
      if (main) {
        scrollPositions.current[pathname] = main.scrollTop;
      }
    };

    if (main) {
      main.addEventListener('scroll', handleScroll, { passive: true });
    }

    return () => {
      if (main) {
        main.removeEventListener('scroll', handleScroll);
      }
    };
  }, [pathname]);

  useEffect(() => {
    const main = document.querySelector('main');
    
    if (navType === 'POP') {
      // Restore scroll position on back/forward navigation
      const savedPosition = scrollPositions.current[pathname];
      if (main && savedPosition !== undefined) {
        // Use a small timeout to ensure content is rendered before scrolling
        setTimeout(() => {
          main.scrollTo({ top: savedPosition, left: 0, behavior: 'instant' });
        }, 0);
      }
    } else {
      // Scroll to top on new navigation
      if (main) {
        main.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      }
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
  }, [pathname, navType]);

  return null;
}
