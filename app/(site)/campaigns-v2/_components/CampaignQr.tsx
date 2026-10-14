import Image from "next/image";
// Today's /campaigns QR code and the script that enlarges it. The code links
// to /campaigns.
import CampaignsClient from "../../campaigns/_components/CampaignsClient";
import ShareQr from "../../campaigns/_components/ShareQr";

/** The page's QR code, which enlarges on click. */
export default function CampaignQr() {
  return (
    <>
      <ShareQr />
      <div className="qr-lightbox" id="qr-lightbox" aria-hidden="true" role="dialog" aria-label="QR code">
        <button className="qr-lightbox-close" type="button" aria-label="Close">
          &times;
        </button>
        <Image src="/campaign-page-qr-code.png" alt="QR code linking to this campaign page" width={1147} height={1147} />
      </div>
      <CampaignsClient />
    </>
  );
}
