// Everything mini Zikra says. Edit freely.

export const INTRO_LINES = [
  "Hi there!",
  "I'm Zikra. Well, the mini version.",
  "I build software, design things, and keep them secure.",
  "Have a look around! I'll tag along down here.",
];

export const WELCOME_BACK = "Welcome back!";

export const CLICK_LINES = [
  "Hehe, hi!",
  "That tickles!",
  "Thanks for stopping by!",
  "Psst, check out my projects.",
  "Running security checks… all clear!",
  "Designing, coding, snacking.",
];

export const DIZZY_LINE = "Whoa… so dizzy!";

/** Reactions when hovering elements tagged with data-mascot="<kind>" (and optional data-mascot-name). */
export function hoverLines(kind: string, name?: string): string[] {
  switch (kind) {
    case "project":
      return name
        ? [`Ooh, ${name}!`, `${name} was a fun one.`, "Click it, I dare you!", "I'm proud of this one."]
        : ["Ooh, this one!"];
    case "skill":
      return name
        ? [`${name}? Always leveling up!`, "My toolbox, neatly sorted.", "Learning more every week!"]
        : ["Learning more every week!"];
    case "softskill":
      return name
        ? [`${name}! Working on it every day.`, `${name} is my secret weapon.`, "The human side of tech!"]
        : ["The human side of tech!"];
    case "activity":
      return name ? [`${name}! Such good memories.`, "Ooh, this was so fun!", "Busy bee, that's me."] : ["Ooh, this was so fun!"];
    case "tab":
      return ["So many projects…", "Switching disciplines!"];
    case "contact":
      return ["Say hi! I reply fast.", "Let's build something together!"];
    case "cv":
      return ["My whole story on one page!", "Hot off the press!", "Take it, it's free!"];
    case "cta":
      return ["Yes! That way!", "Go go go!"];
    case "about":
      return ["That's me! The big version."];
    default:
      return [];
  }
}

export function pick<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}

export const PICKUP_LINES = ["Whoa! Put me down!", "Hey! Where are we going?", "Wheee!", "I can walk, you know!"];

export const ANGRY_LINES = [
  "Hey! Rude!!",
  "Ouch! Gently next time!",
  "Hmph! I'm telling everyone.",
  "My hijab is all messed up now!",
];

export const SOFT_LANDING = "Wheee! Again?";
