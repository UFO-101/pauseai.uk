import type { Metadata } from "next";
import type { LocalGroupPageContent } from "@/components/local-groups/LocalGroupPage";
import type { LocalGroupName } from "./local-groups";
import { site } from "./site";

// What each local group's page says, rendered by
// components/local-groups/LocalGroupPage.tsx. The group's name, path, map
// pin and header logo are in ./local-groups.ts.

const WHATSAPP = { label: "Join the WhatsApp community", href: site.whatsappUrl, newTab: true } as const;
const WEST_OF_ENGLAND_LINKTREE = "https://linktr.ee/PauseAI_West_of_England";

export const localGroupPages: Record<LocalGroupName, LocalGroupPageContent> = {
  Glasgow: {
    name: "Glasgow",
    hero: {
      lede: "Bringing AI safety conversations to Scotland with public events, panels, and community organising.",
      actions: [
        { label: "View event calendar", href: site.social.luma, variant: "primary", newTab: true },
        { ...WHATSAPP, variant: "ghost" },
      ],
      photo: "/images/local-groups/glasgow/GlasgowUniUnion.jpg",
    },
    sections: [
      {
        kind: "activities",
        heading: "What we've done",
        gridStyle: { gridTemplateColumns: "1fr" },
        items: [
          {
            title: "AI Risk – A Conversation We All Need to Have",
            text: "A public discussion unpacking the risks and responsibilities around advanced AI systems, featuring local voices and hands-on conversation.",
            image: "/images/local-groups/glasgow/GlasgowUniUnion.jpg",
            href: "https://luma.com/5bmd6rx8",
            style: { maxWidth: 480 },
          },
        ],
      },
      { kind: "events" },
      {
        kind: "contact",
        muted: true,
        heading: "Link up with the group",
        lede: "Join the WhatsApp community to connect with local organisers and hear about UK-wide events and campaigns.",
        calloutStyle: { marginTop: 18 },
        details: (
          <p className="section-lede">
            WhatsApp: <a href={site.whatsappUrl} target="_blank" rel="noreferrer">PauseAI UK WhatsApp</a>
          </p>
        ),
        actions: [{ ...WHATSAPP, variant: "primary" }],
      },
    ],
  },

  Manchester: {
    name: "Manchester",
    hero: {
      lede: "Building a local network in the North West to campaign for AI safety, host discussions, and support national actions.",
      actions: [
        { ...WHATSAPP, variant: "primary" },
        { label: "Follow us on Instagram", href: "https://www.instagram.com/pauseai.manchester", variant: "ghost", newTab: true },
        { label: "Follow us on Facebook", href: "https://www.facebook.com/profile.php?id=61577650457496", variant: "ghost", newTab: true },
        { label: "Book a 1-on-1 chat", href: "https://calendly.com/adr-skapars/pauseai-manchester-1-on-1", variant: "ghost", newTab: true },
      ],
      photo: "/images/local-groups/manchester/manchester_public.jpg",
      photoStyle: { backgroundSize: "cover, 110% auto", backgroundPosition: "center, center 22%", backgroundRepeat: "no-repeat" },
      badge: "Make your voice heard",
    },
    sections: [
      {
        kind: "features",
        heading: "What we're doing in Manchester",
        lede: "Public outreach, community discussion, and direct pressure on decision-makers.",
        items: [
          { title: "Letters to MPs", text: "Group emailing and letter-writing to put AI safety on our representatives' desks." },
          { title: "Public outreach", text: "Flyering and putting up posters in town to engage with the public on AI risk." },
          { title: "Discussion groups & socials", text: "Bringing people together to talk through the case for a pause and the future we want." },
        ],
      },
      {
        kind: "activities",
        heading: "Events we've done",
        items: [
          {
            title: "PauseAI Manchester Film Night",
            text: "A screening of an AI x-risk video with popcorn and vegan snacks, followed by group conversation about how we respond to advanced AI.",
            image: "/images/local-groups/manchester/movie_night.jpg",
            href: "https://luma.com/p8saolij",
          },
          {
            title: "PauseAI x EA: Discussion Group",
            text: "A friendly intro discussion on political solutions to existential risk from AI — covering whether pausing development and political action are effective strategies for reducing AI risk.",
            image: "/images/local-groups/manchester/discussion_group.jpg",
            imagePosition: "center 42%",
            href: "https://luma.com/5dv44ate",
          },
          {
            title: "PauseAI Manchester Coworking",
            text: "Casual coworking sessions where members come together to work on outreach, write to MPs, plan campaigns, and chat about AI safety over coffee.",
            image: "/images/local-groups/manchester/coworking_event.jpg",
          },
        ],
      },
      { kind: "events" },
      {
        kind: "contact",
        muted: true,
        heading: "Link up with the group",
        lede: "Join the WhatsApp community to connect with local organisers and hear about UK-wide events and campaigns. Want to learn more? Book a 1-on-1 chat.",
        calloutStyle: { marginTop: 18 },
        details: (
          <p className="section-lede">
            WhatsApp: <a href={site.whatsappUrl} target="_blank" rel="noreferrer">PauseAI UK WhatsApp</a>
          </p>
        ),
        actions: [
          { label: "Book a 1-on-1 chat", href: "https://calendly.com/adr-skapars/pauseai-manchester-1-on-1", variant: "primary", newTab: true },
          { label: "Email us", href: "mailto:Adr.Skapars@gmail.com", variant: "ghost" },
        ],
      },
    ],
  },

  "West of England": {
    name: "West of England",
    hero: {
      lede: "A new group bringing AI safety conversations and action to Bristol and the wider West of England.",
      actions: [
        { label: "Join the WhatsApp group", href: site.whatsappUrl, variant: "primary", newTab: true },
        { label: "All our links", href: WEST_OF_ENGLAND_LINKTREE, variant: "ghost", newTab: true },
      ],
      photo: "/images/local-groups/west-of-england/bristol-launch.jpg",
      photoStyle: { backgroundSize: "cover, cover", backgroundPosition: "center, center", backgroundRepeat: "no-repeat" },
      badge: "Just getting started",
    },
    sections: [
      {
        kind: "features",
        heading: "What we're building in the West of England",
        lede: "A brand new group — get in early and help shape how we campaign locally.",
        items: [
          { title: "Discussion groups & socials", text: "Bringing people together to talk through the case for a pause and the future we want." },
          { title: "Public outreach", text: "Flyering, stalls, and posters to engage the public on AI risk." },
          { title: "Letters to MPs", text: "Group emailing and letter-writing to put AI safety on our representatives' desks." },
        ],
      },
      { kind: "events" },
      {
        kind: "contact",
        muted: true,
        heading: "Link up with the group",
        lede: "Join the UK-wide WhatsApp to connect with organisers and hear about national events and campaigns.",
        details: (
          <>
            <p className="section-lede">
              WhatsApp: <a href={site.whatsappUrl} target="_blank" rel="noreferrer">PauseAI UK WhatsApp</a>
            </p>
            <p className="section-lede">
              All our links: <a href={WEST_OF_ENGLAND_LINKTREE} target="_blank" rel="noreferrer">linktr.ee/PauseAI_West_of_England</a>
            </p>
          </>
        ),
        actions: [{ label: "Join the WhatsApp group", href: site.whatsappUrl, variant: "primary", newTab: true }],
      },
    ],
  },

  Leicester: {
    name: "Leicester",
    hero: {
      lede: "Building a local network to campaign for AI safety, host discussions, and support national actions.",
      actions: [
        { label: "Email leicester@pauseai.info", href: "mailto:leicester@pauseai.info", variant: "primary" },
        { label: "Follow us on Instagram", href: "https://www.instagram.com/pauseai_leicester/", variant: "ghost" },
        { label: "Join our Discord", href: "https://discord.com", variant: "ghost" },
        { label: "Join the WhatsApp community", href: "/#get-involved", variant: "ghost", internal: true },
      ],
      photo: "/images/local-groups/leicester/london-2025-protest.jpg",
      badge: "Join in on protests!",
    },
    sections: [
      {
        kind: "features",
        heading: "Growing the Leicester group",
        lede: "Want to help? We're looking for organisers, hosts, and partners to kickstart regular meetups.",
        items: [
          { title: "Attend events", text: "Check out our Instagram or Discord for more info on events." },
          { title: "Join the talk", text: "Contact us on Instagram or Discord to find out how you can help." },
        ],
      },
      { kind: "events" },
      {
        kind: "activities",
        muted: true,
        heading: "Past events",
        gridStyle: { gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" },
        items: [
          {
            title: "PauseAI Leicester Launch",
            text: "The launch event for the Leicester group, bringing together students and locals to discuss AI safety.",
            image: "/images/local-groups/leicester/SirBobBurgessBuilding.jpg",
          },
          {
            title: "Film Night: The AI Doc",
            text: "We watched The AI Doc together in the cosy cinema room with popcorn and discussion.",
            image: "/images/local-groups/leicester/the-ai-doc-poster.jpg",
          },
        ],
      },
      {
        kind: "contact",
        heading: "Help shape the group",
        lede: "Contact us through the above methods if you can host an event, promote a meetup, or want to collaborate on outreach.",
        actions: [{ label: "Email Leicester", href: "mailto:leicester@pauseai.info", variant: "primary" }],
      },
    ],
  },

  Oxford: {
    name: "Oxford",
    hero: {
      lede: "University-driven conversations on AI risk, grounded in collaboration between students, researchers, and local residents.",
      actions: [
        { label: "Email oxford@pauseai.info", href: "mailto:oxford@pauseai.info", variant: "primary" },
        { label: "Join national chat", href: "/#get-involved", variant: "ghost", internal: true },
      ],
      photo: "/images/local-groups/oxford/PauseAI Oxford.jpg",
      badge: "Academic & community bridge",
    },
    sections: [
      {
        kind: "features",
        heading: "Oxford group focus",
        lede: "Oxford brings together safety researchers, policy thinkers, and students for talks, reading groups, and public engagement.",
        items: [
          { title: "Reading groups", text: "Digest recent AI safety policy proposals and critique lab commitments." },
          { title: "Workshops", text: "Skill-shares on communicating risk and mobilising campus support." },
          { title: "Joint actions", text: "Coordinate with other cities for aligned protests and open letters." },
        ],
      },
      { kind: "events" },
      {
        kind: "activities",
        muted: true,
        heading: "What we've done",
        gridStyle: { gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" },
        items: [
          {
            title: "PauseAI Oxford Launch: Why AI will cause human extinction",
            text: "The inaugural PauseAI Oxford event, exploring existential risk from advanced AI systems.",
            image: "/images/local-groups/oxford/ReubenCollege.jpg",
            href: "https://luma.com/5li0gx6b",
          },
          {
            title: "How to Pause AI Development – Talk + social",
            text: "A talk on practical strategies for slowing unsafe AI development, followed by drinks and discussion.",
            image: "/images/local-groups/oxford/ReubenBar.jpg",
            href: "https://luma.com/lqnts0io",
          },
        ],
      },
      {
        kind: "contact",
        heading: "Contact the Oxford team",
        lede: "Email us to join the mailing list, attend the next meet, or host an event on campus.",
        details: (
          <>
            <p className="section-lede">
              Email: <a href="mailto:oxford@pauseai.info">oxford@pauseai.info</a>
            </p>
            <p className="section-lede">
              National chat: <a href={site.whatsappUrl} target="_blank" rel="noreferrer">WhatsApp community</a>
            </p>
          </>
        ),
        actions: [{ label: "Email Oxford", href: "mailto:oxford@pauseai.info", variant: "primary" }],
      },
    ],
  },

  London: {
    name: "London",
    hero: {
      lede: "We gather researchers, students, campaigners, and neighbours to push for safer AI development through public action and dialogue.",
      actions: [
        { ...WHATSAPP, variant: "primary" },
        { label: "Email the team", href: `mailto:${site.contactEmail}`, variant: "ghost" },
      ],
      photo: "/images/book-launch-2025/G1kOF_EXMAA7yfX.jpeg",
      badge: "Central meetups & actions",
    },
    sections: [
      {
        kind: "activities",
        heading: "What we're doing in London",
        lede: "We combine public education with visible action to keep AI safety on the agenda.",
        items: [
          {
            title: "Book launch & discussion",
            text: "Standing-room-only event connecting authors, researchers, and the public around AI risk.",
            image: "/images/book-launch-2025/G1kOpmRWQAA8g2n.jpeg",
          },
          {
            title: "Letter-writing nights",
            text: "Coordinated outreach to policymakers and institutions demanding enforceable AI safety commitments.",
            image: "/images/letter-writing/G2DG8xBXMAABxmR.jpeg",
          },
          {
            title: "Direct action",
            text: "Peaceful protests at AI hubs to keep public pressure on labs and regulators.",
            image: "/images/local-groups/london/london-feb-2025-protest.jpg",
          },
        ],
      },
      { kind: "events" },
      {
        kind: "contact",
        muted: true,
        heading: "Join or host the next meetup",
        lede: "We meet regularly in central London for talks, workshops, and campaign planning.",
        details: (
          <>
            <p className="section-lede" style={{ maxWidth: 640 }}>
              New to the movement? Start by joining the WhatsApp community, then drop us an email if you&apos;d like to host or speak at an event.
            </p>
            <p>
              <strong>Contact:</strong> <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>
            </p>
          </>
        ),
        actions: [{ ...WHATSAPP, variant: "primary" }],
      },
    ],
  },
};

/** Page metadata, which follows the same pattern for every group. */
export function localGroupMetadata(name: LocalGroupName, path: string, description: string): Metadata {
  return {
    title: `${name} Group`,
    openGraph: {
      title: `PauseAI ${name}`,
      description,
      images: [{ url: "/images/open-graph/open-graph-1200-630.jpg", width: 1200, height: 630 }],
      url: `https://pauseai.uk${path}`,
    },
    twitter: {
      title: `PauseAI ${name}`,
      description,
      images: ["/images/open-graph/open-graph-1080-1080.jpg"],
    },
    alternates: { canonical: path },
  };
}
