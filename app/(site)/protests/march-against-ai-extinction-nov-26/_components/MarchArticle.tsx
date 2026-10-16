import Image from "next/image";
import { ButtonAnchor } from "@/components/ui/Button";
import { march } from "@/lib/content/march";
import { site } from "@/lib/content/site";
import styles from "./MarchArticle.module.css";

// The Luma event's description, word for word and in its order, under its cover photo.
export default function MarchArticle() {
  return (
    <section className={styles.body}>
      <div className={"container"}>
        <Image
          className={styles.photo}
          src={march.image.src}
          alt="Marchers holding signs reading “Just don't build AGI” and “Don't let AI decide your future”"
          width={march.image.width}
          height={march.image.height}
          sizes="(max-width: 840px) 100vw, 760px"
          priority
        />
        <div className={styles.prose}>
          <p className={styles.lead}>
            Thousands of people across the UK believe that companies will soon build superintelligent AI that they
            cannot control.
          </p>
          <p>
            If we all march together, newspapers{" "}
            <a href="https://www.wsj.com/tech/ai/ai-companies-public-relations-ae312d79">
              <strong>will</strong>
            </a>{" "}
            <a href="https://www.businessinsider.com/protesters-accuse-google-deepmind-breaking-promises-ai-safety-2025-6">
              <strong>publish</strong>
            </a>{" "}
            <a href="https://www.technologyreview.com/2026/03/02/1133814/i-checked-out-londons-biggest-ever-anti-ai-protest/">
              <strong>photos</strong>
            </a>{" "}
            of it all over the world. Every month more and more people notice how dangerous our situation is. Awareness
            of this problem is accelerating rapidly as we get closer to catastrophe.
          </p>
          <p>
            For the past 3 years, PauseAI UK has consistently held the largest rallies for AI safety in the world. Each
            time is bigger than the last and this march will be no exception.
          </p>

          <h2>What we want: Frontier AI Legislation</h2>
          <p>
            The UK has no specific legal standards for AI. No regulator oversees frontier AI development. And UK law
            does not reliably hold developers liable for damage or deaths caused by their models, even when the danger
            is predictable, preventable and uniquely enabled by AI. In short, UK law neither requires developers to
            guard against frontier AI risks, nor exposes them to any financial consequence if they fail to do so.
          </p>
          <p>
            In July, an autonomous AI agent developed by OpenAI broke out of an isolated test environment, hacked parts
            of OpenAI&rsquo;s own network to gain access to the internet and compromised the infrastructure of Hugging
            Face, another AI company. The agent had not been instructed to attack Hugging Face; it did so because it
            inferred that their servers might contain solutions to the benchmark on which it was being evaluated. The
            campaign unfolded over the course of four and a half days, with OpenAI only becoming aware of the incident
            several days later.
          </p>

          <h2>
            It&rsquo;s time for the government to step in. We call on the Prime Minister to introduce frontier AI
            legislation to prevent catastrophe.
          </h2>
          <p>
            Bring a poster and a friend or family member. We need every person to step up and help bring about an actual
            change to the law.
          </p>

          <h2>Get involved</h2>
          <p>
            We&rsquo;re looking for volunteers to help with tabling and flyering to advertise the protest. If
            you&rsquo;re interested in volunteering for several hours a week, please email{" "}
            <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>.
          </p>

          <h2>Code of Conduct</h2>
          <p>
            This event will be family friendly, law-abiding and strictly non-violent. We will coordinate with the police
            ahead of the march.
          </p>

          <p className={styles.ctaRow}>
            <ButtonAnchor variant="primary" href={march.lumaUrl}>
              Register &rarr;
            </ButtonAnchor>
          </p>
        </div>
      </div>
    </section>
  );
}
