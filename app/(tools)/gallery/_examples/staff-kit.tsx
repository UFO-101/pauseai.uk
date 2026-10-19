// The staff interface's kit (app/(staff)/staff/_components/ui/): the page
// frame, which sets the compact density. Its fields, tables, tags and text
// are the site's, in the forms group, at both densities.
import StaffPage from "@/app/(staff)/staff/_components/ui/StaffPage";
import type { Group } from "../_components/types";

export const staffKit: Group = {
  id: "staff-kit",
  title: "The staff interface's kit",
  examples: [
    {
      name: "StaffPage",
      file: "app/(staff)/staff/_components/ui/StaffPage.tsx",
      variants: [
        {
          label: "A page's frame, with a heading and a line",
          render: () => (
            <StaffPage as="div">
              <h1>An example staff page</h1>
              <p>A line of text under its heading.</p>
            </StaffPage>
          ),
        },
      ],
    },
  ],
};
