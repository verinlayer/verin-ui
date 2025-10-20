import { ComponentType } from "react";

export enum StepKind {
  welcome,
  showBalance,
  confirmClaim,
  success,
}

export type StepMeta = {
  path: string;
  kind: StepKind;
  title: string;
  description: string;
  headerIcon?: string;
  index: number;
  backUrl?: string;
};

export const stepsMeta: Record<StepKind, StepMeta> = {
  [StepKind.welcome]: {
    path: "",
    kind: StepKind.welcome,
    title: "Turn Your Blockchain History into Value powered by Zero Knowledge Proof",
    description: "Prove that you interact with DeFi applications across multiple chains.",
    // headerIcon: "/img/teleport-icon.svg",
    index: 0,
  },
  [StepKind.showBalance]: {
    path: "show-balance",
    kind: StepKind.showBalance,
    title: "Your History",
    description: "",
    // headerIcon: "/img/teleport-icon.svg",
    index: 1,
  },
  [StepKind.confirmClaim]: {
    path: "confirm-claim",
    kind: StepKind.confirmClaim,
    title: "Claim Proof Confirmation",
    description: "",
    // headerIcon: "/img/teleport-icon.svg",
    index: 2,
  },
  [StepKind.success]: {
    path: "success",
    kind: StepKind.success,
    title: "Success",
    description: "",
    headerIcon: "/img/tx-confirm.svg",
    index: 3,
  },
};

export type StepComponentMap = Record<StepKind, ComponentType>;

export type Step = StepMeta & {
  component: ComponentType;
};
