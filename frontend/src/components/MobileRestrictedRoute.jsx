import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import useMobileDetection from '../hooks/useMobileDetection';
import MobileRestrictionPopup from './MobileRestrictionPopup';

const MobileRestrictedRoute = ({ children, pageName, redirectTo = '/dashboard' }) => {
  const isMobile = useMobileDetection();
  const [showPopup, setShowPopup] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (isMobile) {
      setShowPopup(true);
    }
  }, [isMobile, location.pathname]);

  const handleClosePopup = () => {
    setShowPopup(false);
    navigate(redirectTo);
  };

  if (isMobile) {
    return (
      <MobileRestrictionPopup
        open={showPopup}
        onClose={handleClosePopup}
        pageName={pageName}
      />
    );
  }

  return children;
};

export default MobileRestrictedRoute;
