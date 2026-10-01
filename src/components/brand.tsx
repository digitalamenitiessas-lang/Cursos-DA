import Link from 'next/link';
import Image from 'next/image';
import { brand } from '@/lib/brand';
export function Brand({ signature = false }: { signature?: boolean }) {
  return (
    <Link
      href="/"
      className={`brand${signature ? ' brand--signature' : ''}`}
      aria-label={`${brand.fullName}, inicio`}
    >
      {signature ? (
        <Image
          src="/brand/digital-amenities-logo.jpg"
          alt=""
          width={5001}
          height={5000}
          sizes="320px"
          className="brand-signature-image"
        />
      ) : (
        <>
          <span className="brand-symbol" aria-hidden="true">
            <Image
              src="/brand/digital-amenities-sello.jpg"
              alt=""
              width={5001}
              height={5000}
              sizes="84px"
              className="brand-seal-image"
            />
          </span>
          <span className="brand-wordmark" aria-hidden="true">
            Digital<span>Amenities</span>
          </span>
        </>
      )}
    </Link>
  );
}
