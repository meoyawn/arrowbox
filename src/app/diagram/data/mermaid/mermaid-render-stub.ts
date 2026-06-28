const renderError = () => new Error("Mermaid rendering is not bundled")

export function getRegisteredLayoutAlgorithm(): never {
  throw renderError()
}

export function render(): Promise<never> {
  return Promise.reject(renderError())
}
