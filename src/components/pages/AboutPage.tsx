import React from "react";
import { PageHeader, PageBody } from "../ui/PageShell";
import { AboutView } from "../renderers/AboutView";

interface Props {
  playSound?: (t: "click" | "hover") => void;
}

export const AboutPage: React.FC<Props> = () => (
  <div className="flex flex-1 flex-col">
    <PageHeader
      number="07"
      title="About"
      blurb="Everything you need to know about Binary Beats."
    />
    <PageBody>
      <AboutView />
    </PageBody>
  </div>
);
