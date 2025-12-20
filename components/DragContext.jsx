"use client";

import { createContext, useContext, useState, useRef, useEffect } from "react";

const DragContext = createContext({
  hoveredDroppable: null,
  setHoveredDroppable: () => {},
});

export const useDragContext = () => useContext(DragContext);

// Global ref to store setHoveredDroppable function for use outside React components
export const dragContextRef = { current: null };

export const DragContextProvider = ({ children }) => {
  const [hoveredDroppable, setHoveredDroppable] = useState(null);

  // Store the setter in a ref so it can be accessed outside React components
  useEffect(() => {
    dragContextRef.current = setHoveredDroppable;
  }, []);

  return (
    <DragContext.Provider value={{ hoveredDroppable, setHoveredDroppable }}>
      {children}
    </DragContext.Provider>
  );
};
