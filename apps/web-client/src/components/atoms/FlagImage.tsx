import React, { useState } from "react";

type FlagSize = "sm" | "md" | "lg";

const FLAG_WIDTH_BY_SIZE: Record<FlagSize, string> = {
  sm: "w80",
  md: "w160",
  lg: "w320",
};

interface FlagImageProps {
  code?: string | null;
  size?: FlagSize;
  alt: string;
  fallback?: React.ReactNode;
  className?: string;
  decoding?: "async" | "sync" | "auto";
}

export const FlagImage: React.FC<FlagImageProps> = ({
  code,
  size = "md",
  alt,
  fallback = null,
  className = "",
  decoding,
}) => {
  const [failedCode, setFailedCode] = useState<string | null>(null);
  const normalizedCode = code?.trim().toLowerCase() ?? "";

  if (!/^[a-z]{2}$/.test(normalizedCode) || failedCode === normalizedCode) {
    return <>{fallback}</>;
  }

  return (
    <img
      src={`https://flagcdn.com/${FLAG_WIDTH_BY_SIZE[size]}/${normalizedCode}.png`}
      alt={alt}
      decoding={decoding}
      className={className}
      onError={() => setFailedCode(normalizedCode)}
    />
  );
};

