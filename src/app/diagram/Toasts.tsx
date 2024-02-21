import { Toast } from "@kobalte/core"
import { Show, type Component } from "solid-js"
import { Portal } from "solid-js/web"

/** Arrowbox toast */
export const AbToast: Component<{
  toastId: number
  msg: string
  title?: string
}> = props => (
  <Toast.Root
    toastId={props.toastId}
    class="flex flex-col items-center justify-between gap-2 rounded-md border border-gray-200 bg-white p-3 shadow"
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

        <Toast.Description class="text-sm text-gray-700">
          {props.msg}
        </Toast.Description>
      </div>

      <Toast.CloseButton class="ml-auto h-4 w-4 flex-shrink-0 text-gray-600">
        ╳
      </Toast.CloseButton>
    </div>

    <Toast.ProgressTrack class="h-2 w-full rounded-full bg-gray-300">
      <Toast.ProgressFill class="transition-width duration-250 h-full w-[var(--kb-toast-progress-fill-width)] rounded-full bg-blue-500 ease-linear" />
    </Toast.ProgressTrack>
  </Toast.Root>
)

export const ToastPortal: Component = () => (
  <Portal>
    <Toast.Region>
      <Toast.List class="w-100 absolute bottom-0 right-0 z-50 m-0 flex max-w-full list-none flex-col gap-2 p-4 outline-none" />
    </Toast.Region>
  </Portal>
)
