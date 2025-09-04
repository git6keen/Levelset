import React from "react";
import { createRoot } from "react-dom/client";

function Box({title, body}:{title:string; body:string}) {
  return React.createElement("div", {style:{fontFamily:"system-ui",margin:"40px auto",maxWidth:"600px",padding:"20px",border:"1px solid #e5e7eb",borderRadius:"12px"}},
    React.createElement("h1", {style:{marginTop:0,fontSize:"20px"}}, title),
    React.createElement("pre", {style:{whiteSpace:"pre-wrap"}}, body)
  );
}

const body = [
  "If you can read this, Vite is serving and React rendered.",
  "Next step: fix your main entry (index.html / main.tsx).",
  "",
  "Try: http://127.0.0.1:5173/debug.html to see raw API text.",
  "Then normalize index.html to have ONE <script type=module src=\"/main.tsx\">."
].join("\n");

createRoot(document.getElementById("root")!).render(
  React.createElement(Box, {title:"UI Safe Boot OK", body})
);
