import React from "react";
import { PageHeader, PageBody } from "../ui/PageShell";
import { TeamView } from "../renderers/TeamView";

interface Props {
  playSound?: (t: "click" | "hover") => void;
}

export const TeamPage: React.FC<Props> = () => (
  <div className="flex flex-1 flex-col">
    <PageHeader
      number="06"
      title="The Team"
      blurb="Founders, moderators, leads and contributors behind Binary Beats."
    />
    <PageBody>
      <TeamView />
    </PageBody>
  </div>
);
