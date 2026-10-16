import StoryShareForm from "@/components/people/StoryShareForm";
import { site } from "@/lib/content/site";
import { Lede, SectionHeader } from "@/components/ui/Section";

// The story submission form, under the stories. `id` makes it linkable
// (/people#share-your-story).
export default function ShareYourStory({ id }: { id?: string }) {
  return (
    <section id={id} className="people-page-share">
      <div className="container">
        <SectionHeader title="Share your story">
          <Lede>Why did you get involved, or what are your own concerns about AI?</Lede>
          <Lede>
            Tell us in your own words, we may feature it on this page. Connect with others who have similar stories in{" "}
            <a className="inline-link" href={site.whatsappUrl} target="_blank" rel="noreferrer">
              our community
            </a>
            .
          </Lede>
        </SectionHeader>
        <StoryShareForm />
      </div>
    </section>
  );
}
