export interface Choice {
  text: string;
  next: string;
}

export interface StoryNode {
  text: string;
  choices: Choice[];
  isEnding?: boolean;
}

export interface Story {
  [key: string]: StoryNode;
}
