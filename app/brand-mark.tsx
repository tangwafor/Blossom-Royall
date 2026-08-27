export default function BrandMark({ className = "" }: { className?: string }) {
  return <img className={`brand-mark ${className}`} src="/brand/blossom-seal.png" alt="Blossom Royall monogram" />;
}
