import StoryShareForm from "@/components/people/StoryShareForm";
import { site } from "@/lib/content/site";

// The story submission form, under the stories. `id` makes it linkable
// (/people#share-your-story).
export default function ShareYourStory({ id }: { id?: string }) {
  return (
    <section id={id} className="people-page-share">
      <div className="container">
        <div className="section-header">
          <h2>Share your story</h2>
          <p className="section-lede">Why did you get involved, or what are your own concerns about AI?</p>
          <p className="section-lede">
            Tell us in your own words, we may feature it on this page. Connect with others who have similar stories in{" "}
            <a className="inline-link" href={site.whatsappUrl} target="_blank" rel="noreferrer">
              our community
            </a>
            .
          </p>
        </div>
        <StoryShareForm />
      </div>
    </section>
  );
}
