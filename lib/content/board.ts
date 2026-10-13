export type BoardMember = {
  name: string;
  role: string;
  imageSrc: string;
  website: string;
  x: string;
};

export const board: BoardMember[] = [
  {
    name: "Joseph Miller",
    role: "Director of PauseAI UK",
    imageSrc: "/images/people/board/Joseph-Miller.jpg",
    website: "https://josephmiller.xyz/",
    x: "https://x.com/JosephMiller_",
  },
  {
    name: "David Wood",
    role: "Author and Chair of the London Futurists",
    imageSrc: "/images/people/board/David-Wood.jpg",
    website: "https://fastfuture.com/FFP-authors/david-w-wood/",
    x: "https://x.com/dw2",
  },
  {
    name: "Joep Meindertsma",
    role: "Founder of PauseAI Global",
    imageSrc: "/images/people/board/Joep-Meindertsma.jpg",
    website: "https://github.com/joepio",
    x: "https://x.com/joepmeindertsma",
  },
  {
    name: "Jonathan Bostock",
    role: "AI alignment researcher at Arcadia Impact",
    imageSrc: "/images/people/board/Jonathan-Bostock.jpg",
    website: "https://jonathanbostock.github.io/",
    x: "https://x.com/J_Bostock",
  },
];
