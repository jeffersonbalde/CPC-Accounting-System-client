// components/Portal.jsx
// Simplified to match stable reference projects: just prevent body scroll
// while the portal is mounted. No fancy padding or position tricks.
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const Portal = ({ children }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Prevent body scroll when portal is mounted
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow || "";
    };
  }, []);

  if (!mounted) return null;

  return createPortal(children, document.body);
};

export default Portal;
