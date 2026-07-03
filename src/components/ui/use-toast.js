import { toast as sonnerToast } from "sonner"

export const toast = ({ title, description, variant, action, ...props }) => {
  // If we have an action, format it for Sonner
  const sonnerOptions = {
    description,
    ...props,
  };
  
  if (action) {
    // Basic mapping of action from old custom toaster if needed, 
    // though this app mostly just passed JSX which Sonner doesn't 
    // natively support inside `action` (it expects an object). 
    // But we don't have custom actions in the current codebase!
  }

  // Determine variant
  if (variant === "destructive") {
    return sonnerToast.error(title, sonnerOptions);
  }
  
  if (variant === "success") {
    return sonnerToast.success(title, sonnerOptions);
  }
  
  if (variant === "info") {
    return sonnerToast.info(title, sonnerOptions);
  }

  return sonnerToast(title, sonnerOptions);
}

export const useToast = () => {
  return {
    toast,
    dismiss: (toastId) => sonnerToast.dismiss(toastId),
  }
}
