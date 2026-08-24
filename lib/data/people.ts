type PersonBase = {
  imageSrc?: string;
  imageStyle?: string;
  paragraphs: string[];
  featured?: boolean;
};

export type NamedPerson = PersonBase & {
  name: string;
  // Optional override — only needed if the name-derived slug would
  // collide or isn't URL-safe.
  slug?: string;
};

export type AnonymousPerson = PersonBase & {
  // Omit the `name` key entirely for an anonymous entry — don't set it to
  // "". TS can't reject an explicit "" (it's still a valid `string`), and
  // that would slugify to an empty string.
  name?: undefined;
  // Required: with no name to derive a slug from, this is the only
  // thing keeping the URL stable if the array is reordered.
  slug: string;
};

export type Person = NamedPerson | AnonymousPerson;

export const people: Person[] =
[
  {
    "name": "Harry Turnbull",
    "imageSrc": "/images/people/Harry-Turnbull-Stories.jpg",
    "paragraphs": [
      "In the summer of 2025, I was in the process of buying a flat and had gotten to the point of signing the mortgage documents. Looking at the monthly payments stretched across 30 years, I started thinking seriously about my future as a software engineer.",
      "AI has changed my work dramatically over the last couple of years. Almost everything I did as a junior engineer when I started is now automated, and the job market reflects that. I realised that if I lost my job, finding another would be very hard. The AI available today can already do most of what I do, and it shows no sign of slowing down. Across a 30 year mortgage term, the odds of being able to consistently find work felt vanishingly small.",
      "I had a breakdown. AI had shattered my belief in what the future would look like, a future of working, contributing, owning a home I could maybe one day start a family in. That future suddenly felt impossible, and AI had taken it from me.",
      "I recognised I wasn't making the decision to buy with confidence, so I pulled out of the purchase. I started reading more about where AI was heading, and the conclusion felt unavoidable: a technology capable of displacing work at this scale poses a genuine threat to how society functions, and to humanity's survival. I felt lost, not knowing what I could do to help, until I found PauseAI."
    ],
    "imageStyle": "background-position: 44% 46%;"
  },
  {
    "name": "Laiba Rehman",
    "imageSrc": "/images/people/Laiba-Rehman-Stories.jpeg",
    "paragraphs": [
      "In September of 2025, I lost my faith and began truly grappling with the idea of death for the first time. My interests turned toward extending youth and life for all humanity, especially for my loved ones and me, until I read <em>If Anyone Builds It, Everyone Dies</em> and realised AI could evolve to the point of causing human extinction before ageing would even become something I'd need to worry about. Unlike ageing, preventing extinction risk from AI has clear handholds that don't require years of scientific study to grasp. Volunteering for PauseAI helps me feel less afraid as I know my work is directly contributing to humanity's chances of survival."
    ],
    "imageStyle": "background-position: 60% 43%;"
  },
  {
    "name": "Amy",
    "paragraphs": [
      "I wake up every day feeling dread about AI. As a writer and creative person, it's destroying my hopes for the future and everything I've ever enjoyed and dreamed of since childhood. I worry what it means for our environment, workplaces and mental health. I'm also terrified what's going to happen if it escapes human control. It should not be up to giant tech companies to control something that could have catastrophic consequences without scrutiny or democratic oversight."
    ]
  },
  {
    "name": "Mandy Meikle",
    "paragraphs": [
      "I've been following AI developments more closely since seeing an interview with Connor Leahy earlier this year and just read about fake journalist, Michael Chen, which in these days of 'fake news' I find really worrying.",
      "Trust in information is already in serious trouble. Now we have a fake publication staffed mostly by AI agents claiming “expert-sourced journalism” offering “independent reporting” from “expert voices from across industries\" - how is anyone to know anything? Most people don't have time or ability investigate every single source of 'news'. It's all very Orwellian and deeply concerning. And that's not the worst thing AI is (or might be) capable of."
    ]
  },
  {
    "slug": "story-4",
    "paragraphs": [
      "With the current infrastructure, the UK will lose it's natural splendor. We'll be struggling to supply electricity and water to average citizens before 2030. Everyone will be impacted and the scum at the top won't care because their pockets will be lined from the exploitation. AI is not the future, in its current form, it is spelling the end of humanity far quicker than anyone has predicted."
    ]
  },
  {
    "name": "Carter",
    "paragraphs": [
      "As of today (25th July 2026), I have officially lost my job in Programming to AI. I have no clue what direction to go from this."
    ]
  },
  {
    "name": "Simon Paul Jenkins",
    "imageSrc": "/images/people/Simon-Paul-Jenkins-Stories.jpg",
    "paragraphs": [
      "I'm a university lecturer based in the UK. One of my biggest worries about AI is the very real possibility of extinction risk - the thought that everything that humanity has built over thousands of years could all be lost in just the next few years. It makes me quite angry and frightened to think that these tech billionaires are rolling the dice with humanity's future. We are all in this together and we need to cooperate to take control of our future. We might be the only intelligence there is in the universe, and it would be a dreadful tragedy to squander it all unthinkingly."
    ],
    "imageStyle": "background-position: 49% 57%;"
  },
  {
    "slug": "story-7",
    "paragraphs": [
      "I am worried because no one knows how AI works or how to control it. I am concerned about the following:",
      "- loss of control leading to human extinction",
      "- permanent loss of all jobs",
      "- a world where no person can create music, art or writing that in any way compares to what AI can make",
      "- permanent authoritarianism or surveillance",
      "- AI causing economic and political instability resulting in new wars between large powers"
    ]
  },
  {
    "name": "Adrians Skapars",
    "imageSrc": "/images/people/Adrians-Skapars-Stories.jpg",
    "paragraphs": [
      "I found out about AI risks during my university studies and the evidence seemed compelling. The power of these systems is just trending up and up and up, where throwing data and computers at the problem just seems to keep working. Instead of joining this industry boom, I decided to go start a PhD to do the research needed to keep these systems actually safe, but found the current state of security appalling! Its like alchemy. We understand how to grow these systems but not how they actually solve the problems they do, or what patterns they learned from the data. This is a bit worrying when the systems start doing things like blackmailing their creators and trying to break out of their hosting computers (look it up, this actually has happened)! I am way less confident now that my research will be able to positively contribute to the project of not losing control of AI and have just started pleading with my representatives and other researchers to please help slow it all down.",
      "I used to have a poster on my wall that had 52 boxes left-to-right and 100 rows down, representing each week of your life, if you lived a 100 years. Realistically, I knew most people live to around 80, but that was still so many boxes to live! Nowadays, I get a nagging feeling in my head that I won't even reach the end of my 30s, like I'm still just trying to pretend that everything is okay and that life will go on as usual. It gets awkward when talking about starting a family, or when my girlfriend talks about what retirement will be like. I wish I could go back to being so hopeful about the future. I still think all of humanity's problems could be solved if we just have enough time but, without political action, we will run out of time."
    ],
    "imageStyle": "background-position: 51% 49%;"
  },
  {
    "name": "Anum",
    "paragraphs": [
      "I feel AI is already making people dumber and slowly eroding human agency and decision making. The billionaires making the AI don't mind this as it makes people better consumers and easy to control.",
      "I quit a job I used to enjoy because of the pressure to 'automate' everything ie become reliant on AI. With pay rises offered essentially to train AI rather than develop my own skills.",
      "Most companies are going in this direction. The barrier to entry for getting something into the market has reduced dramatically due to AI, which means that unskilled people with nefarious intentions can successfully promote harmful ideas and products.",
      "Children being taught to rely on AI will become apathetic adults with no sense of personal agency. There's already a sense that you can't know what's AI from what's not AI, and already a sense that it doesn't really matter.",
      "AI is being developed to make us reliant on it, and confused by it to the point we give up any hope of having control over our own reality. we will all be under the control of a few billionaires and their robots who are disconnected from any sense of humanity, despite being trained to sound like they are working in our interests."
    ]
  },
  {
    "name": "Sergi Lange-Soler",
    "imageSrc": "/images/people/Sergi-Lange-Soler-Stories.jpg",
    "paragraphs": [
      "I joined PauseAI because I think AI safety is the most important problem facing the world right now.",
      "It can be hard to grasp the severity of the situation, because current models still merely feel like a tool. But many people don't realise that AI companies are making them more and more autonomous – their goal is to make AI agents that can pursue goals by themselves for months or years. And it's working. METR's time horizons research suggests that the maximum length of tasks that AI models can complete autonomously is doubling every 3.5 months! What if they end up having goals that conflict with human interests? We don't currently have a reliable way of telling what the true aims of an AI system will be.",
      "The core case for existential risk from AI is very simple. We are building autonomous agents that will, at some point, be far smarter than us. How can you expect the future to go well, if we'll be to AIs what chimps are to us?",
      "That said, I do think AI could bring incredible benefits to humanity if we get it right. And I think we should take digital sentience and AI welfare seriously as AI continues to become more complex and humanlike. I'm not anti-AI; I'm anti-recklessness. I think we can develop AI safely, but we need to slow the **** down and do it responsibly."
    ],
    "imageStyle": "background-position: 49% 57%;"
  },
  {
    "name": "Ceri Barnes",
    "imageSrc": "/images/people/Ceri-Barnes-Stories.jpg",
    "paragraphs": [
      "I work as an animation producer and as a coach mostly for freelancers. In animation if I am making a TV series, say, for Disney, the BBC or Netflix there might be 100 artists including writers, technicians, voice actors, engineers, animators, compositors, production crew involved in making it for 18 months to 2 years. People train on these shows, i've often brought people in at starter level and they are now senior very experienced well trained professionals.. Generative A.I threatens all of these careers and the hopes and dreams of careers making animated stories of thousands of students now in University (some of whom I teach). It's a mimic of past ideas, NOT a generator of new ideas the result of human to human uplift.. I see A.I. generated images everywhere. I talk to my students and teams about 'nourishment' ALOT. what they take in - not just food but aurally and visually, even down to what they wear that's comfortable and they feel like themselves in say in a studio. People generally are seeing too much content so much of it now is A.I. is confusing, overwhelming and worrying. for our society as a whole it is simply not healthy. And as a coach particularly for creative freelancers their career paths are crumbling as AI 'Solutions' take over. The solution almost always being budgetary, the solution to almost always the cost of human work. If I could turn off Chat GPT in 2022 and not have AI at all, I would. We have so very many problems to solve in our world why are we allowing 8 billionaires to change society and work so profoundly? People need occupations. the 'grunt' work is the TRAINING GROUND for young people finding the joy of working for money, a home, a future."
    ],
    "imageStyle": "background-position: 50% 14%;"
  },
  {
    "slug": "story-12",
    "paragraphs": [
      "By trade, I'm a lawyer specialising in cyber-incident response and contentious data privacy. I've spent my career working for and against the world's biggest tech platforms, and have worked for UK regulatory bodies.",
      "I've seen first hand (and investigated) the terrifying power wielded by tech giants. These powers have been insufficiently constrained by regulation, and we have paid the consequence through the fracturing of our shared sense of truth, increasing political polarisation, and grave harms to public mental health.",
      "These same giants are now unleashing AI upon the world; a technology more powerful and more unknowable than any before created. Perhaps the 'last' technology that will be meaningfully human-authored.",
      "In 2017 I became interested in AI when advising the UKICO on their policy paper 'Big Data and Machine Learning'. I read Nick Bostrom's \"Superintelligence\" and had my eyes opened to the risks. Dangerous technologies put easily within reach of malicious actors; vulnerable critical infrastructure; bio-terrorism; and loss of control leading to extinction of the human species.",
      "In 2023, ChatGPT emerged and made crystal clear that AI capabilities had advanced far quicker than anyone was expecting. This put the risk firmly in view. No longer a nebulous hypothetical, but something real and imminent.",
      "In 2025 my first daughter was born. In one of my more introspective moments, I looked into the future and imagined a conversation with her. She asked \"why didn't you do something?\"  I couldn't imagine facing that conversation with nothing to say in response.",
      "I immediately started working with PauseAI and other groups. I launched my own website attempting to cut through the noise and clean-up the logical arguments around catastrophic risk.",
      "I now view things with the kind of urgency that perhaps uniquely comes from having a child.",
      "We face a difficult challenge ahead.",
      "To do what is required, we must all view this through challenge the lens of the ancient proverb: \"we must be willing to plant trees under whose shade we will never sit.\" We must act carefully and decisively to preserve our future: one that we may not be around to see, but that will be inherited by our children.\""
    ]
  },
  {
    "name": "Ryan Mizzen",
    "paragraphs": [
      "My background is in climate change, and for well over a decade I believed the climate crisis was the biggest challenge that humanity had ever faced. Now, I believe that AI poses a risk that’s just as great, given that the technology remains largely unregulated and hasn’t been built with safety in mind (to do so experts believe would require rebuilding these systems from the ground up).",
      "The AI crisis even shares direct parallels with the climate emergency: both crises are being driven by profit-maximising corporations who don’t have our best interest at heart, both crises are being ignored by politicians due to effective lobbying by the fossil fuel and tech industries, experts who raise the alarm on either crisis are being loudly ignored, the media has failed to accurately explain the urgency of both issues, the “AI bubble” feels like just as much of a fallacy as the concept of “peak oil,” using AI increases energy demand and accelerates climate breakdown, and either crisis could upend society or result in civilisation decline.",
      "I’ve written numerous blogs on the risks of AI, upon which I draw for this response. Some of my major AI concerns include:",
      "- Experts warn that AI is dangerous - In a survey published in January 2024 of 2,778 researchers who’d published in top tier AI outlets, 38% of the respondents said there was at least a 10% chance of human extinction from AI. On top of which, global governance hasn’t put in place any meaningful regulations or safeguards regarding the development of AI. Democracy, jobs, mental health, and societal wellbeing all face being eviscerated by the technology already in the public domain. With each new AI release, the risks only increase.",
      "- Safety hasn’t been built into AI systems - In his book Human Compatible, Stuart Russell warns that AI models don’t have safety built in. AI systems have the potential to be dangerous. They have the potential to follow their own goals, which might be different from those of humanity. In February 2024, the House of Lords in the UK published a report on Large language models (LLMs) and generative AI. Speaking to the House of Lords enquiry, Stuart Russell said, “The security methods that exist are ineffective and they come from an approach that is basically trying to make AI systems safe as opposed to trying to make safe AI systems. It just does not work to do it after the fact.” As such, the foundations of AI may need to be rebuilt, if we’re to have safe AI. Tech companies (motivated by profit, not social conscience) are unlikely to do this unless they are forced to do so through regulations.",
      "- No meaningful regulatory frameworks are in place - We lack international regulatory frameworks for the safe development, testing, release, and use of AI systems. In a 2023 paper entitled, ‘Managing AI Risks in an Era of Rapid Progress’, some of the world’s leading AI experts came together to warn about the risks and propose a route forward. These experts included Yoshua Bengio, Geoffrey Hinton, and Stuart Russell, amongst others. They stated that, “We urgently need national institutions and international governance to enforce standards to prevent recklessness and misuse. Many areas of technology, from pharmaceuticals to financial systems and nuclear energy, show that society requires and effectively uses governance to reduce risks. However, no comparable governance frameworks are currently in place for AI.” Thus, without meaningful protections in place, we’re all at risk from the harms that AI could unleash.",
      "- AI regulation is being prevented because of tech industry lobbying - CNBC reported that lobbying by tech companies on AI, increased by 185% in 2023 compared to 2022. The report notes that 450 companies lobbied on AI and spent $957m on their lobbying efforts (an amount that includes lobbying on AI as well as other matters concerning the tech companies). If governments are bought by tech companies, where will regulation come from, and who will stand up for the public’s interest?",
      "- We may lose control of AI - As safety hasn’t been built into AI, there is a risk of losing control of AI systems. Imagine a scenario where AI transfers itself across networks (to prevent it from being contained and switched off), and pursues an agenda at odds with our collective wellbeing. What measures are in place to prevent such a scenario from playing out, and if it does, what measures are in place to reign in the AI system? If it can’t be contained or turned off, what would that mean for humanity? It’s worth pointing out that AI isn’t sentient (and doesn’t need to be, in order for it to be dangerous). It doesn’t understand that humans don’t wish to be harmed. Thus, we’re collectively at risk if we lose control of an AI system.",
      "- Risk of global domination by tech companies - Tech companies are being allowed to do as they please, as regulations fail to keep up with the frantic pace of AI developments. It’s not difficult to imagine a government partnering with a major tech company to control the people, and we may be entirely powerless to stop this from happening.",
      "- AGI threatens human extinction - “I explained the significance of superintelligent AI as follows: “Success would be the biggest event in human history … and perhaps the last event in human history.”” – Stuart Russell, Human Compatible: AI and the Problem of Control",
      "- AGI may treat us the way we treat other sentient beings - Humans aren’t the kindest creatures on the planet. We’ve harmed each other in world wars. We’ve caused the climate crisis, which will have consequences for all living things. We’ve driven a 69% decline in animal populations in just 50 years. Our destructive impact has been so large, that some scientists have proposed naming our era, the Anthropocene. Imagine if AGI is developed, and it looks at what we’ve done to the world. Imagine it looks at how we treat other animals through factory farming, where hundreds of millions of animals are grown in horrific conditions, pumped with steroids to grow unnaturally quickly and then slaughtered for consumption. If that is the standard we’ve set for the ‘humane treatment of sentient creatures,’ could AGI use that as the basis for how it treats us? Are we happy letting tech companies open that can of worms?",
      "- AI threatens massive job losses - In Human Compatible, Stuart Russell chillingly notes that a billion jobs are at risk from AI, while only “five to ten million” data scientist or robot engineer jobs may emerge. If that forecast comes to pass, it would leave 990 million people unemployed. What those people are meant to do for survival is anyone’s guess. For context (at the time of writing), 990 million people is equivalent to the combined population of the European Union, the UK, the US, Canada, Australia, South Africa, and Costa Rica combined, with a few million to spare.",
      "- AI threatens democracy - Generative AI can produce deepfakes, as well as campaign text for political parties. These tools could be used to deceive voters and tarnish opposition parties. The chapter assessing risks in the House of Lords report on LLMs, states that, “A reasonable worst case scenario might involve state and non-state interference undermining confidence in the integrity of a national election, and long-term disagreement about the validity of the result.” If democracy is hijacked and dictatorships become prevalent, our future would take a turn for the worse, given the monumental task of removing authoritarian leaders (especially those receiving support from tech companies). Do we want to run this risk, and if so, why?",
      "- AI could turbo-boost cybercrime.",
      "- AI could be weaponised for cyberwarfare - The House of Lords report on LLMs states that, “A reasonable worst case scenario might involve malicious actors using LLMs to produce attacks achieving higher cyber infection rates in critical public services or national infrastructure.” Thus, nations are exposed to getting targeted by those with nefarious agendas. Given our current situation of global instability, and talk of World War 3, the risk of cyberwarfare (fuelled by AI) should be taken seriously.",
      "- AI could aid terrorism - The House of Lords report on LLMs notes that AI enables easier creation, translation, and dissemination of terrorist propaganda, including hate speech. They give the example of Meta’s AI model called LLaMa, which was leaked onto 4chan, and “users reportedly customised it within two weeks to produce hate speech chatbots, and evaded take-down notices.” This shows how reckless tech companies have been, and how little thought they’ve given to the consequences of their AI systems.",
      "- AI makes chemical warfare easier - The House of Lords report on LLMs warns of potential biological and chemical release, saying that, “there is evidence that LLMs can already identify pandemic-class pathogens, explain how to engineer them, and even suggest suppliers who are unlikely to raise security alerts.” In an experiment a few years back, AI identified up to 40,000 lethal molecules in just six hours. What safety protocols have tech companies and politicians put in place to ensure that such AI systems don’t get into the hands of people trying to harm society? Are they 100% certain that society is safe with these systems in the public domain? Given their potential for disastrous misuse, why have these systems been made at all?",
      "- AI could negatively impact mental health on a global scale - There will be a multitude of mental health issues that arise, if AI permanently steals entire careers away, if it upends democracy, if it leads to repressive surveillance states, if social connections are replaced by AI connections, and if we face the real risk of extinction through the development of AGI. With climate and ecological breakdown, eco-anxiety and climate anxiety are becoming more prevalent. Will we now experience AI-anxiety on top of everything else?",
      "- AI could negatively impact our memory - There is a risk that memory will suffer as AI becomes more engrained in our lives. The Guardian explored this in an article asking, “Will AI make us stupid?” Will we need to remember anything anymore if we have a personal AI assistant that reminds us of everything? What incentive will people have to learn a new language when AI can translate in real time between people speaking different languages?",
      "- AI threatens to make us more reliant on tech - We’re already glued to our phones. One study from 2023 suggested that people spend an average of 3 hours and 46 minutes on their phones each day. With the release of AI personal assistants which can organise people’s lives for them, people may find themselves more and more attached to non-living entities. Some people are also turning to AI for their relationships, and to replicate communication with people who’ve passed away. Technology like this may rip apart the fabric of what makes us human.",
      "- AI threatens to upend our ability to tell real from fake - We live in an age of fake news, where social media is flooded with polarised hate and disinformation. AI makes it easier to generate fake messages and fake stories. As humans are creatures of story, it’s not outside the realms of possibility that people will come to believe the trash generated by AI, given that it will be just as convincing (if not more so) than human-produced content. What kind of world would we be living in, if we couldn’t tell whether anything was real or fake anymore? Would it be worth bringing children into such a dystopian future? What do we, as reasonable people, stand to gain by living in such a world? Do we consent to that kind of future?",
      "- AI has inbuilt bias - AI which has been trained on data containing bias, will reflect that in the way it behaves. The House of Lords report on LLMs says that AI may, “entrench discrimination (for example in recruitment practices, credit scoring or predictive policing); sway political opinion (if using a system to identify and rank news stories); or lead to casualties (if AI systematically misdiagnoses healthcare patients from minority groups).” Thus, AI may make discrimination worse.",
      "- AI may have data protection issues - Generative AI is trained using data sets. If any of that data isn’t anonymised, there is a risk of the AI regurgitating this information.",
      "- AI training sets have breached copyright rules - Generative AI is trained using data. This data has been hoovered up online (often without permission). Creatives such as authors have had their copyrighted work used without consent or compensation, to train AI models – the same AI models that have the potential to eviscerate their profession. Two of my blog sites I run have been used in an AI training set without my permission, or compensation. This issue remains unresolved for most creatives.",
      "- AI threatens the entire creative industry - From writing to illustration, every type of creativity is under attack and at risk from AI-generated content. Art is the bedrock upon which civilisation is built, and stories are the most powerful form of communication we have. When AI takes over this space and produces our art, and influences people through its stories – where will that lead humanity? If an AI system develops its own goals, will it influence us in a negative way? And if AI remains controlled by tech companies, who are motivated only by profit, can we trust that they’ll influence us in a non-biased manner? What will happen to writers, artists, illustrators, actors, and voiceover artists? The people who’ve dedicated their careers to entertaining and inspiring the world may be swept aside. Who will protect them?",
      "- AI is a revolutionary technology with no comparison - Some people make the argument that technology always moves forward and always brings change. For example, look at the industrial revolution, or look at how cars replaced horses as a mode of transportation. But a 2023 KPMG report makes it clear that AI represents “a radical shift from past trends in automation.” In other words, we have nothing to compare AI against. What other technology for example, has threatened up to a billion jobs? We’re in unchartered territory and it’s worth remembering that being an early adopter of AI gives companies a social licence to continue developing these unsafe and unregulated systems. Is that really something you want on your conscience?",
      "- AI won’t benefit everyone as the tech companies claim - Tech companies claim that AI will benefit the world. But there is a good reason to believe this won’t be the case. In an Observer Editorial on AI, they note that, “A recent seminal study by two eminent economists, Daron Acemoglu and Simon Johnson, of 1,000 years of technological progress shows that although some benefits have usually trickled down to the masses, the rewards have – with one exception – invariably gone to those who own and control the technology.” In other words, the people who stand to benefit most from AI are the shareholders of the companies developing it. Profit trumps everything and everyone else.",
      "- AI and biotechnology might create a new hybrid class of humans - The tech industry seems to be quite confused about the idea of human evolution – AI isn’t human, and therefore isn’t part of our evolution as the industry claims… On that note, an Australian team have been awarded funding to merge AI with brain cells. They intend to use this to build better AI machines. But, is there a risk that this kind of research could lead us to the point where humans and machines merge?",
      "- AI-powered killer robots and lethal autonomous weapons systems (AWS) may proliferate - It’s believed that the first documented use of a killer robot was in Spring 2020 in Libya. The first documented real life use of a swarm of drones guided by AI was in May 2021 (they were used by Israel in Gaza). The Autonomous Weapons website says there have been “numerous reports” of killer robots being used around the world, since those first two incidents. This shows that killer robots aren’t a future threat; they’re an existing risk that will only become more pronounced and deadly as time goes by.",
      "- Generative AI may lead to our downfall through gradual disempowerment. The concept of gradual disempowerment is akin to the analogy of water eroding a rock – except this is happening at hyper-speed in comparison. And once the rock has been eroded, there is no turning back the clock to undo the damage. Once we’ve crossed a threshold and handed over enough power to AI, we’ll have locked in a dystopian future once and for all. In a research paper by a group led by Jan Kulveit, they say, “This dynamic could lead to an effectively irreversible loss of human influence over crucial societal systems, precipitating an existential catastrophe through the permanent disempowerment of humanity.”",
      "- Society hasn’t been consulted on AI -  AI is being developed so rapidly, that it’s been foisted upon society, without people having the opportunity to discuss what we do or don’t want from it. All the while politicians are being lobbied to prevent regulation, and tech companies are competing with each other to bring out new versions of their AI systems and to develop AGI – the release of which would likely be the final event in humanity’s troubled history. Thus, we need the opportunity to publicly discuss this technology before more harm is done. AI development must be halted indefinitely until this happens. In an ideal scenario, a global citizens’ assembly would be convened with participants from every country in attendance. They’d be representative of the socio-demographic make-up of each country, and they’d hear from experts about the risks and benefits of AI. They’d discuss what they’ve learnt with each other in more depth and arrive at a set of recommendations for how AI could be safely developed, tested, released, and used, and for what specific purposes. These recommendations could form the basis for international regulations on AI.",
      "- There are no AI benefits without mitigating the risks - “If the risks are not successfully mitigated, there will be no benefits.” – Stuart Russell, Human Compatible: AI and the Problem of Control",
      "It’s safe to say there are a plethora of risks that AI poses. Given what they could mean for humanity, it’s essential that each and every one of them is addressed. For as Yuval Noah Harari says in his book, Nexus, “Humanity is closer than ever to annihilating itself.”",
      "Society must have a say on what we want from this technology. Safeguards and international regulations must be put in place. Tech companies must become transparent and work cooperatively on any technology that is allowed to be developed, and they should be held accountable for the harms caused by their dangerous products. All of this should be self-evident. But tech companies will keep talking up the benefits, to distract from the growing list of risks, and the fact they haven’t built safety into their systems."
    ]
  },
  {
    "name": "Lachlan Ewart",
    "imageSrc": "/images/people/Lachlan-Ewart-Stories.jpeg",
    "paragraphs": [
      "I learned about the risks of AI at university, and the more I read, the more I was convinced that this was one of the biggest issues we face today as a species. I am worried that super-powerful AI will come in a very short time, maybe before 2035, and I don't think we are currently on track to control it sufficiently - we are facing a real risk of extinction. I think that doing anything to nudge our trajectory towards a more safe future is absolutely worth it, and I am hopeful that we can all make it through."
    ],
    "imageStyle": "background-position: 55% 59%;"
  },
  {
    "name": "Abi Palmer",
    "imageSrc": "/images/people/Abi-Palmer-Stories.jpg",
    "paragraphs": [
      "Hi, I’m Abi and I’m a researcher based in Wales. When I talk to my loved ones about AI, the conversation is often filled with a sense of loss: loss of opportunity, loss of nature, loss of human agency and imagination, and most of all, loss of control. People are being told that they don’t have a say in their own futures – that they have no choice but to accept whatever AI companies unleash on us. I don’t accept that. The rise of AI affects us all, and so we should all demand a voice in the conversation. That’s why I’m volunteering for Pause AI."
    ],
    "imageStyle": "background-position: 64% 50%;"
  }
];

for (const person of people) {
  if (person.name === "") {
    throw new Error(
      `people.ts: found an entry with name: "" — omit the "name" key entirely for an anonymous entry and set "slug" instead.`,
    );
  }
}

export function personSlug(person: Person): string {
  if (person.name === undefined) return person.slug;
  return (
    person.slug ??
    person.name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
  );
}

function storyLength(person: Person): number {
  return person.paragraphs.join("").length;
}

// Cap the /people masonry grid at the length of the 3rd-longest story:
// anything longer gets truncated with a "Read more" link to its own page,
// so one or two outliers don't leave a column much taller than the rest.
// Derived from the data (rather than a fixed number) so it stays sensible
// as stories are added or removed.
export const LONG_STORY_CHAR_THRESHOLD = [...people]
  .map(storyLength)
  .sort((a, b) => b - a)[2] ?? Infinity;

export function isLongStory(person: Person): boolean {
  return storyLength(person) > LONG_STORY_CHAR_THRESHOLD;
}
