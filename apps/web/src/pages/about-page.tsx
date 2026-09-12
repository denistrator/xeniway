import { AboutCapabilities } from "./about-capabilities";
import { AboutHero } from "./about-hero";
import { AboutSecurity } from "./about-security";
import { AboutStack } from "./about-stack";

export function AboutPage() {
  return (
    <div className="px-6 text-ink">
      <div className="mx-auto flex max-w-6xl flex-col gap-10">
        <AboutHero />
        <AboutCapabilities />
        <AboutStack />
        <AboutSecurity />
      </div>
    </div>
  );
}
