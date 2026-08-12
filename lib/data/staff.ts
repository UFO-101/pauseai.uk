export type StaffMember = {
  name: string;
  role: string;
  bio: string;
  imageSrc: string;
};

export const staff: StaffMember[] = [
  {
    name: "Joseph Miller",
    role: "UK Director",
    bio: "Coordinating national campaigns, media engagement, and chapter growth.",
    imageSrc: "/images/people/Joseph-Miller (UK Director).jpg",
  },
  {
    name: "Matilda da Rui",
    role: "UK Deputy Director",
    bio: "Supporting operations, outreach, and coordination across chapters.",
    imageSrc: "/images/people/Matilda-da-Rui (UK Deputy Director).jpeg",
  },
];
