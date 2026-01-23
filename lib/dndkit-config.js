import { CSS } from "@dnd-kit/utilities";

export const TRANSITION_DURATION = 200;
export const DEFAULT_EASING = "cubic-bezier(0.25, 1, 0.5, 1)";

export const sortableTransition = {
  duration: TRANSITION_DURATION,
  easing: DEFAULT_EASING,
};

export const getSortableStyles = (transform, transition, isDragging) => ({
  transform: CSS.Transform.toString(transform),
  transition: transition || `transform ${TRANSITION_DURATION}ms ${DEFAULT_EASING}`,
  opacity: isDragging ? 0.5 : 1,
  zIndex: isDragging ? 1000 : "auto",
  position: "relative",
});

export const getDragOverlayStyles = () => ({
  boxShadow: "0 5px 15px rgba(0, 0, 0, 0.25)",
  cursor: "grabbing",
  transform: "scale(1.02)",
});

export const dropAnimation = {
  duration: TRANSITION_DURATION,
  easing: DEFAULT_EASING,
};
