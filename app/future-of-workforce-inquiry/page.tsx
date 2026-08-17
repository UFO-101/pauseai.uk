import type { Metadata } from "next";
import Script from "next/script";
import Nav from "@/components/Nav";
import "../track-record/track-record.css";
import "./page.css";

export const metadata: Metadata = {
  title: "Evidence: AI, Business and the Future of the Workforce",
  description:
    "PauseAI UK's written submission to the House of Commons Business and Trade Committee inquiry into Artificial Intelligence, business and the future of the workforce.",
  openGraph: {
    title: "PauseAI UK | Evidence: AI, Business and the Future of the Workforce",
    description:
      "PauseAI UK's written submission to the House of Commons Business and Trade Committee inquiry into Artificial Intelligence, business and the future of the workforce.",
    images: [{ url: "/images/open-graph/open-graph-1200-630.jpg", width: 1200, height: 630 }],
    url: "https://pauseai.uk/future-of-workforce-inquiry/",
  },
  twitter: {
    images: ["/images/open-graph/open-graph-1600-840.jpg"],
  },
  alternates: { canonical: "/future-of-workforce-inquiry" },
};

export default function AIWorkforceEvidencePage() {
  return (
    <>
      <Nav />
      <main className="track-record evidence-submission">
        <section className="tr-hero">
          <div className="container tr-hero-inner">
            <h1 className="tr-hero-title">AI, Business and the Future of the Workforce</h1>
            <p className="tr-hero-lede">
              PauseAI UK&rsquo;s submission to the House of Commons Business and Trade Committee, April 2026
            </p>
          </div>
        </section>

        <section className="foreword">
          <div className="container foreword-inner">
            <h2 className="foreword-title">About this inquiry</h2>
            <div className="foreword-body">
              <p>
                In March 2026, the House of Commons Business and Trade Committee opened an inquiry into{" "}
                <em>Artificial Intelligence, business and the future of the workforce</em>. The Committee called for
                written evidence submissions from businesses, trade unions, academics, civil society organisations,
                and the public.
              </p>
              <p>
                PauseAI UK volunteers worked collaboratively to research and write a detailed submission which
                outlines our views about the likely impact that AI will have on the job market and the future of
                employment.
              </p>
              <p>
                We argue that the Committee should plan for scenarios far more disruptive than AI as a mere chatbot
                assistant. They should prepare for scenarios in which autonomous AI agents can perform the vast
                majority of economically valuable work, making many people unemployable through no fault of their
                own. We argue that only an international pause in frontier AI development will be sufficient to
                prevent catastrophic economic and social destabilisation.
              </p>
              <p>
                The full text of our submission is reproduced below, as originally submitted.
              </p>
            </div>
          </div>
        </section>

        <article className="ev-article">
          <div className="container ev-inner">

            <div className="ev-meta-block">
              <table className="ev-meta-table">
                <tbody>
                  <tr><th>Date</th><td>3 April 2026</td></tr>
                </tbody>
              </table>
            </div>

            <section className="ev-section">
              <h2>Introduction</h2>
              <ol className="ev-ol">
                <li>
                  PauseAI UK is part of a global movement dedicated to mitigating the risks posed by frontier artificial
                  intelligence. We advocate for an international pause on the development of advanced AI systems until
                  they are proven safe and subject to democratic oversight. PauseAI UK emphasises that uncontrolled
                  frontier AI development poses unprecedented risk to the labour market and to economic equality amongst
                  other more severe risks. A proactive framework is essential to ensure that technological advancement
                  does not outpace our ability to protect working people during a time of unparallelled economic
                  disruption.
                </li>
                <li>
                  PauseAI UK urges the Committee to recognise that the current trajectory of AI development, with the
                  automation of human cognitive labour, is a paradigm shift that does not compare to previous historical
                  developments like the industrial revolution<sup>1</sup>. It is a mistake to think that our
                  civilisation has been through similar transitions before. The stated goal of the major AI developers
                  is to build systems that <strong><em>outperform humans at most/all economically valuable
                  tasks</em></strong><sup>2</sup>. This is fundamentally incompatible with a labour-based economy.
                  Without an immediate pause on development, and a total rethink of the socio-political value of
                  employment<sup>3</sup>, the UK risks extreme political and economic destabilisation.
                </li>
              </ol>
            </section>

            <section className="ev-section">
              <h2>1. The future of AI</h2>
              <p className="ev-question"><em>How is AI likely to evolve over the next decade? What are the scenarios we should plan for?</em></p>
              <ol className="ev-ol" start={3}>
                <li>
                  Given the speed of development, it is very difficult to accurately predict the evolution of Artificial
                  Intelligence (&ldquo;<strong>AI</strong>&rdquo;) over the next decade. As recently as 2022, it would
                  have been nearly impossible to predict &lsquo;<em>the ChatGPT moment</em>&rsquo; and to foresee all
                  the ways in which AI has now rapidly spread throughout society and become deeply integrated in the
                  economy.
                </li>
                <li>
                  However, we can extrapolate from the trends and draw conclusions based on the incentives and stated
                  goals of the companies developing frontier AI models. In our view, AI development will continue to
                  drive towards Artificial General Intelligence (&ldquo;<strong>AGI</strong>&rdquo;) which aims to
                  perform as well as or better than humans at nearly all economically valuable tasks. This is the
                  explicit objective of most major AI developers (including OpenAI, Google DeepMind, and Anthropic).
                </li>
                <li>
                  It is critically important to recognise what this means: if the technology advances in the way that
                  the developers <em>aim for</em> and which they believe is <em>likely to happen</em><sup>4</sup>{" "}
                  &mdash; then very soon there will be little to no cognitive work left for which humans have a
                  competitive advantage. Simply put, if a human is currently paid to do a job which mostly involves
                  thinking and working on a computer, then AI will soon be able to do that job better, faster, and
                  cheaper.
                </li>
                <li>
                  We would urge the Committee not to fall into the trap of doubting whether AI can actually reach
                  general human-level competence. Many experts believe it is both possible and imminent. For example,
                  in February 2026, British entrepreneur and CEO of Microsoft AI, Mustafa Suleyman, stated his belief
                  that we will see &ldquo;<em>human-level performance on most, if not all, professional tasks &hellip;
                  [and] most of those tasks will be fully automated by an AI within the next 12 to 18
                  months</em>&rdquo;<sup>5</sup>.
                </li>
                <li>
                  There is already strong evidence for the erosion of white-collar work. In February 2026, Twitter
                  co-founder Jack Dorsey announced that his multi-billion dollar payments company, Block, is laying off
                  nearly half its workforce because AI &ldquo;<em>fundamentally changes what it means to build and run
                  a company.</em>&rdquo;<sup>6</sup> Meta is reportedly planning to cut around 20% of its workforce in
                  2026 due to AI<sup>7</sup>.
                </li>
                <li>
                  The advent of agentic AI (particularly tools like Anthropic&rsquo;s Claude Code and OpenAI&rsquo;s
                  Codex) have resulted in software engineers reporting that they no longer write any computer code.
                  Boris Cherney, inventor of Claude Code, says that the technology is &ldquo;<em>going to be very
                  disruptive, and it&rsquo;s going to be painful for a lot of people</em>&rdquo;<sup>8</sup>.
                </li>
                <li>
                  This trend <em>will not</em> stay localised to computer engineering<sup>9</sup>. In boardrooms
                  across the country, the question asked when making a decision on a new hire is now &ldquo;<em>can an
                  AI do this job instead?</em>&rdquo; Entry-level hiring freezes are a clear early warning sign. As AI
                  capabilities continue to rapidly increase, we expect to see more and more skilled work performed
                  exclusively by agentic AI.
                </li>
                <li>
                  Given the above, the Committee <strong>must</strong> expand its scope beyond scenarios where AI
                  merely augments the human worker (e.g. by enhancing efficiency, speed, and value when performing
                  existing job roles) and plan for circumstances where autonomous AI agents are capable of entirely
                  replacing human roles &mdash; performing equivalent or better work, in a fraction of the time, and
                  at a fraction of the cost. This will be a fundamentally different labour market.
                </li>
                <li>
                  PauseAI UK strongly urges the Committee to investigate the implication of increasing AI capability
                  leading to mass unemployment across large sectors of the economy. The Committee must plan for
                  scenarios where millions of professionals no longer have an income and cannot provide for themselves
                  or their dependants. The Committee must also plan for the second-order consequences of job
                  displacement, including (for example) the power concentration which will occur as a small handful of
                  AI companies control large parts of the economy, and the political disempowerment which comes with
                  increasing wealth inequality and power imbalance between the public and corporations.
                </li>
                <li>
                  PauseAI UK recommends that the Committee strongly consider that any intervention short of a global
                  pause in the development of advanced AI systems will be insufficient to prevent a massive
                  destabilisation of the economy and social order.
                </li>
              </ol>
            </section>

            <section className="ev-section">
              <h2>2. AI adoption</h2>
              <p className="ev-question"><em>Where is AI currently being deployed across the UK economy (by sector, region, firm size, and public/private) and how is it being used? How does adoption vary across different parts of the economy and workforce and why; what are the main barriers to AI adoption?</em></p>
              <ol className="ev-ol" start={13}>
                <li>
                  PauseAI UK does not have a view to share regarding sectoral AI deployment or practical barriers to
                  adoption.
                </li>
              </ol>
            </section>

            <section className="ev-section">
              <h2>3. Infrastructure for the AI Transition</h2>
              <p className="ev-question"><em>What public and private infrastructure is required to support safe, responsible and effective AI adoption by 2035? How much of this infrastructure currently exists? Which elements should be publicly funded, and which through private investment? Where are the remaining market gaps?</em></p>
              <ol className="ev-ol" start={14}>
                <li>
                  We note that the Inquiry outline states &ldquo;<em>the Government&rsquo;s AI Opportunities Action Plan
                  includes a twentyfold expansion of public AI hardware by 2030 and seeks to leverage private investment
                  through initiatives such as the US&ndash;UK Tech Prosperity Deal (with &pound;30 billion committed by
                  major technology firms)</em>&rdquo;.
                </li>
                <li>
                  This is an extraordinarily consequential investment in hardware resources which will be used to
                  accelerate the development of AI technologies, and therefore will accelerate the risks and challenges
                  which are set out in this response. PauseAI UK strongly recommends that the Committee increase its
                  focus on the objective of ensuring that infrastructure development is both &ldquo;<em>safe</em>&rdquo;
                  and &ldquo;<em>responsible</em>&rdquo;, as the question indicates.
                </li>
                <li>
                  Notwithstanding that PauseAI UK advocates for an <em>immediate</em> pause in development of advanced
                  frontier AI generally, with respect to the underlying technical infrastructure specifically, PauseAI
                  UK recommends that the Committee consider the following:
                </li>
              </ol>

              <div className="ev-policy-block">
                <h3>Regulation and oversight</h3>
                <ul className="ev-ul">
                  <li>
                    Mandatory licensing, registration, and tracking framework for frontier-class compute hardware
                    (performance thresholds to be defined). This should include Know Your Customer requirements and
                    hardware-level verification features to prevent the clandestine training of unauthorised or
                    dangerous AI models on UK infrastructure.
                  </li>
                  <li>
                    The UK should use its position in the US-UK Tech Prosperity Deal to advocate for an international
                    compute bank, functioning as a non-proliferation framework where access to frontier-class hardware
                    is contingent on strict, verifiable adherence to global safety and labour protection standards.
                  </li>
                  <li>
                    The UK should take the lead in advocating for international multi-lateral treaties to monitor and
                    regulate the development of potentially dangerous AI models, including by regulating the manufacture
                    and distribution of GPU chips.
                  </li>
                </ul>
              </div>

              <div className="ev-policy-block">
                <h3>Technical &lsquo;killswitch&rsquo; and non-AI contingencies</h3>
                <ul className="ev-ul">
                  <li>
                    Data centres must have emergency off protocols at the infrastructure level that can also be
                    activated by an independent regulator in the event that pre-defined risk thresholds are exceeded
                    (such as autonomous replication or unauthorised exfiltration of AI model parameters).
                  </li>
                  <li>
                    For critical infrastructure or high-impact businesses (energy, transport, health) the government
                    must mandate redundancies in the event of AI failure. We cannot allow the UK&rsquo;s energy, water,
                    or financial systems to become so &ldquo;AI-native&rdquo; that they cannot be operated by humans in
                    the event of a model failure or a required safety shutdown.
                  </li>
                </ul>
              </div>

              <div className="ev-policy-block">
                <h3>Cybersecurity</h3>
                <ul className="ev-ul">
                  <li>
                    Data centres will inevitably become a target for malicious cyberattack. Enhanced cybersecurity
                    measures must be mandatory.
                  </li>
                  <li>
                    Infrastructure requirements should mandate &ldquo;air-gapped&rdquo; storage for frontier model
                    weights to prevent exfiltration (theft by malicious actors) or autonomous escape (the AI copying
                    itself to the internet).
                  </li>
                  <li>
                    The government should establish incident reporting and oversight protocols between data centers, the
                    relevant regulators, and the UK AI Security Institute. For example, if a model exhibits novel
                    failure modes, or is the target of malicious attack, the regulator should be notified.
                  </li>
                </ul>
              </div>
            </section>

            <section className="ev-section">
              <h2>4. Impacts on work &amp; workers</h2>
              <p className="ev-question"><em>What impact can AI have on productivity? Which tasks and occupations are most exposed to automation? What are the effects of AI on employment, job security, employment rights, pay, job quality, health and safety, and wellbeing? Which sectors, regions and groups are most likely to be affected, and what are the implications for inequality?</em></p>
              <ol className="ev-ol" start={20}>
                <li>
                  PauseAI UK urges the Committee to look beyond productivity and efficiency forecasts and confront the
                  reality of job displacement. While AI adoption is expected to enhance output, in a competitive market
                  these gains accrue almost exclusively to capital owners, while human labour faces a total loss of
                  competitive advantage. The drive for &ldquo;AI efficiency&rdquo; will soon be a threat to the
                  professional classes, as the marginal cost of cognitive labour approaches zero.
                </li>
                <li>
                  While all industries are exposed to automation, computer-heavy, white-collar, cognitive roles are the
                  first to be impacted. This represents a large majority of economic work in the UK. Professional
                  copywriters, graphic artists, and translators have already been substantially displaced by models
                  that can generate equivalent output at near-zero marginal cost. As mentioned above, the deployment of
                  agentic tools has fundamentally altered the software engineering sector, with reports of engineers no
                  longer writing original code but merely &ldquo;orchestrating&rdquo; automated outputs. This has
                  turned a high-value career into a precarious role. Computer-heavy roles including middle management,
                  data entry, and legal research, are all roles which primarily comprise text-based cognitive work
                  &mdash; exactly what current AI is adapted for.
                </li>
                <li>
                  We are particularly concerned by the erosion of entry-level roles. As businesses use AI to perform
                  the work previously assigned to junior staff, the training ground for the next generation of UK
                  professionals is vanishing. This creates a widening skills gap: without junior roles, there is no
                  pathway to senior expertise, leading to a long-term attrition of human talent.
                </li>
                <li>
                  The consequences for worker wellbeing and societal stability are potentially catastrophic. Beyond the
                  risk of mass unemployment and job insecurity, the relentless drive for efficiency is already causing
                  profound anxiety and stress as human workers are forced to compete with machines that do not
                  sleep<sup>10</sup>. Workers lose agency, bargaining power, and purpose as AI increasingly encroaches
                  on their professional and economic territory. Without a strategic global pause to rethink our national
                  economic structure, we risk a future where millions are economically irrelevant, leading to
                  unprecedented political disempowerment and the upending of our social contract.
                </li>
              </ol>
            </section>

            <section className="ev-section">
              <h2>5. Skills, Education &amp; Transitions</h2>
              <p className="ev-question"><em>What skills will workers and managers need to work effectively with AI? Are current education and adult learning systems adequate? What reskilling and upskilling models are most effective? How can Government and employers support augmentation and upskilling when introducing AI?</em></p>
              <ol className="ev-ol" start={24}>
                <li>
                  PauseAI UK strongly believes that the common focus on &ldquo;lifelong learning&rdquo; and adult
                  retraining is a fundamentally inadequate response to advancing AI technology. This approach
                  mistakenly treats AI as a simple tool, like a laptop or a calculator, rather than a technology that
                  learns and improves on its own. The core problem is the massive difference in the speed of human and
                  machine learning. While it takes years for a person to gain expertise through education, AI
                  capabilities are advancing so quickly that new jobs will be created and become fully automated in
                  less time than it takes a student to complete a degree.
                </li>
                <li>
                  This &ldquo;reskilling&rdquo; narrative also misses the fact that the goal of frontier AI
                  development is to master almost <em>all economically valuable work</em>. Some suggest that when
                  confronted with redundancy, workers should move &ldquo;up the ladder&rdquo; into higher-value roles
                  that involve managing or &ldquo;orchestrating&rdquo; AI systems. However, this fails to account for
                  the moving goalposts of automation. If a worker begins retraining today to become an &ldquo;AI
                  orchestrator,&rdquo; the rapid advance in AI autonomy means that by the time they are qualified, the
                  AI will likely be able to manage itself.
                </li>
                <li>
                  If the Government nevertheless intends to pursue a strategy of retraining in the near term, education
                  must shift its focus away from technical skills that AI can easily copy and toward human-centric
                  resilience. We should prioritise roles that require physical presence and direct human
                  accountability. However, skilled physical labour provides only a temporary buffer while robots are
                  still primitive and expensive to build. This human advantage will disappear as hardware becomes
                  cheaper and more capable<sup>11</sup>. There are very few job categories that are likely to remain
                  &ldquo;human-only&rdquo; in an age of AGI. Accordingly, we must be clear: retraining is{" "}
                  <strong>not</strong> a solution to the impending crisis, and it is dangerous to act upon this
                  misapprehension.
                </li>
                <li>
                  Ultimately, the challenge facing the UK is not about workers developing new skills, but is instead
                  about a looming crisis of <em>human competitiveness</em>. Our education system cannot solve this
                  problem because the problem is not about the quality of training, it&rsquo;s about the speed of the
                  technology. Government strategy must therefore move beyond retraining and start planning to create a
                  society where a person&rsquo;s wellbeing is no longer tied to their market value.
                </li>
              </ol>
            </section>

            <section className="ev-section">
              <h2>6. Government Strategy, Regulation &amp; Rights</h2>
              <p className="ev-question"><em>How prepared is the Government and are regulators for the potential impacts of AI? Is the existing UK regulatory framework sufficient to address current and emerging employment-related AI issues? What support should the Government be offering to businesses, employers and employees?</em></p>
              <ol className="ev-ol" start={28}>
                <li>
                  The UK Government and its regulators are currently unprepared for the systemic impacts of advanced
                  AI. Our existing regulatory framework is a patchwork of rules that were not designed for a
                  technological paradigm shift of this magnitude. While we have the Information Commissioner&rsquo;s
                  Office (ICO) regulating data privacy in the context of AI, the Competition and Markets Authority
                  (CMA) for market fairness, and sector-specific oversight bodies like the Financial Conduct Authority
                  (FCA), there is no single regulator with the specific mandate or technical expertise to oversee the
                  development and deployment of frontier AI models. This piecemeal approach is insufficient for a
                  technology that moves across all sectors at once.
                </li>
                <li>
                  We urgently need dedicated AI regulation capable of enforcing safety standards before potentially
                  dangerous models are developed or released to the public. Current policy levers are focused on
                  accelerating AI adoption without first ensuring the ultimate stability of the UK economy. If the
                  current efforts racing toward wide deployment of AI across the economy results in fracturing our
                  labour market and social fabric, the benefits of increased productivity may be irrelevant to the
                  welfare of most people and Britain&rsquo;s prosperity and security, especially since most owners of
                  AI companies and infrastructure are outside of the UK.
                </li>
                <li>
                  The Government should recognise that there is a strong public mandate for government intervention of
                  AI: polling consistently shows that voters want strict regulation and oversight of AI<sup>12</sup>.
                  Rather than solely funding adoption, the Government should prioritise policy levers that ensure
                  safety-first development. This includes the regulation of the hardware &mdash; the data centers and
                  compute power that makes these technologies possible (see response to Question 3 above). Without
                  controlling the physical infrastructure of AI, the UK cannot hope to manage its outcomes.
                </li>
                <li>
                  The Committee must also confront the reality of what success looks like for major frontier labs.
                  Their stated goal is to build artificial general intelligence (AGI) that can outperform humans on all
                  economically valuable tasks. If they succeed, there is no remaining role for human workers.
                </li>
                <li>
                  We urge the Government to take a leadership role in guarding against AI risks. The UK must lead in
                  advocating for a global treaty that mandates a strategic pause on AI development. Until we have a
                  proven way to align these systems with human interests and a clear plan for a post-labour economy,
                  the risks of continuing this arms race far outweigh the rewards.
                </li>
                <li>
                  Finally, the Government must prepare for the political and economic turbulence that rapid automation
                  will bring. Because reskilling is not a long-term solution when AI learns faster than humans, we must
                  rethink the role of human labour in the market. The Government must act to ensure that workers
                  displaced by AI are not left without a means to support themselves and their families.
                </li>
                <li>
                  We note that this question invites comment generally on preparedness of the UK Government for the
                  impacts of AI. At this time, <strong>no Government is prepared</strong>.
                </li>
                <li>
                  Many of the world&rsquo;s foremost experts are urgently sounding the alarm about the significant
                  existential risks posed by AI. Day by day we are seeing increasing harms from AI; from political
                  destabilisation caused by deepfakes and AI-fuelled misinformation<sup>13</sup> to dangerous and
                  sophisticated cyberattacks on our critical infrastructure<sup>14</sup>. These are just early warning
                  signs. Powerful AI will put incredibly dangerous technologies in the hands of malicious actors,
                  enabling them to cause devastation with minimal costs. These dangerous technologies include
                  engineered pandemics and bioweapons which have the potential to kill billions<sup>15</sup>. These
                  technologies already exist &mdash; they are now being made dangerously accessible.
                </li>
                <li>
                  Beyond the risks mentioned above, many experts expect that superhuman AI (that is, AI which is much
                  more intelligent than any human) will be uncontrollable<sup>16</sup> and may lead to the extinction
                  of the human species. This is not a science-fiction story or a fringe point of view &mdash; it is
                  one shared by the world&rsquo;s leading AI experts<sup>17</sup> and leaders of technology
                  companies<sup>18</sup> alike. When the experts closest to this unprecedented technology tell us there
                  is a significant probability that AI will cause human extinction, the UK Government must take that
                  warning extremely seriously.
                </li>
              </ol>
            </section>

            <section className="ev-footnotes">
              <h2>Notes</h2>
              <ol className="ev-fn-list">
                <li id="fn1">
                  In March 2026, Treasury Minister Dan Tomlinson told Sky News that &ldquo;<em>big shocks</em>&rdquo;
                  in economic history, such as the industrial revolution, had seen &ldquo;<em>changes in the amount of
                  jobs that happen in the economy, or the types of jobs that we have</em>&rdquo;, but added:
                  &ldquo;<em>You don&rsquo;t see job losses overall.</em>&rdquo; This is fundamentally misconceived.
                  Previous technological revolutions have followed powerful developments in narrow domains which led to
                  increased economic efficiencies, enabling humans to transition into different higher value work. But
                  there has <strong>never</strong> been a revolution where the new technology <em>is itself</em> a
                  general purpose worker: where the technology itself can do, or will soon do, everything a human can
                  do. To suggest that this would not result in &ldquo;<em>job losses overall</em>&rdquo; is to be
                  wilfully blind to the inevitable consequence of advances in AI technology.
                </li>
                <li id="fn2">
                  See{" "}
                  <a href="https://openai.com/charter/" target="_blank" rel="noreferrer">
                    openai.com/charter/
                  </a>
                  : &ldquo;<em>OpenAI&rsquo;s mission is to ensure that artificial general intelligence
                  (AGI)&mdash;by which we mean highly autonomous systems that outperform humans at most economically
                  valuable work</em>&rdquo;.
                </li>
                <li id="fn3">
                  In particular we refer to the implicit agreement (otherwise referred to as &lsquo;the social
                  contract&rsquo;) where individuals trade specific personal freedoms for state-provided security,
                  legal order, and the opportunity to engage in economically productive work, ensuring that those who
                  contribute to the economy receive the protections and resources necessary to thrive.
                </li>
                <li id="fn4">
                  The Committee may be aware that developers such as OpenAI currently operate in a financial deficit
                  with respect to the revenue generated by their AI models versus the costs to provide them. Developers
                  are content with this operating loss because they predict a future where, once they successfully
                  achieve a breakthrough in AGI, their profits will increase exponentially as they are able to capture
                  all domains of economic value.
                </li>
                <li id="fn5">
                  <a
                    href="https://www.businessinsider.com/microsoft-ai-ceo-mustafa-suleyman-white-collar-tasks-automation-prediction-2026-2"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Business Insider, February 2026
                  </a>
                </li>
                <li id="fn6">
                  <a href="https://www.bbc.co.uk/news/articles/cq570d12y9do" target="_blank" rel="noreferrer">
                    BBC News
                  </a>
                </li>
                <li id="fn7">
                  <a
                    href="https://www.reuters.com/business/world-at-work/meta-planning-sweeping-layoffs-ai-costs-mount-2026-03-14/"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Reuters, March 2026
                  </a>
                </li>
                <li id="fn8">
                  <a
                    href="https://fortune.com/2026/02/24/will-claude-destroy-software-engineer-coding-jobs-creator-says-printing-press/"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Fortune, February 2026
                  </a>
                </li>
                <li id="fn9">
                  Geoffrey Hinton, the inventor of the technology underpinning modern AI, shares his expert view on
                  the consequences of rapid AI advancement on the job market here:{" "}
                  <a href="https://www.youtube.com/watch?v=eddSGoSYnSU" target="_blank" rel="noreferrer">
                    youtube.com/watch?v=eddSGoSYnSU
                  </a>
                </li>
                <li id="fn10">
                  See{" "}
                  <a
                    href="https://www.sciencedirect.com/science/article/pii/S0001691825008005"
                    target="_blank"
                    rel="noreferrer"
                  >
                    ScienceDirect
                  </a>{" "}
                  and{" "}
                  <a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC12360261/" target="_blank" rel="noreferrer">
                    PubMed Central
                  </a>{" "}
                  for recent analyses of these impacts.
                </li>
                <li id="fn11">
                  Advances in robotics are happening rapidly:{" "}
                  <a
                    href="https://techxplore.com/news/2026-02-robot-approaches-human-dexterity-visual.html"
                    target="_blank"
                    rel="noreferrer"
                  >
                    TechXplore, February 2026
                  </a>
                  . Technology companies are pouring billions into humanoid robots expressly designed to complete
                  manual labour:{" "}
                  <a
                    href="https://www.washingtonpost.com/technology/2026/03/27/musk-optimus-robot-physical-ai/"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Washington Post, March 2026
                  </a>
                  .
                </li>
                <li id="fn12">
                  Polling conducted by the Ada Lovelace Institute shows that nearly 9 in 10 people in the UK support
                  independent regulation of AI.{" "}
                  <a
                    href="https://www.adalovelaceinstitute.org/press-release/nearly-9-in-10-people-in-the-uk-support-independent-regulation-of-ai/"
                    target="_blank"
                    rel="noreferrer"
                  >
                    adalovelaceinstitute.org
                  </a>
                </li>
                <li id="fn13">
                  <a
                    href="https://publications.parliament.uk/pa/cm5901/cmselect/cmfaff/703/report.html"
                    target="_blank"
                    rel="noreferrer"
                  >
                    House of Commons Foreign Affairs Committee report
                  </a>
                </li>
                <li id="fn14">
                  <a
                    href="https://www.computerweekly.com/news/366640469/AI-makes-debut-in-Bridewell-cyber-security-in-CNI-report"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Computer Weekly
                  </a>
                </li>
                <li id="fn15">
                  <a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC11116769/" target="_blank" rel="noreferrer">
                    PubMed Central
                  </a>
                </li>
                <li id="fn16">
                  <a href="https://time.com/6258483/uncontrollable-ai-agi-risks/" target="_blank" rel="noreferrer">
                    TIME Magazine
                  </a>
                </li>
                <li id="fn17">
                  &ldquo;There is a 10% to 20% chance that AI will lead to human extinction within the next three
                  decades&rdquo; &mdash; Geoffrey Hinton (Nobel Prize winner and &lsquo;Godfather of AI&rsquo;)
                </li>
                <li id="fn18">
                  &ldquo;There&rsquo;s a 25% chance that things go really, really badly.&rdquo; (Dario Amodei, CEO of
                  Anthropic); &ldquo;AI will most likely lead to the end of the world&hellip;&rdquo; (Sam Altman, CEO
                  of OpenAI); &ldquo;I mean with artificial intelligence we&rsquo;re summoning the demon.&rdquo;
                  (Elon Musk, CEO of xAI)
                </li>
              </ol>
            </section>

          </div>
        </article>
      </main>

      <Script src="/evidence-ai-workforce.js" strategy="afterInteractive" />
    </>
  );
}
