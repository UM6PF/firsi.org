import fs from "node:fs";
import { pageUrl } from "../../eleventy.config.js";

// Correspondance anciennes adresses du prototype -> nouvelles adresses.
const ids = JSON.parse(fs.readFileSync(new URL("./anciennes_pages.json", import.meta.url), "utf8"));

export default ids.flatMap(id => [
  ...(id === "index" ? [] : [{ from: `/${id}.html`, to: pageUrl(id, "fr"), lang: "fr" }]),
  { from: `/${id}-en.html`, to: pageUrl(id, "en"), lang: "en" },
]);
