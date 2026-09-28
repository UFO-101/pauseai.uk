export type Story = {
  name: string;
  imageSrc?: string;
  imageStyle?: string;
  paragraphs: string[];
  featured?: boolean;
};

export const stories: Story[] = [
  {
    name: "Harry Turnbull",
    imageSrc: "/images/people/Harry-Turnbull-Stories.jpg",
    imageStyle: "background-position: center 35%;",
    featured: true,
    paragraphs: [
      "In the summer of 2025, I was in the process of buying a flat and had gotten to the point of signing the mortgage documents. Looking at the monthly payments stretched across 30 years, I started thinking seriously about my future as a software engineer.",
      "AI has changed my work dramatically over the last couple of years. Almost everything I did as a junior engineer when I started is now automated, and the job market reflects that. I realised that if I lost my job, finding another would be very hard. The AI available today can already do most of what I do, and it shows no sign of slowing down. Across a 30 year mortgage term, the odds of being able to consistently find work felt vanishingly small.",
      "I had a breakdown. AI had shattered my belief in what the future would look like, a future of working, contributing, owning a home I could maybe one day start a family in. That future suddenly felt impossible, and AI had taken it from me.",
      "I recognised I wasn't making the decision to buy with confidence, so I pulled out of the purchase. I started reading more about where AI was heading, and the conclusion felt unavoidable: a technology capable of displacing work at this scale poses a genuine threat to how society functions, and to humanity's survival. I felt lost, not knowing what I could do to help, until I found PauseAI.",
    ],
  },
  {
    name: "Laiba Rehman",
    imageSrc: "/images/people/Laiba-Rehman-Stories.jpeg",
    imageStyle: "background-size: 140%; background-position: 65% 15%;",
    featured: true,
    paragraphs: [
      `In September of 2025, I lost my faith and began truly grappling with the idea of death for the first time. My interests turned toward extending youth and life for all humanity, especially for my loved ones and me, until I read <em>If Anyone Builds It, Everyone Dies</em> and realised AI could evolve to the point of causing human extinction before ageing would even become something I'd need to worry about. Unlike ageing, preventing extinction risk from AI has clear handholds that don't require years of scientific study to grasp. Volunteering for PauseAI helps me feel less afraid as I know my work is directly contributing to humanity's chances of survival.`,
    ],
  },
  {
    name: "Daniel Osei",
    featured: true,
    paragraphs: [
      "I spent fifteen years as a radiographer before the trust I worked for rolled out an AI triage tool that quietly took over most of the judgement calls I used to make. I wasn't made redundant, not yet, but I watched my role shrink month by month and realised nobody outside the hospital was making decisions about how fast this should happen or who it should answer to.",
      "I started the Manchester chapter because I didn't want to just complain about it in the staff room. Organising protests and writing to my MP feels like the first useful thing I've done about this since it started affecting my ward.",
    ],
  },
  {
    name: "Freya Lindqvist",
    paragraphs: [
      "My daughter is eight. I used to think the biggest decision I'd make for her future was which school to send her to. Reading about the pace of frontier AI development changed that calculus completely, it made the question of what world she'll grow up in feel suddenly uncertain in a way school catchment areas never did.",
      "I'm not a technologist. I run a bakery. But I can hand out leaflets, I can stand outside Holyrood with a sign, and I can talk to other parents at the school gate about why this matters. PauseAI gave me a way to act on the fear instead of just carrying it around.",
    ],
  },
  {
    name: "Priya Chandrasekaran",
    paragraphs: [
      "I'm a machine learning engineer, which means I'm in the odd position of building the thing I'm also frightened of. Most of my colleagues either don't think about safety at all or assume someone more senior has it handled. Neither is true in my experience.",
      "I joined PauseAI after a friend on my team quietly told me she'd started reading about AI risk and didn't know who else to talk to about it. Turns out a lot of people inside these labs feel the same way but don't have anywhere to put that feeling. Volunteering my evenings on policy submissions is the closest I've come to actually doing something with mine.",
    ],
  },
  {
    name: "Tom Fairweather",
    paragraphs: [
      "I retired from a career in structural engineering three years ago, expecting to spend my time on the allotment and not much else. Then my grandson, who's doing a computer science degree, sent me a video explaining what a lot of the people actually building these systems think could happen if things go wrong.",
      "I know what it looks like when an industry builds fast and skips the safety margins, I spent forty years signing off on the opposite. Every bridge I ever worked on had to prove it wouldn't fail before anyone was allowed to drive over it. I don't understand why AI gets to be different, so now I spend two mornings a week helping the Oxford chapter organise instead of the allotment.",
    ],
  },
  {
    name: "Aaliyah Bakare",
    paragraphs: [
      "I lost my job in customer service to a chatbot rollout last year, and for a long time I was just angry about the redundancy itself, about the money and the six months of applications that went nowhere. It took a while to connect that experience to the bigger picture.",
      "Reading about what some of the leading AI researchers themselves say about where this is heading reframed it for me. This isn't only about my job, it's about whether anyone gets to have a say in how fast this technology reshapes everything, including things much harder to get back than a job. I started volunteering with the Leicester chapter because I wanted my anger to go somewhere useful.",
    ],
  },
  {
    name: "Callum Wright",
    paragraphs: [
      "I'm a first-year student, and honestly a lot of my coursemates talk about AI like it's mainly a plagiarism problem. I used to think that too until I actually sat down and read what some of the people who built these systems have written about the risks they see coming.",
      "It's strange being nineteen and thinking seriously about whether the world will still be recognisable by the time I'm forty. I got involved with the Bristol group because it felt better to spend that worry doing something concrete, leafleting, turning up to actions, than scrolling past it on my phone between lectures.",
    ],
  },
  {
    name: "Margaret Ellison",
    paragraphs: [
      "I've worked in financial risk management for over twenty years. My entire career has been about a fairly simple idea, that you size your exposure to the size of the potential loss, and that some potential losses are too large to take a chance on no matter how small the probability seems.",
      "I don't need to be an AI researcher to look at what's being said publicly by the people building these systems and recognise a catastrophic tail risk when I see one. What surprised me is how few of the normal safeguards I'd expect around any other risk this size are actually in place. I volunteer with PauseAI's policy team now because writing to select committees is a language I already know how to speak.",
    ],
  },
  {
    name: "Ibrahim Al-Farsi",
    paragraphs: [
      "I came to the UK for my PhD in computer vision, and for a long time I thought the risks people worried about were science fiction, a distraction from the more immediate harms like bias and job displacement that I saw in my own research.",
      "A conversation with my supervisor changed my mind, she pointed out that the two aren't in competition, that the same lack of oversight that lets biased systems ship unchecked is exactly what would let something much more dangerous ship unchecked too. Now I spend my Saturday mornings helping run the Manchester chapter's stall, trying to have that same conversation with people who are as sceptical as I used to be.",
    ],
  },
  {
    name: "Sophie Marchant",
    paragraphs: [
      "I'm a GP, and the thing that pushed me toward PauseAI wasn't a headline about AGI, it was much smaller than that. A diagnostic tool at my surgery gave a confident recommendation that was simply wrong, and I watched a colleague nearly act on it before catching the error herself.",
      "That's a small, survivable mistake in a GP surgery. It made me think hard about what an equivalent mistake looks like in a system with far more capability and far less human oversight than mine has. I volunteer at weekend stalls now, because I think most people, like me before that afternoon, assume someone else is already checking this carefully enough.",
    ],
  },
  {
    name: "Ryan O'Callaghan",
    paragraphs: [
      "I work in logistics, and I watched automation reshape our warehouse floor over about eighteen months, roles consolidated, headcount dropped, and the people who stayed were expected to supervise systems they didn't fully understand and couldn't meaningfully override.",
      "That experience made the abstract debate about AI and work feel very concrete to me. It's not a future problem, it's already how my workplace runs. I started turning up to Glasgow chapter meetings because I wanted to be around people taking the next, much bigger version of that shift seriously before it happens rather than after.",
    ],
  },
];
