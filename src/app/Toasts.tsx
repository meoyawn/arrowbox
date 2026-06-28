import { Toast } from "@kobalte/core"
import { Show, type Component, type ParentComponent } from "solid-js"
import { Portal } from "solid-js/web"
import { CloseIcon } from "./components.tsx"

/** Arrowbox toast */
export const AbToast: ParentComponent<{
  toastId: number
  title?: string
}> = props => (
  <Toast.Root
    toastId={props.toastId}
    class="flex flex-col items-center justify-between gap-2 rounded-md border border-gray-200 bg-white p-3 shadow-sm"
  >
    <div class="flex w-full items-start">
      <div>
        <Show when={props.title}>
          {x => (
            <Toast.Title class="text-lg font-medium text-gray-900">
              {x()}
            </Toast.Title>
          )}
        </Show>

        <Toast.Description class="prose prose-sm prose-blue">
          {props.children}
        </Toast.Description>
      </div>

      <Toast.CloseButton class="ml-auto h-4 w-4 shrink-0 text-gray-600">
        <CloseIcon />
      </Toast.CloseButton>
    </div>

    <Toast.ProgressTrack class="h-2 w-full rounded-full bg-gray-300">
      <Toast.ProgressFill class="transition-width h-full w-[var(--kb-toast-progress-fill-width)] rounded-full bg-blue-500 duration-250 ease-linear" />
    </Toast.ProgressTrack>
  </Toast.Root>
)

export const ToastPortal: Component = () => (
  <Portal>
    <Toast.Region>
      <Toast.List class="absolute right-0 bottom-0 z-50 m-0 flex w-100 max-w-full list-none flex-col gap-2 p-4 outline-hidden" />
    </Toast.Region>
  </Portal>
)
