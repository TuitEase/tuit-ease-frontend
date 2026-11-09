interface BrandLogoProps {
  className?: string;
}

export function BrandLogo({ className = '' }: BrandLogoProps) {
  return (
    <span className={`booking-brand ${className}`.trim()}>
      <img src="/assets/tuitease-logo.png" alt="TuitEase" />
    </span>
  );
}
