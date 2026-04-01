#!/usr/bin/env node

import { main } from "./http-main.js";

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
