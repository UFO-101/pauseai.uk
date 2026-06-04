import type { Metadata } from "next";
import Nav from "@/components/Nav";
import { site } from "@/lib/data/site";
import "../track-record/track-record.css";
import "./theory-of-change.css";

export const metadata: Metadata = {
  title: "PauseAI UK | Theory of Change",
  description: "How PauseAI UK plans to convert public concern about AI risk into political pressure for a global pause.",
  openGraph: {
    title: "PauseAI UK | Theory of Change",
    description: "How PauseAI UK plans to convert public concern about AI risk into political pressure for a global pause.",
    images: [{ url: "/images/open-graph/open-graph-1200-630.jpg", width: 1200, height: 630 }],
    url: "https://pauseai.uk/theory-of-change/",
  },
  twitter: {
    images: ["/images/open-graph/open-graph-1600-840.jpg"],
  },
};

export default function TheoryOfChangePage() {
  return (
    <>
      <Nav />
      <main className="track-record theory-of-change">
        <section className="tr-hero">
          <svg className="tr-hero-swirl" viewBox="0 0 600 600" aria-hidden="true" preserveAspectRatio="xMidYMid meet">
            <g fill="none" stroke="currentColor" strokeWidth="0.6" opacity="0.55"></g>
          </svg>
          <div className="container tr-hero-inner">
            <h1 className="tr-hero-title">Theory of Change</h1>
            <p className="tr-hero-lede">Creating the political momentum for a pause.</p>
          </div>
        </section>

        <section className="foreword">
          <div className="container foreword-inner">
            <div className="foreword-body">
              <p>Organising large numbers of citizens to boldly advocate for an AI pause will robustly help make the future go better. Public pressure for serious action on AI risks increases the likelihood of useful legislation and might be the only way that humanity avoids extinction.</p>
              <p>PauseAI UK exists to transform loose public concern into a focused political force in the UK, and to hold that pressure in place long enough to matter. Deep buy-in across the public is necessary to overcome industry lobbying. The work of converting awareness into durable political will is the community organising work that PauseAI UK specialises in.</p>
            </div>
          </div>
        </section>

        <article className="toc-article">
          <div className="container toc-inner">
            <section className="toc-section" id="long-term-goals">
              <h2>Long-term goals</h2>
              <h3>Policy proposal</h3>
              <p>The <a href="https://pauseai.info/proposal" className="inline-link" target="_blank" rel="noreferrer">proposal</a> on PauseAI Global&rsquo;s website outlines our primary policy goal. In brief, we are aiming for a global pause on AI development regulated by an international AI Safety Agency (AISA) that is responsible for determining when more powerful AI systems can be safely developed. Any sufficiently large group of countries would be empowered to veto the deployment of a superhuman AI system to ensure that, if some countries feel that they will be excluded from the benefits of AI, they have a strong negotiating position with which to demand their fair share. Or, if a group of democratic countries believe that an authoritarian country will deploy AI to oppress its own people, they can push for a deployment that empowers all citizens in every country.</p>
              <p>Before safe AI is technically feasible, it is in the interest of all major powers to enforce the treaty globally. Once AI alignment is solved, AISA will control any superhuman AI prior to deployment and be able to use it to enforce the agreement.</p>
              <p>Such a treaty is possible to enforce due to the <a href="https://pauseai.info/building-the-pause-button" className="inline-link" target="_blank" rel="noreferrer">highly centralised AI chip supply chain</a>. Writing highly detailed policy proposals is not our comparative advantage, so we generally defer to other organisations such as MIRI for <a href="https://techgov.intelligence.org/research/an-international-agreement-to-prevent-the-premature-creation-of-artificial-superintelligence" className="inline-link" target="_blank" rel="noreferrer">draft treaty texts</a> and the precise specifications of enforcement mechanisms.</p>
              <p>Having said that, it is very valuable for PauseAI staff to have a strong working knowledge of AI legislation and governance proposals in order to be credible in our discussions with politicians. In one instance, we wrote a <a href="https://www.lesswrong.com/posts/pT75MFsLJArrBGkaF/simple-summary-of-ai-safety-laws-1" className="inline-link" target="_blank" rel="noreferrer">summary of existing AI safety legislation</a> for British MPs.</p>
              <p>As mentioned above, we are in favour of other AI safety regulations, such as <a href="https://ai-frontiers.org/articles/case-for-ai-liability" className="inline-link" target="_blank" rel="noreferrer">stronger liability</a> for developers for AI-enabled harms. We may sometimes explicitly push for such policies both because they increase AI safety directly and they can be instrumental in increasing PauseAI&rsquo;s influence or credibility. For example, our <a href="https://pauseai.info/dear-sir-demis-2025" className="inline-link" target="_blank" rel="noreferrer">open letter</a> signed by 60 UK lawmakers criticised Google DeepMind for <a href="https://pauseai.info/pdfs/PauseAI_Open_Letter_Background_Information.pdf" className="inline-link" target="_blank" rel="noreferrer">violating</a> the <a href="https://www.gov.uk/government/publications/frontier-ai-safety-commitments-ai-seoul-summit-2024/frontier-ai-safety-commitments-ai-seoul-summit-2024" className="inline-link" target="_blank" rel="noreferrer">Frontier AI Safety Commitments</a> and helped to establish our voice in British AI policy.</p>
            </section>

            <section className="toc-section" id="positive-outcomes">
              <h2>Positive outcomes for PauseAI UK</h2>
              <p>We cannot tell an exact story of what the path to a pause will look like, but we sketch below two potential scenarios where PauseAI UK has a positive impact. We are currently working towards realising both scenarios and in many ways they are complementary. At some point we may narrow our focus towards just one of these outcomes:</p>

              <h3>Scenario 1: PauseAI as a special interest group</h3>
              <p>PauseAI UK has 10,000 highly dedicated volunteers who act as a dominant lobbying force on AI policy matters. Whenever a politician touches AI, they receive a policy document with PauseAI&rsquo;s view on the matter and constant communications from PauseAI volunteers, in the vein of the US <a href="https://marginalrevolution.com/marginalrevolution/2021/12/dont-fck-with-big-sugar.html" className="inline-link" target="_blank" rel="noreferrer">sugar lobby</a>:</p>
              <blockquote>
                <p>My phone did not stop ringing for the next five weeks. &hellip; I had no idea how many people in my district were connected to the sugar industry. People were calling all day, telling me they made pumps or plugs or boxes or some other such part used in sugar production and I was threatening their job. Mayors called to tell me about employers their towns depended on who would be hurt by a sugar downturn. It was the most organized effort I had ever seen.</p>
              </blockquote>
              <p>Each MP has 20 PauseAI volunteers in their constituency who will send emails to their office and request meetings in which all 20 constituents will show up to express their views. PauseAI UK uses its <a href="https://catalyse.up.railway.app/" className="inline-link" target="_blank" rel="noreferrer">Catalyse platform</a> to coordinate its network to push the government to introduce an AI bill and ensure that it has the backing of every MP.</p>
              <p>In the wake of an AI warning shot, PauseAI UK&rsquo;s volunteers contact every major British newspaper to ensure that journalists mention the idea of a global pause treaty in every major article about the incident. Protests are held outside Downing Street and any event the prime minister attends every day until they initiate negotiations for a global pause treaty.</p>

              <h3>Scenario 2: PauseAI as a mass movement</h3>
              <p>PauseAI protests double in size every 7 months as AI capability itself improves exponentially. New PauseAI chapters are founded in every major UK city and many volunteers regularly put on talks in their local community to explain the risks of AI and recruit more volunteers for the movement.</p>
              <p>At some point a significant, but not existential, AI catastrophe thrusts AI risks into the public consciousness and highlights the imminence of superhuman AI. Millions of British citizens become viscerally aware of the looming threat to their lives. PauseAI UK immediately announces a new protest and volunteers spread the signup page in their networks.</p>
              <p>PauseAI UK organises a march in Westminster with 1 million attendees and dominates headlines in the British press. The prime minister is obliged to respond and commits to opening negotiations for a global pause treaty.</p>
            </section>

            <section className="toc-section" id="strategy">
              <h2>High-level strategy</h2>

              <h3>Brand and messaging</h3>
              <figure className="toc-figure">
                <img src="/images/logos/%5BSquare%5D%20Safety%20Before%20Superintelligence.jpg" alt="Safety Before Superintelligence — PauseAI campaign image" loading="lazy" />
              </figure>
              <p>PauseAI UK positions itself as a movement focused on the risks of human-level and superhuman AI, rather than the current harms of AI. This allows us to direct our efforts towards the most severe issues, while also letting us scale faster than movements focused on the existing harms of AI. PauseAI&rsquo;s strong SEO and name recognition are crucial assets because we automatically grow when more people become concerned about AI risk. This turns AI companies and the progress of AI itself into our most effective marketing tool.</p>
              <p>A large fraction of our members have never been involved in grassroots advocacy before and we see this as a strength. It makes our protests more interesting to the media and makes the organisation more appealing to the silent majority who are not very politically active &mdash; unless, perhaps, they feel their lives are directly threatened.</p>
              <p>We reflect our relatively moderate demographic in our messaging. We adopt a more measured tone than a typical advocacy group. Our imagery is positive and inspiring. We emphasise that we are taking the moral high ground and we represent universal, common-sense human values as part of a historic cause. This also reinforces our absolute commitment to non-violence.</p>
              <p>Within the range of concerns around AGI, we encompass a broad set of risks. Many people will be more motivated by the threat of job automation or autonomous killer robots than extinction, because these risks are already becoming tangible and are easier to conceptualise. They are very important concerns in their own right and they are a good stepping stone towards confronting the risk of extinction. We present different AI risks as part of a single spectrum which we move along as AI becomes more powerful.</p>
              <p>We are cognisant that building an AI movement in a context where many people have an incomplete understanding of the most severe risks requires caution and continual shaping of our message. Having our primary policy demand built into our name is a good safeguard against harmful distortions of our goals. In many contexts there are large short-term incentives to water down our demands and message, but we think this would reduce our long-term impact by moving our focus away from the most severe risks, so we are glad to have a name that commits us to a strong stance. We remain strictly non-partisan by focusing exclusively on our single issue and using politically neutral language.</p>

              <h3>Why the UK?</h3>
              <p>PauseAI is starting chapters in every country and we think that having many different countries bought into the seriousness of AI risk will be critical to the success of a global treaty. But the UK is particularly valuable compared to other middle powers because it is a centre of AI research, including the headquarters of Google DeepMind and the second-largest offices of OpenAI and Anthropic. This soft power was demonstrated with the first AI Safety Summit in Bletchley Park.</p>
              <p>Moreover, London is a hub of AI safety, with hundreds of AI safety researchers, the largest AI security institute and dozens of related organisations. The British public and political class are more aware of the risks of AI than those in comparable nations. Correspondingly, London has more PauseAI members and has consistently hosted larger protests than any other city in the world. These protests raise the bar for AI protests everywhere and can inspire others around the world to run bigger protests themselves.</p>

              <h3>Growth</h3>
              <p>The fundamental bet of PauseAI UK is that there can be a very large and influential social movement dedicated to preventing the risks of advanced AI. Within PauseAI we already see evidence in our conversations with new members that a rapidly growing proportion of the population is truly grappling with the unprecedented danger that humanity is facing.</p>
              <p>We model the population as a bell curve with respect to the level of evidence that each person requires to become concerned about superhuman AI. As AI improves, we expect the fraction of the curve that has crossed the threshold of concern to increase accordingly. If capabilities continue to progress exponentially, the number of people worried about the situation will also grow commensurately. However, that concern does not automatically translate into well-coordinated action. Our job is to provide the infrastructure and guidance to turn that energy into impact.</p>
              <p>We do not think that convincing more of the public to be concerned about AI risks is our comparative advantage at the moment. This is both because other organisations are already dedicating significant resources to mass communications and because we think that AI progress itself will be the primary driver of our growth. We benefit from being the largest AI protest organisation and positioning ourselves as focused on the risks of future AI, which naturally funnels people concerned about those risks into our ranks.</p>
              <p>Instead, we see our role as maximising the utility of whatever level of concern already exists in the population at any given time, so that we can get to a pause as early as possible. This means always organising the biggest protest possible, providing excellent infrastructure, onboarding and support for individual volunteers and local chapter leaders, and planning our campaigns carefully.</p>
              <p>Since PauseAI UK began, we have seen a (very) roughly exponential growth in the size of our protests, with the number of attendees doubling approximately every 7 months. New members register every day and chapters are popping up across the UK. If we can continue and accelerate this trend, then we expect to make substantial progress towards our goals in a relatively short span of time.</p>
            </section>

            <section className="toc-section" id="local-groups">
              <h2>Local groups</h2>
              <p>When cities hit a critical mass of enthusiastic volunteers, we launch new local groups in those cities. There are three core activities for local groups to engage in:</p>
              <ol className="toc-list">
                <li>Deliver a standard talk designed to persuade people of the importance of AI risk. This can be given over and over at events for different audiences and in different venues.</li>
                <li>Lobby local politicians to support our campaigns. Seek meetings, preferably in person, and have as many members as possible meet their MP and explain their concerns.</li>
                <li>Advertise protests and help organise transport to get there.</li>
              </ol>
            </section>
          </div>
        </article>

        <section className="closing">
          <div className="container closing-inner">
            <p className="closing-sub">Help us build the movement.</p>
            <div className="closing-actions">
              <a className="btn primary" href={site.whatsappUrl} target="_blank" rel="noreferrer">Join the WhatsApp community</a>
              <a className="btn ghost" href="/#join">More ways to get involved</a>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
