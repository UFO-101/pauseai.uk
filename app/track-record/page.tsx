import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import Script from "next/script";
import CopyLinkButton from "@/components/CopyLinkButton";
import Nav from "@/components/Nav";
import { site } from "@/lib/data/site";
import "./track-record.css";

export const metadata: Metadata = {
  title: "Track Record",
  description:
    "One year of PauseAI UK: two conferences, an open letter signed by 60+ politicians, a European Parliament event, and the largest AI protest in the world.",
  openGraph: {
    title: "PauseAI UK | Track Record",
    description:
    "One year of PauseAI UK: two conferences, an open letter signed by 60+ politicians, a European Parliament event, and the largest AI protest in the world.",
    images: [
      {
        url: "/images/open-graph/open-graph-1200-630.jpg",
        width: 1200,
        height: 630,
      },
    ],
    url: "https://pauseai.uk/track-record/",
  },
  twitter: {
    images: ["/images/open-graph/open-graph-1600-840.jpg"],
  },
  alternates: { canonical: "/track-record" },
};

export default function TrackRecordPage() {
  return (
    <>
      <Nav />
      <main className="track-record">
        <section className="tr-hero">
          <svg
            className="tr-hero-swirl"
            viewBox="0 0 600 600"
            aria-hidden="true"
            preserveAspectRatio="xMidYMid meet"
          >
            <g
              fill="none"
              stroke="currentColor"
              strokeWidth="0.6"
              opacity="0.55"
            ></g>
          </svg>
          <div className="container tr-hero-inner">
            <h1 className="tr-hero-title">Track Record</h1>
          </div>
        </section>

        <section className="timeline">
          <div className="container">
            <ol className="timeline-list">
              <li className="entry" id="emergency-protest-downing-street">
                <aside className="entry-date">
                  <span className="month">September</span>
                  <span className="year">2026</span>
                </aside>
                <div className="entry-body">
                  <div className="entry-heading">
                    <h3 className="entry-title">Emergency Protest outside Downing Street </h3>
                    <CopyLinkButton href="/track-record/#emergency-protest-downing-street" title="Copy link to this entry" size={14} />
                  </div>
                  <div className="entry-text">
                    <p>
                      In response to the media wave following Jacob Coxon
                      leaving Anthropic over existential safety concerns, our
                      volunteers organised an emergency protest in four days,
                      with speakers ranging from AI safety researchers to our
                      own volunteers. We had around 100 people show up at this
                      short notice, with coverage from{" "}
                      <a
                        href="https://www.youtube.com/shorts/TFxdevKHM8s"
                        className="inline-link"
                        target="_blank"
                        rel="noreferrer"
                      >
                        ITV News
                      </a>
                      ,{" "}
                      <a
                        href="https://www.youtube.com/shorts/2JRtI-dDwgc"
                        className="inline-link"
                        target="_blank"
                        rel="noreferrer"
                      >
                        Channel 4
                      </a>
                      , the{" "}
                      <a
                        href="https://www.theguardian.com/technology/2026/sep/18/a-critical-moment-concern-uk-is-not-up-to-speed-in-acting-on-ai-risks"
                        className="inline-link"
                        target="_blank"
                        rel="noreferrer"
                      >
                        Guardian
                      </a>
                      , and{" "}
                      <Link href="/#news" className="inline-link">
                        others
                      </Link>
                      .
                    </p>
                    <p>
                      Our main message to Andy Burnham was to convene an
                      international pause treaty summit, putting the
                      UK&apos;s G20 presidency to good use.
                    </p>
                  </div>
                  <div className="gallery gallery-4">
                    <a
                      className="shot"
                      href="/images/downing-street-protest-sept-2026/downing-street-group.jpg"
                    >
                      <Image
                        fill
                        sizes="(max-width: 768px) 100vw, 25vw"
                        style={{ objectFit: "cover" }}
                        src="/images/downing-street-protest-sept-2026/downing-street-group-thumb.jpg"
                        alt="Protesters holding a PauseAI banner, placards and a Wheel of P(doom) in front of the gates of Downing Street"
                      />
                    </a>
                    <a
                      className="shot"
                      href="/images/downing-street-protest-sept-2026/downing-street-banner.jpg"
                    >
                      <Image
                        fill
                        sizes="(max-width: 768px) 100vw, 25vw"
                        style={{ objectFit: "cover" }}
                        src="/images/downing-street-protest-sept-2026/downing-street-banner-thumb.jpg"
                        alt="Protesters holding a PauseAI banner and placards outside Downing Street"
                      />
                    </a>
                    <a
                      className="shot"
                      href="/images/downing-street-protest-sept-2026/downing-street-march.jpg"
                    >
                      <Image
                        fill
                        sizes="(max-width: 768px) 100vw, 25vw"
                        style={{ objectFit: "cover" }}
                        src="/images/downing-street-protest-sept-2026/downing-street-march-thumb.jpg"
                        alt="Volunteers in orange T-shirts chanting and carrying PauseAI signs"
                      />
                    </a>
                    <a
                      className="shot"
                      href="/images/downing-street-protest-sept-2026/downing-street-burnham-sign.jpg"
                    >
                      <Image
                        fill
                        sizes="(max-width: 768px) 100vw, 25vw"
                        style={{ objectFit: "cover" }}
                        src="/images/downing-street-protest-sept-2026/downing-street-burnham-sign-thumb.jpg"
                        alt="A protester holding a sign reading Burnham, block AI oblivion"
                      />
                    </a>
                  </div>
                </div>
              </li>

              <li className="entry" id="pausecon-london-2026">
                <aside className="entry-date">
                  <span className="month">September</span>
                  <span className="year">2026</span>
                </aside>
                <div className="entry-body">
                  <div className="entry-heading">
                    <h3 className="entry-title">PauseCon London and Parliamentary Conference </h3>
                    <CopyLinkButton href="/track-record/#pausecon-london-2026" title="Copy link to this entry" size={14} />
                  </div>
                  <div className="entry-text">
                    <p>
                      We helped PauseAI Global to deliver the next PauseCon in
                      London, bringing around 100 volunteers together from
                      around the world and running workshops on social media
                      management, communicating with news outlets, and strategy,
                      among other topics. Many new connections were formed and
                      by the end, people had been invited into high-impact roles
                      that they would not have otherwise found.
                    </p>
                    <p>
                      To finish off, we held a Parliamentary conference with
                      audience Q&amp;A on AI policy, featuring:
                    </p>
                    <ul className="list">
                      <li>
                        <strong>Dame Chi Onwurah</strong>, Chair of the Commons
                        Science, Innovation and Technology Committee.
                      </li>
                      <li>
                        <strong>Iqbal Mohamed MP</strong>, led the December 2025
                        Westminster Hall debate on AI safety.
                      </li>
                      <li>
                        <strong>Professor Stuart Russell</strong>, world-renowned
                        AI scientist.
                      </li>
                      <li>
                        <strong>Lord Tim Clement-Jones</strong>, Co-Chair of the
                        All-Party Parliamentary Group on Artificial Intelligence.
                      </li>
                      <li>
                        <strong>Lord Lionel Tarassenko</strong>, Crossbench peer
                        and President of Reuben College, Oxford.
                      </li>
                      <li>
                        <strong>Brando Benifei MEP</strong>, Co-rapporteur and
                        lead architect of the EU AI Act.
                      </li>
                    </ul>
                    <p>
                      Topics covered ranged from the fact crimes are being
                      committed, but governments are unable to hold anyone
                      accountable because AI companies are not liable for the
                      crimes of their AIs, to what needs to happen for an
                      international superintelligence ban to come into play.
                    </p>
                  </div>
                  <div className="gallery gallery-3">
                    <a
                      className="shot"
                      href="/images/pausecon-london-sept-2026/parliament-conference-hall.jpg"
                    >
                      <Image
                        fill
                        sizes="(max-width: 768px) 100vw, 33vw"
                        style={{ objectFit: "cover" }}
                        src="/images/pausecon-london-sept-2026/parliament-conference-hall-thumb.jpg"
                        alt="Attendees seated for the Parliamentary conference in the Palace of Westminster"
                      />
                    </a>
                    <a
                      className="shot"
                      href="/images/pausecon-london-sept-2026/parliament-conference-panel.jpg"
                    >
                      <Image
                        fill
                        sizes="(max-width: 768px) 100vw, 33vw"
                        style={{ objectFit: "cover" }}
                        src="/images/pausecon-london-sept-2026/parliament-conference-panel-thumb.jpg"
                        alt="Speakers and organisers of the Parliamentary conference gathered at the panel table"
                      />
                    </a>
                    <a
                      className="shot shot-wide"
                      href="/images/pausecon-london-sept-2026/pausecon-london-group.jpg"
                    >
                      <Image
                        fill
                        sizes="(max-width: 768px) 100vw, 66vw"
                        style={{ objectFit: "cover" }}
                        src="/images/pausecon-london-sept-2026/pausecon-london-group-thumb.jpg"
                        alt="PauseCon London attendees gathered for a group photo"
                      />
                    </a>
                  </div>
                </div>
              </li>

              <li className="entry" id="parliamentary-meetings">
                <aside className="entry-date">
                  <span className="month">June</span>
                  <span className="year">2026</span>
                </aside>
                <div className="entry-body">
                  <div className="entry-heading">
                    <h3 className="entry-title">Parliamentary Meetings</h3>
                    <CopyLinkButton href="/track-record/#parliamentary-meetings" title="Copy link to this entry" size={14} />
                  </div>
                  <div className="entry-text">
                    <p>
                      Volunteers from across the country contacted their Members
                      of Parliament asking to meet at the House of Commons. We
                      met with the following MPs (or their staff members):
                    </p>
                    <ul className="list">
                      <li>
                        <strong>Anneliese Dodds MP</strong>, for Oxford East
                        (Labour).
                      </li>
                      <li>
                        <strong>Sarah Olney MP</strong>, for Richmond Park
                        (Liberal Democrats).
                      </li>
                      <li>
                        <strong>Jeremy Corbyn MP</strong>, for Islington North
                        (Your Party).
                      </li>
                      <li>
                        <strong>Monica Harding MP</strong>, for Esher and Walton
                        (Liberal Democrats).
                      </li>
                      <li>
                        <strong>Chris Vince MP</strong>, for Harlow (Labour).
                      </li>
                      <li>
                        <strong>Siân Berry MP</strong>, for Brighton Pavillion
                        (Green).
                      </li>
                      <li>
                        <strong>Dame Meg Hillier MP</strong>, for Hackney South
                        and Shoreditch (Labour Co-op).
                      </li>
                    </ul>
                    <p>
                      Our conversations were broadly successful, resulting in
                      Chris Vince and Siân Berry writing letters to Kanishka
                      Narayan MP (Minister for Artificial Intelligence),
                      Anneliese Dodds and Siân Berry signing PauseAI UK&apos;s{" "}
                      <a
                        href="https://pauseai.uk/campaigns"
                        className="inline-link"
                        target="_blank"
                        rel="noreferrer"
                      >
                        open letter
                      </a>
                      , and other MPs requested further meetings and briefings.
                    </p>
                  </div>
                  <div className="gallery gallery-3">
                    <a
                      className="shot"
                      href="/images/parliament-june-2026/volunteers.jpg"
                    >
                      <Image
                        fill
                        sizes="(max-width: 768px) 100vw, 33vw"
                        style={{ objectFit: "cover" }}
                        src="/images/parliament-june-2026/volunteers.jpg"
                        alt="PauseAI UK Director Joseph Miller and three volunteers in the House of Commons"
                      />
                    </a>
                    <a
                      className="shot"
                      href="/images/parliament-june-2026/jeremy-corbyn.jpg"
                    >
                      <Image
                        fill
                        sizes="(max-width: 768px) 100vw, 33vw"
                        style={{ objectFit: "cover" }}
                        src="/images/parliament-june-2026/jeremy-corbyn.jpg"
                        alt="PauseAI UK Board member David Wood with MP Jeremy Corbyn"
                      />
                    </a>
                    <a
                      className="shot shot-wide"
                      href="/images/parliament-june-2026/group-landscape.jpg"
                    >
                      <Image
                        fill
                        sizes="(max-width: 768px) 100vw, 66vw"
                        style={{ objectFit: "cover" }}
                        src="/images/parliament-june-2026/group-landscape.jpg"
                        alt="PauseAI volunteers gathered on the steps in the House of Commons"
                      />
                    </a>
                  </div>
                </div>
              </li>

              <li className="entry" id="march-for-ai-safety">
                <aside className="entry-date">
                  <span className="month">February</span>
                  <span className="year">2026</span>
                </aside>
                <div className="entry-body">
                  <div className="entry-heading">
                    <h3 className="entry-title">March for AI Safety</h3>
                    <CopyLinkButton href="/track-record/#march-for-ai-safety" title="Copy link to this entry" size={14} />
                  </div>
                  <div className="entry-text">
                    <p>
                      We co-organised a march past the offices of OpenAI and Big
                      Tech companies in King&apos;s Cross, London.{" "}
                      <strong>
                        It was the largest ever protest focused exclusively on
                        the risks of AI
                      </strong>
                      , with around 300 people marching and media coverage in{" "}
                      <a
                        href="https://www.technologyreview.com/2026/03/02/1133814/i-checked-out-londons-biggest-ever-anti-ai-protest/"
                        className="inline-link"
                        target="_blank"
                        rel="noreferrer"
                      >
                        MIT Technology Review
                      </a>
                      ,{" "}
                      <a
                        href="https://www.independent.co.uk/tech/ai-safety-declaration-steve-bannon-b2932570.html"
                        className="inline-link"
                        target="_blank"
                        rel="noreferrer"
                      >
                        The Independent
                      </a>
                      ,{" "}
                      <a
                        href="https://www.wsj.com/tech/ai/ai-companies-public-relations-ae312d79"
                        className="inline-link"
                        target="_blank"
                        rel="noreferrer"
                      >
                        The Wall Street Journal
                      </a>{" "}
                      and{" "}
                      <Link href="/#news" className="inline-link">
                        others
                      </Link>
                      .
                    </p>
                    <p>
                      The other organisers included{" "}
                      <a
                        href="https://pulltheplug.uk/"
                        className="inline-link"
                        target="_blank"
                        rel="noreferrer"
                      >
                        <em>Pull the Plug</em>
                      </a>
                      , a new group focused on the existing harms of AI. We
                      consider the march a great success of coalition building
                      between the historically opposed AI ethics and AI safety
                      interests, with PauseAI and Pull the Plug represented in
                      equal numbers.
                    </p>
                  </div>
                  <div className="gallery gallery-3">
                    <a
                      className="shot"
                      href="/images/fundraising/march-feb2026-banner.jpg"
                    >
                      <Image
                        fill
                        sizes="(max-width: 768px) 100vw, 33vw"
                        style={{ objectFit: "cover" }}
                        src="/images/fundraising/march-feb2026-banner-thumb.jpg"
                        alt="PauseAI banner at the head of the March for AI Safety"
                      />
                    </a>
                    <a
                      className="shot"
                      href="/images/fundraising/march-feb2026-deepmind-walkby.jpg"
                    >
                      <Image
                        fill
                        sizes="(max-width: 768px) 100vw, 33vw"
                        style={{ objectFit: "cover" }}
                        src="/images/fundraising/march-feb2026-deepmind-walkby-thumb.jpg"
                        alt="Marchers walking past DeepMind offices"
                      />
                    </a>
                    <a
                      className="shot shot-wide"
                      href="/images/fundraising/march-feb2026-maxime-speech.jpg"
                    >
                      <Image
                        fill
                        sizes="(max-width: 768px) 100vw, 66vw"
                        style={{ objectFit: "cover" }}
                        src="/images/fundraising/march-feb2026-maxime-speech-thumb.jpg"
                        alt="Maxime speaking to the protest audience"
                      />
                    </a>
                  </div>
                </div>
              </li>

              <li className="entry" id="pausecon-brussels">
                <aside className="entry-date">
                  <span className="month">February</span>
                  <span className="year">2026</span>
                </aside>
                <div className="entry-body">
                  <div className="entry-heading">
                    <h3 className="entry-title">PauseCon Brussels</h3>
                    <CopyLinkButton href="/track-record/#pausecon-brussels" title="Copy link to this entry" size={14} />
                  </div>
                  <div className="entry-text">
                    <p>
                      We delivered the next PauseCon in Brussels on behalf of
                      Global and again ran two days of training workshops for
                      PauseAI organisers from around the world.
                    </p>
                    <p>
                      The final day included a public conference in the European
                      Parliament, featuring several prominent speakers,
                      including:
                    </p>
                    <ul className="list">
                      <li>
                        <strong>Professor Stuart Russell</strong>, author of the
                        authoritative textbook on AI.
                      </li>
                      <li>
                        <strong>Brando Benifei MEP</strong>, primary architect
                        of the EU AI Act.
                      </li>
                      <li>
                        <strong>Victor Negrescu MEP</strong>, Vice-President of
                        the European Parliament.
                      </li>
                      <li>
                        <strong>Risto Uuk</strong>, Head of European Policy at
                        the Future of Life Institute.
                      </li>
                    </ul>
                    <p>
                      Brando Benifei discussed the strengths and limitations of
                      the EU AI Act candidly and argued that the Act is not
                      merely a product regulation, but that the code of practice
                      can be extended to cover internal deployment within AI
                      companies. We hope that PauseAI will be able to work with
                      Mr Benifei to help see such changes implemented.
                    </p>
                    <p>
                      Many volunteer projects were initiated over the weekend
                      and several attendees have since held meetings with their
                      own MEPs to follow up on the issues discussed.
                    </p>
                  </div>
                  <div className="gallery gallery-4">
                    <a
                      className="shot shot-tall"
                      href="/images/fundraising/brussels-benifei-russell.jpg"
                    >
                      <Image
                        fill
                        sizes="(max-width: 768px) 100vw, 25vw"
                        style={{ objectFit: "cover" }}
                        src="/images/fundraising/brussels-benifei-russell-thumb.jpg"
                        alt="Panel with Benifei and Russell at PauseCon Brussels"
                      />
                    </a>
                    <a
                      className="shot"
                      href="/images/fundraising/brussels-panel.jpg"
                    >
                      <Image
                        fill
                        sizes="(max-width: 768px) 100vw, 25vw"
                        style={{ objectFit: "cover" }}
                        src="/images/fundraising/brussels-panel-thumb.jpg"
                        alt="PauseCon Brussels panel in the European Parliament"
                      />
                    </a>
                    <a
                      className="shot"
                      href="/images/fundraising/brussels-discussion.jpg"
                    >
                      <Image
                        fill
                        sizes="(max-width: 768px) 100vw, 25vw"
                        style={{ objectFit: "cover" }}
                        src="/images/fundraising/brussels-discussion-thumb.jpg"
                        alt="Attendees discussing during PauseCon Brussels"
                      />
                    </a>
                    <a
                      className="shot"
                      href="/images/fundraising/brussels-russell-interview.jpg"
                    >
                      <Image
                        fill
                        sizes="(max-width: 768px) 100vw, 25vw"
                        style={{ objectFit: "cover" }}
                        src="/images/fundraising/brussels-russell-interview-thumb.jpg"
                        alt="Stuart Russell interview at PauseCon Brussels"
                      />
                    </a>
                  </div>
                </div>
              </li>

              <li className="entry" id="westminster-hall-debate">
                <aside className="entry-date">
                  <span className="month">December</span>
                  <span className="year">2025</span>
                </aside>
                <div className="entry-body">
                  <div className="entry-heading">
                    <h3 className="entry-title">Westminster Hall Debate</h3>
                    <CopyLinkButton href="/track-record/#westminster-hall-debate" title="Copy link to this entry" size={14} />
                  </div>
                  <div className="entry-text">
                    <p>
                      We proposed and helped to organise a{" "}
                      <a
                        href="https://www.bbc.co.uk/iplayer/episode/m002nr42/westminster-hall-10122025"
                        className="inline-link"
                        target="_blank"
                        rel="noreferrer"
                      >
                        Westminster Hall debate
                      </a>{" "}
                      in Parliament on AI Safety. We wrote a memo which was sent
                      out to all MPs prior to the debate and also helped to
                      draft some proposition speeches, putting us in a strong
                      position to work with those MPs when proposing amendments
                      to the Cyber Security and Resilience Bill.
                    </p>
                  </div>
                  <div className="gallery gallery-1">
                    <a
                      className="shot shot-wide"
                      href="/images/fundraising/westminster-hall.jpg"
                    >
                      <Image
                        width={960}
                        height={538}
                        sizes="(max-width: 768px) 100vw, 640px"
                        style={{ width: "100%", height: "auto" }}
                        src="/images/fundraising/westminster-hall-thumb.jpg"
                        alt="MP speaking during the Westminster Hall debate on AI safety"
                      />
                    </a>
                  </div>
                </div>
              </li>

              <li className="entry" id="documentary-screening-in-parliament">
                <aside className="entry-date">
                  <span className="month">October</span>
                  <span className="year">2025</span>
                </aside>
                <div className="entry-body">
                  <div className="entry-heading">
                    <h3 className="entry-title">Documentary Screening in Parliament </h3>
                    <CopyLinkButton href="/track-record/#documentary-screening-in-parliament" title="Copy link to this entry" size={14} />
                  </div>
                  <div className="entry-text">
                    <p>
                      We held a{" "}
                      <a
                        href="https://x.com/MichaelTrazzi/status/1981707497862811916"
                        className="inline-link"
                        target="_blank"
                        rel="noreferrer"
                      >
                        screening
                      </a>{" "}
                      in the UK Parliament of filmmaker Michaël Trazzi&apos;s
                      documentary about SB-1047, the proposed California AI
                      legislation. This helped to educate MPs and Peers about
                      the sorts of AI legislation that could be in the UK bill,
                      and the battle with Big Tech that they should expect to
                      face.
                    </p>
                  </div>
                  <div className="gallery gallery-1">
                    <a
                      className="shot"
                      href="/images/fundraising/documentary-scott-wiener.jpg"
                    >
                      <Image
                        width={960}
                        height={540}
                        sizes="(max-width: 768px) 100vw, 640px"
                        style={{ width: "100%", height: "auto" }}
                        src="/images/fundraising/documentary-scott-wiener-thumb.jpg"
                        alt="Scott Wiener on screen during the Parliament screening"
                      />
                    </a>
                  </div>
                </div>
              </li>

              <li className="entry" id="book-launch-party">
                <aside className="entry-date">
                  <span className="month">September</span>
                  <span className="year">2025</span>
                </aside>
                <div className="entry-body">
                  <div className="entry-heading">
                    <h3 className="entry-title">Book launch party</h3>
                    <CopyLinkButton href="/track-record/#book-launch-party" title="Copy link to this entry" size={14} />
                  </div>
                  <div className="entry-text">
                    <p>
                      Throughout the year, we regularly held social events,
                      which helped to strengthen the sense of community that
                      keeps people actively involved in PauseAI for months and
                      years. One highlight was the book launch party for{" "}
                      <em>If Anyone Builds It, Everyone Dies</em> in September.
                    </p>
                  </div>
                  <div className="gallery gallery-1">
                    <a
                      className="shot"
                      href="/images/fundraising/book-launch-alistair.jpg"
                    >
                      <Image
                        width={960}
                        height={498}
                        sizes="(max-width: 768px) 100vw, 640px"
                        style={{ width: "100%", height: "auto" }}
                        src="/images/fundraising/book-launch-alistair-thumb.jpg"
                        alt="Alistair reading at the September book launch party"
                      />
                    </a>
                  </div>
                </div>
              </li>

              <li className="entry" id="open-letter-to-demis-hassabis">
                <aside className="entry-date">
                  <span className="month">August</span>
                  <span className="year">2025</span>
                </aside>
                <div className="entry-body">
                  <div className="entry-heading">
                    <h3 className="entry-title">Open Letter to Demis Hassabis</h3>
                    <CopyLinkButton href="/track-record/#open-letter-to-demis-hassabis" title="Copy link to this entry" size={14} />
                  </div>
                  <div className="entry-text">
                    <p>
                      We published an{" "}
                      <a
                        href="https://pauseai.info/dear-sir-demis-2025"
                        className="inline-link"
                        target="_blank"
                        rel="noreferrer"
                      >
                        open letter
                      </a>{" "}
                      <strong>signed by over 60 UK politicians</strong>, in
                      response to Google DeepMind failing to uphold its AI
                      safety commitments. Several of the MPs who signed later
                      spoke in the Westminster Hall debate that we helped to
                      organise in December.
                    </p>
                    <p>
                      <a
                        href="https://time.com/7313320/google-deepmind-gemini-ai-safety-pledge/"
                        className="inline-link"
                        target="_blank"
                        rel="noreferrer"
                      >
                        The article in TIME
                      </a>{" "}
                      that broke the story established for the first time that
                      Google DeepMind did not provide the UK AISI with
                      pre-deployment access to Gemini 2.5 Pro. Notably, Google
                      did provide AISI with pre-deployment access to Gemini 3
                      Pro a couple of months after the letter was published.
                    </p>
                  </div>
                  <div className="gallery gallery-1">
                    <a
                      className="shot shot-wide"
                      href="/images/fundraising/time-article.png"
                    >
                      <Image
                        width={1600}
                        height={921}
                        sizes="(max-width: 768px) 100vw, 640px"
                        style={{ width: "100%", height: "auto" }}
                        src="/images/fundraising/time-article.png"
                        alt="TIME article: 60 U.K. Lawmakers Accuse Google of Breaking AI Safety Pledge"
                      />
                    </a>
                  </div>
                </div>
              </li>

              <li className="entry entry-finale" id="pausecon-london">
                <aside className="entry-date">
                  <span className="month">June</span>
                  <span className="year">2025</span>
                </aside>
                <div className="entry-body">
                  <div className="entry-heading">
                    <h3 className="entry-title">PauseCon London</h3>
                    <CopyLinkButton href="/track-record/#pausecon-london" title="Copy link to this entry" size={14} />
                  </div>
                  <div className="entry-text">
                    <p>
                      We delivered the first PauseAI conference, PauseCon, on
                      behalf of PauseAI Global, bringing together around 60
                      volunteers from around the world for the first time and
                      training them to be better organisers and communicators.
                      We welcomed a range of excellent guest speakers from the
                      AI safety community, including{" "}
                      <strong>
                        Connor Leahy, Rob Miles, David Krueger and Kat Woods
                      </strong>
                      .
                    </p>
                    <p>
                      PauseAI Germany, among others, came away from the event
                      with renewed purpose and went on to organise a{" "}
                      <a
                        href="https://www.pause-ai.de/appell"
                        className="inline-link"
                        target="_blank"
                        rel="noreferrer"
                      >
                        petition
                      </a>{" "}
                      signed by 150 German professors. One volunteer, Didier
                      Coeurnelle, was inspired to initiate and fund the next
                      PauseCon in Brussels.
                    </p>
                  </div>
                  <div className="gallery gallery-3">
                    <a
                      className="shot"
                      href="/images/fundraising/pausecon-london-discussion.jpg"
                    >
                      <Image
                        fill
                        sizes="(max-width: 768px) 100vw, 33vw"
                        style={{ objectFit: "cover" }}
                        src="/images/fundraising/pausecon-london-discussion-thumb.jpg"
                        alt="PauseCon London attendees in discussion"
                      />
                    </a>
                    <a
                      className="shot"
                      href="/images/fundraising/pausecon-london-ella-workshop.jpg"
                    >
                      <Image
                        fill
                        sizes="(max-width: 768px) 100vw, 33vw"
                        style={{ objectFit: "cover" }}
                        src="/images/fundraising/pausecon-london-ella-workshop-thumb.jpg"
                        alt="Ella leading a workshop at PauseCon London"
                      />
                    </a>
                    <a
                      className="shot"
                      href="/images/fundraising/connor-leahy-speaking.jpg"
                    >
                      <Image
                        fill
                        sizes="(max-width: 768px) 100vw, 33vw"
                        style={{ objectFit: "cover" }}
                        src="/images/fundraising/connor-leahy-speaking-thumb.jpg"
                        alt="Connor Leahy speaking at PauseCon London"
                      />
                    </a>
                  </div>
                </div>
              </li>
            </ol>
          </div>
        </section>

        <section className="closing">
          <div className="container closing-inner">
            <p className="closing-sub">Join us for what comes next.</p>
            <div className="closing-actions">
              <a
                className="btn primary"
                href={site.whatsappUrl}
                target="_blank"
                rel="noreferrer"
              >
                Join the WhatsApp community
              </a>
              <Link className="btn ghost" href="/#join">
                More ways to get involved
              </Link>
            </div>
          </div>
        </section>
      </main>

      <div className="lightbox" id="lightbox" aria-hidden="true" role="dialog">
        <button className="lb-close" aria-label="Close">
          <svg viewBox="0 0 24 24" width={20} height={20} aria-hidden="true">
            <path
              d="M6 6l12 12M18 6L6 18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
        <button className="lb-prev" aria-label="Previous">
          <svg viewBox="0 0 24 24" width={22} height={22} aria-hidden="true">
            <path
              d="M15 5l-7 7 7 7"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <button className="lb-next" aria-label="Next">
          <svg viewBox="0 0 24 24" width={22} height={22} aria-hidden="true">
            <path
              d="M9 5l7 7-7 7"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <img className="lb-image" alt="" />
      </div>

      <Script src="/track-record.js" strategy="afterInteractive" />
    </>
  );
}
