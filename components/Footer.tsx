import { site } from "@/lib/data/site";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div className="brand footer-brand">
          <img
            src="/images/logos/PauseAI Logo Transparent.svg"
            alt="PauseAI UK"
            width={178}
            height={48}
            className="brand-mark"
          />
          <span className="brand-uk">UK</span>
        </div>
        <div className="footer-links">
          <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>
          <a href="/donate">Donate</a>
          <a href={site.openLetterUrl} target="_blank" rel="noreferrer">Open letter</a>
          <a href={site.whatsappUrl} target="_blank" rel="noreferrer">WhatsApp community</a>
          <a href={site.shopUrl} target="_blank" rel="noreferrer">Shop merch</a>
          <a href="/privacy">Privacy</a>
          <a href="#" className="js-cookie-settings">Cookie settings</a>
        </div>
        <div className="social-links">
          <a href={site.social.instagram} target="_blank" rel="noreferrer" aria-label="Instagram">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" /></svg>
          </a>
          <a href={site.social.tiktok} target="_blank" rel="noreferrer" aria-label="TikTok">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" /></svg>
          </a>
          <a href={site.social.x} target="_blank" rel="noreferrer" aria-label="X (Twitter)">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
          </a>
          <a href={site.social.facebook} target="_blank" rel="noreferrer" aria-label="Facebook">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
          </a>
          <a href={site.social.youtube} target="_blank" rel="noreferrer" aria-label="YouTube">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" /></svg>
          </a>
          <a href={site.social.luma} target="_blank" rel="noreferrer" aria-label="Events Calendar">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20a2 2 0 002 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11zM9 11H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm-8 4H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2z" /></svg>
          </a>
          <a href={site.social.linktree} target="_blank" rel="noreferrer" aria-label="Linktree">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M7.953 15.066l-.038-4.036 4.044-.006v-2.93l-4.044.006.038-3.995L5.03 6.998l2.89 3.035-2.89 2.993 2.923 2.04zm8.091 0l2.924-2.04-2.89-2.993 2.89-3.035-2.923 2.893.038 3.995-4.044-.006v2.93l4.044.006-.038 4.036 2.923-2.893zM12 19.921L9.077 16.95H7.953v2.97L12 24l4.047-4.08v-2.97h-1.124L12 19.921z" /></svg>
          </a>
        </div>
      </div>
      <div className="container footer-bottom">
        <small>© <span id="year"></span> PauseAI UK</small>
        <small>For press enquiries, contact <a href={`mailto:${site.pressEmail}`}>{site.pressEmail}</a>.</small>
      </div>
    </footer>
  );
}
