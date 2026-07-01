export const codeEditorTheme = {
  color: {
    border: "#2563eb",
    caret: "black",
    text: "black",
    transparentText: "transparent",
  },
  className: {
    highlighter:
      "pointer-events-none absolute inset-0 m-0 overflow-hidden bg-white break-words whitespace-pre-wrap text-black",
    textarea:
      "pointer-events-auto absolute inset-0 resize bg-transparent outline-none",
    wrapper: "pointer-events-auto absolute overflow-visible bg-white",
  },
  syntax: {
    code: "text-slate-700",
    link: "text-blue-700",
    marker: "text-slate-400",
  },
} as const
