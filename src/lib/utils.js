import { clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge"
import { TYPE_ROLES } from "../styles/typeRoles.js";

// The type roles (`text-body`, `text-label`, …) are font sizes. Without this, tailwind-merge
// reads them as text colours and drops one when a colour class follows.
const twMerge = extendTailwindMerge({
  extend: { classGroups: { "font-size": [{ text: TYPE_ROLES }] } },
});

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
