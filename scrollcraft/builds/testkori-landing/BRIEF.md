# TestKori landing page: brief

**Self-authored under explicit creative delegation.** The owner said "use your judgement" (2026-10-26) and gave this direction in their words:

> "basically this will be an exam platform where students will give short tests made by the teacher users, it will be time bounded system, no one cant switch or use clipboad during the exam time"

> "create a scroll effect animated landing page, talking about the product, making it look like why this product is good to try, hook people to use it, i will later add subscription packages"

> "there will be another redirect link where users can add their email when the product launches they will get email, basically waitlist" · "the video will be a yt link, but keep the placeholder option there"

Evidence vs. assumption: everything quoted above is the owner's. Everything below marked *authored* is my decision under delegation.

## The eight topics

1. **Vibe** *(authored)*: calm, exact, a little playful, trustworthy. References: a printed exam paper and its OMR answer sheet; the quiet of an exam hall a minute before "you may begin"; a referee's notebook.
2. **Journey** *(authored, from the owner's direction)*: the visitor opens an exam paper → recognizes how they run tests today → sees what goes wrong when nobody watches → **tries to cheat and gets caught by the page itself** → sees that every student gets a different paper → sees marking done for them → chooses how to time it → the product video → plans coming → final question: their email.
3. **Energy curve** *(authored)*: quiet open, slight unease, a held silence, a sharp peak, then steady confidence, calm close.
4. **Feeling + the one moment**: see curve and peak below.
5. **What no other site does** *(authored)*: the landing page proctors you. It really records when you leave the tab and when you try to copy, for your whole visit, like the product does.
6. **Distance from premium-minimal** *(authored)*: editorial and dense-with-data, paper and print, one green marker accent, a red pen for violations. Not dark-luxury.
7. **One world or scenes** *(authored)*: one surface. The page is a single exam paper the visitor works through.
8. **Assets**: none supplied, no generation key. The product UI itself is the imagery (real markup, real logic, labelled as a demo). No photos, no illustrations.

## Grammar

**Live surface** (uniqueness.md §2.3). The honest pitch is "watch what it does", and the page can actually do it: tab-switch detection, copy blocking, seeded shuffling and auto-grading all run in the page on labelled sample data.
- Filmic one-shot lost: the product is a tool, not a mood. Chaptered editorial lost: nobody wants to *read* about proctoring, they want to feel it. Continuous world lost: no geography. Typographic poster lost: the asset is a behavior, not a sentence. Gallery lost: no range of objects. Split stage was close (watched vs. unwatched exam) but the comparison is one beat, not the whole page. Rhythmic cutlist lost: wrong energy for a trust product.
- Bans respected: no marketing bar, no kinetic headlines, no scrub, no spotlight, drift at most two stops, no 6rem display headings, copy in the surface's idiom (question stems, labels, status lines, a log).

## Chrome, hero, close

- **Nav = the exam paper's header strip:** mark, "Demo paper", a question map (one bubble per section, clickable, fills as you pass it), a live "Left this page" counter, and a timer.
- **Hero = the surface already in a state:** the paper is open on Question 1, an answerable multiple-choice question about how the visitor runs exams today.
- **Close = an actual input:** the last question is the waitlist email field.

## Signature move

**The page proctors the visitor.** A real `visibilitychange`/`blur` and `copy`/`contextmenu` listener runs for the whole visit. Leaving the tab hides the paper behind the same overlay students see, stamps the time, and on return reports how long you were gone; copying shows the same "blocked and flagged" note. The header counter and a small log keep the record. Nothing is sent anywhere.

**Tell-someone sentence:** "It's the site where I switched tabs and, when I came back, the page had hidden the questions and told me exactly how long I'd been gone."

## Feeling curve (written before the acts)

```
1  Curiosity     an exam paper that is clearly a web page, asking me a real question I can answer
2  Unease        a quiet list of what goes wrong in an unwatched online test, in a teacher's red pen
3  Anticipation  almost nothing: one line inviting me to try to cheat (authored silence)
4  Surprise      PEAK: I leave the tab, come back, and the paper is hidden and my absence is logged
5  Confidence    two students' papers side by side, the same questions shuffling into different orders
6  Relief        a marking register filling itself in, scores done, the written answers queued
7  Control       one switch that changes how the exam is timed: whole paper or per question
8  Interest      the product video (placeholder until it exists)
9  Resolve       the final question is my email; the page goes still
```

No two adjacent acts share a feeling. Act 3 is quieter than act 4 on purpose.

## The peak

"I switched tabs and when I came back the page had hidden the questions and logged exactly how long I'd been gone." Lives in act 4, which gets the largest span on the page and the only ground change (the paper dims to the exam-hall dark of the lockdown overlay). For visitors who don't leave the tab (or on touch devices), a plainly labelled "Simulate leaving" button runs the same path.

## Authored silence

Act 3 is deliberately near-empty (one line of copy on paper). It is not dead scroll.

## Score

| Beat | Device | Why this one |
|---|---|---|
| 1 Curiosity | flow (greet) + pointer (answer bubbles) | the surface must already be usable on first paint |
| 2 Unease | flow + `in` stagger, red-pen annotations | a list is information; no pin needed |
| 3 Anticipation | flow, one line | silence before the drop |
| 4 Surprise (peak) | pin (span 2.6) + real event listeners + `--sc-p` timer | the frame holds so the visitor can act inside it |
| 5 Confidence | reveal (two sheets wipe in) + FLIP shuffle on entry | a change of state: one paper becomes many |
| 6 Relief | pin (span 1.6) + rows populating from `--sc-p` | the surface holds while state advances |
| 7 Control | pointer: a real switch driving a demo timeline | the visitor operates it |
| 8 Interest | flow: 16:9 video slot | content, not experience |
| 9 Resolve | flow close: real input | the grammar's required ending |

Device families: flow/in, pointer, pin, reveal, CSS `--sc-p`. Never the same family twice in a row on the pinned/unpinned axis. Two pins, not adjacent. Total length about 10 viewport-heights.

## Honesty rules for this page

- No invented numbers, logos, testimonials or customer names. Sample people and exams are labelled sample.
- Copy says "recorded", "hidden", "flagged", "submitted automatically". It never says cheating is impossible.
- Pricing: "Plans are announced at launch." No figures.
