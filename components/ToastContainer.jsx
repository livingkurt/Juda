"use client";

import { useEffect, useState } from "react";
import { Box, Text, HStack, IconButton } from "@chakra-ui/react";
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from "lucide-react";
import { subscribeToToasts } from "@/hooks/useToast";
import { useSemanticColors } from "@/hooks/useSemanticColors";

export function ToastContainer() {
  const { mode, status } = useSemanticColors();
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const handleToast = toastData => {
      setToasts(prev => [...prev, toastData]);

      // Auto-remove after duration
      const duration = toastData.duration || 3000;
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== toastData.id));
      }, duration);
    };

    const unsubscribe = subscribeToToasts(handleToast);
    return unsubscribe;
  }, []);

  const removeToast = id => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const getStatusIcon = status => {
    switch (status) {
      case "success":
        return <CheckCircle size={20} />;
      case "error":
        return <AlertCircle size={20} />;
      case "warning":
        return <AlertTriangle size={20} />;
      default:
        return <Info size={20} />;
    }
  };

  const getStatusColor = toastStatus => {
    switch (toastStatus) {
      case "success":
        return status.success;
      case "error":
        return status.error;
      case "warning":
        return status.warning;
      default:
        return status.info;
    }
  };

  const getStatusBg = toastStatus => {
    switch (toastStatus) {
      case "success":
        return status.successBg;
      case "error":
        return status.errorBg;
      case "warning":
        return status.warningBg;
      default:
        return status.infoBg;
    }
  };

  if (toasts.length === 0) return null;

  return (
    <Box
      position="fixed"
      top={4}
      left="50%"
      transform="translateX(-50%)"
      zIndex={9999}
      width={{ base: "90%", md: "400px" }}
      pointerEvents="none"
    >
      {toasts.map(toast => (
        <Box
          key={toast.id}
          bg={getStatusBg(toast.status)}
          borderWidth="1px"
          borderColor={getStatusColor(toast.status)}
          borderRadius="md"
          px={4}
          py={3}
          mb={2}
          boxShadow="lg"
          pointerEvents="auto"
          animation="slideDown 0.3s ease-out"
          css={{
            "@keyframes slideDown": {
              from: {
                opacity: 0,
                transform: "translateY(-20px)",
              },
              to: {
                opacity: 1,
                transform: "translateY(0)",
              },
            },
          }}
        >
          <HStack spacing={3} align="center" justify="space-between">
            <HStack spacing={3} align="center" flex={1} minW={0}>
              <Box color={getStatusColor(toast.status)} flexShrink={0}>
                {getStatusIcon(toast.status)}
              </Box>
              <Box flex={1} minW={0}>
                <Text fontWeight="semibold" fontSize="sm" color={mode.text.primary}>
                  {toast.title}
                </Text>
                {toast.description && (
                  <Text fontSize="xs" color={mode.text.secondary} mt={1}>
                    {toast.description}
                  </Text>
                )}
              </Box>
            </HStack>
            <IconButton
              size="xs"
              variant="ghost"
              onClick={() => removeToast(toast.id)}
              aria-label="Close toast"
              flexShrink={0}
              minW="24px"
              h="24px"
            >
              <X size={14} />
            </IconButton>
          </HStack>
        </Box>
      ))}
    </Box>
  );
}
