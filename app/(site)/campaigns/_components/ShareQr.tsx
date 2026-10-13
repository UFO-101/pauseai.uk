import Image from "next/image";

// A QR code for this page, which CampaignsClient enlarges on click.
export default function ShareQr() {
  return (
    <section className="campaigns-share">
      <div className="container">
        <button type="button" className="qr-thumb" aria-label="Show QR code larger">
          <Image src="/campaign-page-qr-code.png" alt="QR code linking to this campaign page" width={180} height={180} loading="lazy" />
          <span>Scan to share this page</span>
        </button>
      </div>
    </section>
  );
}
