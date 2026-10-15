"use client";

import Image from "next/image";
import { useCallback, useState } from "react";
import Lightbox from "@/components/ui/Lightbox";

// A QR code for this page, which enlarges on click.
export default function ShareQr() {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  return (
    <section className="campaigns-share">
      <div className="container">
        <button type="button" className="qr-thumb" aria-label="Show QR code larger" onClick={() => setOpen(true)}>
          <Image
            src="/campaign-page-qr-code.png"
            alt="QR code linking to this campaign page"
            width={180}
            height={180}
            loading="lazy"
          />
          <span>Scan to share this page</span>
        </button>
      </div>
      <Lightbox open={open} onClose={close} className="qr-lightbox" label="QR code">
        <button className="qr-lightbox-close" type="button" aria-label="Close" onClick={close}>
          &times;
        </button>
        <Image
          src="/campaign-page-qr-code.png"
          alt="QR code linking to this campaign page"
          width={1147}
          height={1147}
        />
      </Lightbox>
    </section>
  );
}
