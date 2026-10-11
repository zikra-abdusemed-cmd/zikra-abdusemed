import About from "@/components/About";
import Activities from "@/components/Activities";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";
import Hero from "@/components/Hero";
import Marquee from "@/components/Marquee";
import Mascot from "@/components/mascot/Mascot";
import Nav from "@/components/Nav";
import Projects from "@/components/Projects";
import Skills from "@/components/Skills";
import SoftSkills from "@/components/SoftSkills";
import { findCv } from "@/lib/cv";
import { getContent } from "@/lib/store";

// Always read the latest store so admin edits appear on the next request.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [{ projects, skillCategories, softSkills, activities }, cv] = await Promise.all([getContent(), findCv()]);
  const hasCv = cv !== null;

  return (
    <>
      <Nav />
      <main>
        <Hero hasCv={hasCv} />
        <Marquee items={["Software", "Design", "Security", "IT", "Build", "Break", "Fix"]} />
        <About />
        <Skills categories={skillCategories} />
        <SoftSkills skills={softSkills} />
        <Projects projects={projects} />
        <Activities activities={activities} />
        <Contact hasCv={hasCv} />
      </main>
      <Footer />
      <Mascot />
    </>
  );
}
