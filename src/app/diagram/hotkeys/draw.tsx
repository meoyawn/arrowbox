import { For, Show, createMemo, type Component } from "solid-js"
import { OS, getOS } from "../../../lib/os.ts"
import { Shortcuts, type Shortcut } from "./hotkeys.tsx"

const OneShortcut: Component<{ keys: string }> = props => {
  const sep = () => (props.keys.includes("+") ? "+" : ",")
  const arr = createMemo(() => props.keys.split(sep()).map(x => x.trim()))

  return (
    <For each={arr()}>
      {(k, idx) => (
        <>
          <kbd class="direction-ltr font-inherit border-collapse whitespace-nowrap rounded-md border border-gray-400 bg-gray-100 bg-gradient-to-b from-gray-200 to-gray-100 p-1 text-sm leading-7 text-black shadow-sm">
            {k}
          </kbd>

          <Show when={idx() < arr().length - 1}>
            <span class="mx-1">{sep()}</span>
          </Show>
        </>
      )}
    </For>
  )
}

const getByOS = (s: Shortcut, os?: OS): string => {
  if ("hotkey" in s) return s.hotkey

  return os === OS.Mac ? s.macos : s.windows
}

const os = getOS()

export const ShortcutTable: Component = () => (
  <div class="grid grid-cols-2 gap-3">
    <For each={Object.values(Shortcuts)}>
      {s => (
        <>
          <div class="font-medium">{s.label}</div>
          <div>
            <OneShortcut keys={getByOS(s, os)} />
          </div>
        </>
      )}
    </For>
  </div>
)
